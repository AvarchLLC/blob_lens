use sqlx::{Pool, Postgres};
use std::time::Duration;
use reqwest::Client;
use std::env;

pub async fn run_eth_distribution_indexer(pool: Pool<Postgres>) {
    tracing::info!("📈 ETH distribution indexer started");

    // Seed initial categories if table is empty
    if let Err(e) = seed_eth_categories(&pool).await {
        tracing::error!("Error seeding ETH categories: {}", e);
    }

    loop {
        if let Err(e) = update_eth_distribution(&pool).await {
            tracing::error!("Error updating ETH distribution: {}", e);
        }
        tokio::time::sleep(Duration::from_secs(3600)).await; // Update every hour
    }
}

async fn seed_eth_categories(pool: &Pool<Postgres>) -> eyre::Result<()> {
    let count: i64 = sqlx::query_scalar!("SELECT COUNT(*) FROM eth_liquidity_categories")
        .fetch_one(pool)
        .await?
        .unwrap_or(0);

    if count > 0 {
        return Ok(());
    }

    tracing::info!("Seeding ETH liquidity categories...");

    let categories = vec![
        ("staked", vec!["0x00000000219ab540356cBB839Cbe05303d7705Fa"], "ETH locked in Beacon Deposit Contract"),
        ("cex", vec!["0x28C6c06298d514Db089934071355E5743bf21d60", "0x71660c4fC1279ad4b6702756702e4C5867EF9Bf9"], "Binance and Coinbase main hot wallets"),
        ("enterprise", vec!["0xBE8E3e3618f7474F8cB1d074A26afFef007E98FB"], "MakerDAO Treasury"),
        ("bridges", vec!["0xaf5191b0de278c7286d6c7cc6ab6bb8a73ba2cd6", "0x5c7960771305c4839e09e076720cc171639d6b70"], "Stargate and Across bridge contracts"),
    ];

    for (cat, addresses, desc) in categories {
        sqlx::query!(
            "INSERT INTO eth_liquidity_categories (category, address_list, description) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING",
            cat, &addresses, desc
        )
        .execute(pool)
        .await?;
    }

    Ok(())
}

async fn update_eth_distribution(pool: &Pool<Postgres>) -> eyre::Result<()> {
    let categories = sqlx::query!("SELECT category, address_list FROM eth_liquidity_categories")
        .fetch_all(pool)
        .await?;

    let rpc_url = env::var("RPC_URL").expect("RPC_URL must be set");
    let client = Client::new();

    // Fetch ETH price from CoinGecko for USD conversion
    let eth_price_resp = client.get("https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd")
        .send().await?;
    let eth_price_data: serde_json::Value = eth_price_resp.json().await?;
    let eth_price_usd = eth_price_data["ethereum"]["usd"].as_f64().unwrap_or(0.0);

    for cat in categories {
        let mut total_balance_wei = 0u128;
        
        for address in &cat.address_list {
            let payload = serde_json::json!({
                "jsonrpc": "2.0",
                "method": "eth_getBalance",
                "params": [address, "latest"],
                "id": 1
            });

            let resp = client.post(&rpc_url).json(&payload).send().await?;
            let data: serde_json::Value = resp.json().await?;
            
            if let Some(hex_balance) = data["result"].as_str() {
                if let Ok(balance) = u128::from_str_radix(hex_balance.trim_start_matches("0x"), 16) {
                    total_balance_wei += balance;
                }
            }
        }

        let balance_eth = total_balance_wei as f64 / 1e18;
        let balance_usd = balance_eth * eth_price_usd;

        sqlx::query!(
            "INSERT INTO eth_liquidity_snapshot (category, balance_eth, balance_usd, num_addresses)
             VALUES ($1, $2, $3, $4)",
            cat.category,
            balance_eth,
            balance_usd,
            cat.address_list.len() as i32
        )
        .execute(pool)
        .await?;
    }

    Ok(())
}
