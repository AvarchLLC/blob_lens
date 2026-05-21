use sqlx::{Pool, Postgres};
use serde::Deserialize;
use std::time::Duration;
use reqwest::Client;
use serde_json::json;
use uuid::Uuid;

#[derive(Debug, Deserialize)]
struct CoinGeckoPrice {
    usd: f64,
    usd_market_cap: f64,
    usd_24h_vol: f64,
}

#[derive(sqlx::FromRow)]
struct TokenRow {
    id: Uuid,
    coingecko_id: Option<String>,
}

pub async fn run_rwa_indexer(pool: Pool<Postgres>) {
    let client = Client::new();
    tracing::info!("💎 RWA indexer started");

    // Seed initial tokens if table is empty
    if let Err(e) = seed_rwa_tokens(&pool).await {
        tracing::error!("Error seeding RWA tokens: {}", e);
    }

    loop {
        if let Err(e) = update_rwa_prices(&pool, &client).await {
            tracing::error!("Error updating RWA prices: {}", e);
        }
        tokio::time::sleep(Duration::from_secs(60)).await;
    }
}

async fn seed_rwa_tokens(pool: &Pool<Postgres>) -> eyre::Result<()> {
    let count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM rwa_tokens")
        .fetch_one(pool)
        .await?;

    if count > 0 {
        return Ok(());
    }

    tracing::info!("Seeding initial RWA tokens...");

    let tokens = vec![
        ("USDT", "Tether", "tether", json!({"ethereum": "0xdAC17F958D2ee523a2206206994597C13D831ec7"}), 6),
        ("USDC", "USD Coin", "usd-coin", json!({"ethereum": "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48"}), 6),
        ("USDP", "Pax Dollar", "paxos-standard", json!({"ethereum": "0x8E870D67F660D95d5be530380D0eC0bd388289E1"}), 18),
        ("TUSD", "TrueUSD", "true-usd", json!({"ethereum": "0x0000000000085d4780B73119b644AE5ecd22b376"}), 18),
        ("BUIDL", "BlackRock USD Institutional Digital Liquidity", "blackrock-usd-institutional-digital-liquidity-fund", json!({"ethereum": "0x77128DE384ad233835FF6340c49bc301B60824b4"}), 6),
    ];

    for (symbol, name, cg_id, addresses, decimals) in tokens {
        sqlx::query(
            "INSERT INTO rwa_tokens (symbol, name, coingecko_id, contract_addresses, decimals) VALUES ($1, $2, $3, $4, $5) ON CONFLICT DO NOTHING"
        )
        .bind(symbol)
        .bind(name)
        .bind(cg_id)
        .bind(addresses)
        .bind(decimals as i32)
        .execute(pool)
        .await?;
    }

    Ok(())
}

async fn update_rwa_prices(pool: &Pool<Postgres>, client: &Client) -> eyre::Result<()> {
    let tokens = sqlx::query_as::<_, TokenRow>("SELECT id, coingecko_id FROM rwa_tokens WHERE coingecko_id IS NOT NULL")
        .fetch_all(pool)
        .await?;

    if tokens.is_empty() {
        return Ok(());
    }

    let ids: Vec<String> = tokens.iter().filter_map(|t| t.coingecko_id.clone()).collect();
    let ids_str = ids.join(",");

    let url = format!(
        "https://api.coingecko.com/api/v3/simple/price?ids={}&vs_currencies=usd&include_market_cap=true&include_24hr_vol=true",
        ids_str
    );

    let resp = client.get(&url).send().await?;
    if !resp.status().is_success() {
        tracing::warn!("CoinGecko API returned status {}", resp.status());
        return Ok(());
    }

    let prices: std::collections::HashMap<String, CoinGeckoPrice> = resp.json().await?;

    for token in tokens {
        if let Some(cg_id) = &token.coingecko_id {
            if let Some(price_data) = prices.get(cg_id) {
                sqlx::query(
                    "INSERT INTO rwa_token_prices (rwa_token_id, chain, price_usd, market_cap_usd, volume_24h_usd)
                     VALUES ($1, 'ethereum', $2, $3, $4)"
                )
                .bind(token.id)
                .bind(price_data.usd)
                .bind(price_data.usd_market_cap)
                .bind(price_data.usd_24h_vol)
                .execute(pool)
                .await?;

                sqlx::query(
                    "UPDATE rwa_tokens SET updated_at = NOW() WHERE id = $1"
                )
                .bind(token.id)
                .execute(pool)
                .await?;
            }
        }
    }

    Ok(())
}
