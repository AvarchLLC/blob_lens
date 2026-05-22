use sqlx::{Pool, Postgres};
use std::time::Duration;
use reqwest::Client;
use std::env;
use serde_json::json;

pub async fn run_l1_cost_tracker(pool: Pool<Postgres>) {
    tracing::info!("💰 L1 Cost Tracker started");

    loop {
        if let Err(e) = track_l1_costs(&pool).await {
            tracing::error!("Error tracking L1 costs: {}", e);
        }
        // Poll every 60 seconds (roughly every 5 blocks)
        tokio::time::sleep(Duration::from_secs(60)).await;
    }
}

async fn track_l1_costs(pool: &Pool<Postgres>) -> eyre::Result<()> {
    let rpc_url = if let Ok(url) = env::var("RPC_URL") {
        url
    } else if let Ok(key) = env::var("ALCHEMY_KEY") {
        format!("https://eth-mainnet.g.alchemy.com/v2/{}", key)
    } else {
        tracing::error!("Neither RPC_URL nor ALCHEMY_KEY set in .env for L1 cost tracking");
        return Ok(());
    };

    let client = Client::new();

    // 1. Fetch current gas price
    let payload = json!({
        "jsonrpc": "2.0",
        "method": "eth_gasPrice",
        "params": [],
        "id": 1
    });

    let resp = client.post(&rpc_url).json(&payload).send().await?;
    let data: serde_json::Value = resp.json().await?;
    
    let hex_gas_price = data["result"].as_str().ok_or_else(|| eyre::eyre!("Failed to get gas price"))?;
    let gas_price_wei = u128::from_str_radix(hex_gas_price.trim_start_matches("0x"), 16)?;
    let gas_price_gwei = gas_price_wei as f64 / 1e9;

    // 2. Fetch ETH price for USD conversion
    let eth_price_resp = client.get("https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd")
        .send().await?;
    let eth_price_data: serde_json::Value = eth_price_resp.json().await?;
    let eth_price_usd = eth_price_data["ethereum"]["usd"].as_f64().unwrap_or(0.0);

    // 3. Fetch latest block number
    let block_payload = json!({
        "jsonrpc": "2.0",
        "method": "eth_blockNumber",
        "params": [],
        "id": 2
    });
    let block_resp = client.post(&rpc_url).json(&block_payload).send().await?;
    let block_data: serde_json::Value = block_resp.json().await?;
    let hex_block_num = block_data["result"].as_str().ok_or_else(|| eyre::eyre!("Failed to get block number"))?;
    let block_number = i64::from_str_radix(hex_block_num.trim_start_matches("0x"), 16)?;

    // Standard costs:
    // ETH transfer: 21,000 gas
    // Uniswap swap: ~100,000 gas
    let usd_per_tx = (21_000.0 * gas_price_wei as f64 / 1e18) * eth_price_usd;
    let usd_per_swap = (100_000.0 * gas_price_wei as f64 / 1e18) * eth_price_usd;

    sqlx::query(
        "INSERT INTO l1_transaction_costs (block_number, avg_gwei_per_gas, avg_usd_per_tx, avg_usd_per_swap) 
         VALUES ($1, $2, $3, $4) 
         ON CONFLICT (block_number) DO UPDATE SET 
            avg_gwei_per_gas = EXCLUDED.avg_gwei_per_gas,
            avg_usd_per_tx = EXCLUDED.avg_usd_per_tx,
            avg_usd_per_swap = EXCLUDED.avg_usd_per_swap"
    )
    .bind(block_number)
    .bind(gas_price_gwei)
    .bind(usd_per_tx)
    .bind(usd_per_swap)
    .execute(pool)
    .await?;

    Ok(())
}
