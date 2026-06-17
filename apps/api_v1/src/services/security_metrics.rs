use sqlx::{Pool, Postgres};
use std::time::Duration;
use reqwest::Client;
use std::env;

pub async fn run_security_metrics_indexer(pool: Pool<Postgres>) {
    tracing::info!("🛡️ Security Metrics indexer started");

    loop {
        if let Err(e) = update_security_metrics(&pool).await {
            tracing::error!("Error updating security metrics: {}", e);
        }
        // Daily refresh
        tokio::time::sleep(Duration::from_secs(86400)).await;
    }
}

async fn update_security_metrics(pool: &Pool<Postgres>) -> eyre::Result<()> {
    let client = Client::new();
    
    // 1. L1 (Ethereum) metrics from Beacon API
    let beacon_url = env::var("BEACON_RPC_URL").unwrap_or_else(|_| "https://ethereum-mainnet-beacon.publicnode.com".to_string());
    
    let validator_count = match client.get(format!("{}/eth/v1/beacon/states/head/validators", beacon_url)).send().await {
        Ok(resp) => {
            let data: serde_json::Value = resp.json().await?;
            data["data"].as_array().map(|v| v.len()).unwrap_or(1_000_000) as i32
        },
        Err(_) => 1_000_000 // Fallback
    };

    // Upsert L1
    sqlx::query(
        "INSERT INTO chain_security_metrics (chain_name, validator_count, staking_ratio, avg_stake_eth, sequencer_count) 
         VALUES ('Ethereum', $1, 28.5, 32.0, NULL) 
         ON CONFLICT (chain_name) DO UPDATE SET 
            validator_count = EXCLUDED.validator_count,
            timestamp = NOW()"
    )
    .bind(validator_count)
    .execute(pool)
    .await?;

    // 2. L2 hardcoded metrics (for comparison)
    let l2s = vec![
        ("Arbitrum", 1, 0.0, 0.0, 1),
        ("Optimism", 1, 0.0, 0.0, 1),
        ("Base", 1, 0.0, 0.0, 1),
        ("Linea", 1, 0.0, 0.0, 1),
    ];

    for (name, val_count, ratio, avg_stake, seq_count) in l2s {
        sqlx::query(
            "INSERT INTO chain_security_metrics (chain_name, validator_count, staking_ratio, avg_stake_eth, sequencer_count) 
             VALUES ($1, $2, $3, $4, $5) 
             ON CONFLICT (chain_name) DO UPDATE SET 
                validator_count = EXCLUDED.validator_count,
                sequencer_count = EXCLUDED.sequencer_count,
                timestamp = NOW()"
        )
        .bind(name)
        .bind(val_count)
        .bind(ratio)
        .bind(avg_stake)
        .bind(seq_count)
        .execute(pool)
        .await?;
    }

    Ok(())
}
