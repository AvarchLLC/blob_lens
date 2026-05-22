use sqlx::{Pool, Postgres};
use std::time::Duration;
use reqwest::Client;
use std::env;
use serde_json::json;

pub async fn run_whale_indexer(pool: Pool<Postgres>) {
    tracing::info!("🐳 Whale Watch indexer started");

    // Seed initial whales (known high-value wallets)
    if let Err(e) = seed_initial_whales(&pool).await {
        tracing::error!("Error seeding initial whales: {}", e);
    }

    loop {
        if let Err(e) = update_whale_balances(&pool).await {
            tracing::error!("Error updating whale balances: {}", e);
        }
        // Poll balances every 30 minutes
        tokio::time::sleep(Duration::from_secs(1800)).await;
    }
}

async fn seed_initial_whales(pool: &Pool<Postgres>) -> eyre::Result<()> {
    let count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM whale_wallets")
        .fetch_one(pool)
        .await?;

    if count > 0 {
        return Ok(());
    }

    tracing::info!("Seeding initial known whales...");

    let whales = vec![
        ("0x00000000219ab540356cBB839Cbe05303d7705Fa", "Beacon Deposit Contract", "contract"),
        ("0xBE8E3e3618f7474F8cB1d074A26afFef007E98FB", "MakerDAO: Pauser Proxy", "enterprise"),
        ("0xAb5801a7D1267bc3421CA00439781f84b4808118", "Vitalik Buterin", "founder"),
        ("0x28C6c06298d514Db089934071355E5743bf21d60", "Binance 14", "exchange"),
        ("0x71660c4fC1279ad4b6702756702e4C5867EF9Bf9", "Coinbase 10", "exchange"),
        ("0xF977814e90dA44bFA03b6295A0616a897441aceC", "Binance 8", "exchange"),
        ("0xda9dfA93AD576044458645480749a04884271118", "Kraken 4", "exchange"),
    ];

    for (address, label, category) in whales {
        sqlx::query(
            "INSERT INTO whale_wallets (address, label, category, is_verified) 
             VALUES ($1, $2, $3, TRUE) 
             ON CONFLICT (address) DO NOTHING"
        )
        .bind(address)
        .bind(label)
        .bind(category)
        .execute(pool)
        .await?;
    }

    Ok(())
}

async fn update_whale_balances(pool: &Pool<Postgres>) -> eyre::Result<()> {
    let whales: Vec<(String,)> = sqlx::query_as("SELECT address FROM whale_wallets")
        .fetch_all(pool)
        .await?;

    if whales.is_empty() {
        return Ok(());
    }

    let rpc_url = if let Ok(url) = env::var("RPC_URL") {
        url
    } else if let Ok(key) = env::var("ALCHEMY_KEY") {
        format!("https://eth-mainnet.g.alchemy.com/v2/{}", key)
    } else {
        tracing::error!("Neither RPC_URL nor ALCHEMY_KEY set in .env for whale tracking");
        return Ok(());
    };
    
    let client = Client::new();

    // Fetch ETH price from CoinGecko for USD conversion
    let eth_price_resp = client.get("https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd")
        .send().await?;
    let eth_price_data: serde_json::Value = eth_price_resp.json().await?;
    let eth_price_usd = eth_price_data["ethereum"]["usd"].as_f64().unwrap_or(0.0);

    for (address,) in whales {
        let payload = json!({
            "jsonrpc": "2.0",
            "method": "eth_getBalance",
            "params": [address, "latest"],
            "id": 1
        });

        let resp = client.post(&rpc_url).json(&payload).send().await?;
        let data: serde_json::Value = resp.json().await?;
        
        if let Some(hex_balance) = data["result"].as_str() {
            if let Ok(balance_wei) = u128::from_str_radix(hex_balance.trim_start_matches("0x"), 16) {
                let balance_eth = balance_wei as f64 / 1e18;
                let balance_usd = balance_eth * eth_price_usd;

                sqlx::query(
                    "UPDATE whale_wallets 
                     SET balance_eth = $1, balance_usd = $2, last_updated = NOW() 
                     WHERE address = $3"
                )
                .bind(balance_eth)
                .bind(balance_usd)
                .bind(&address)
                .execute(pool)
                .await?;

                // Record snapshot
                sqlx::query(
                    "INSERT INTO whale_wallet_snapshots (address, balance_eth, timestamp)
                     VALUES ($1, $2, NOW())"
                )
                .bind(&address)
                .bind(balance_eth)
                .execute(pool)
                .await?;
            }
        }
    }

    // Optional: Recalculate ranks if needed
    // This could be a separate background task or a more complex SQL query

    Ok(())
}
