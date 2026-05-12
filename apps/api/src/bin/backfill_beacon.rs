/// Backfill beacon sidecar fullness metrics for existing blob_transactions rows.
///
/// Processes rows in batches of BATCH_SIZE, oldest first, skipping rows that
/// already have bytes_used populated. Respects a configurable concurrency limit
/// to avoid hammering the beacon API.
///
/// Usage:
///   cargo run --bin backfill_beacon
///   BATCH_SIZE=500 CONCURRENCY=4 cargo run --bin backfill_beacon
use blob_lens::services::beacon;
use dotenvy::dotenv;
use reqwest::Client;
use sqlx::postgres::PgPoolOptions;
use std::env;
use std::time::Duration;
use tracing::{error, info, warn};
use tracing_subscriber::EnvFilter;

const DEFAULT_BATCH_SIZE: i64 = 200;
const DEFAULT_CONCURRENCY: usize = 3;

#[derive(Debug, sqlx::FromRow)]
struct TxRow {
    tx_hash: String,
    block_number: i64,
    blob_hashes: Vec<String>,
}

#[tokio::main]
async fn main() -> eyre::Result<()> {
    dotenv().ok();
    tracing_subscriber::fmt()
        .with_env_filter(EnvFilter::from_default_env().add_directive("info".parse()?))
        .init();

    let database_url = env::var("DATABASE_URL")
        .map_err(|_| eyre::eyre!("DATABASE_URL not set"))?;
    let beacon_rpc_override = env::var("BEACON_RPC_URL").ok();

    let batch_size: i64 = env::var("BATCH_SIZE")
        .ok()
        .and_then(|v| v.parse().ok())
        .unwrap_or(DEFAULT_BATCH_SIZE);
    let concurrency: usize = env::var("CONCURRENCY")
        .ok()
        .and_then(|v| v.parse().ok())
        .unwrap_or(DEFAULT_CONCURRENCY);

    info!("Backfill started — batch_size={} concurrency={}", batch_size, concurrency);

    let pool = PgPoolOptions::new()
        .max_connections(5)
        .connect(&database_url)
        .await?;

    let http = Client::builder()
        .timeout(Duration::from_secs(15))
        .build()?;

    // Count rows needing backfill
    let (total,): (i64,) = sqlx::query_as(
        "SELECT COUNT(*) FROM blob_transactions WHERE bytes_used IS NULL"
    )
    .fetch_one(&pool)
    .await?;
    info!("{} rows need backfill", total);

    if total == 0 {
        info!("Nothing to backfill. Exiting.");
        return Ok(());
    }

    let mut offset: i64 = 0;
    let mut updated_total: u64 = 0;
    let mut skipped_total: u64 = 0;

    loop {
        let rows: Vec<TxRow> = sqlx::query_as(
            "SELECT tx_hash, block_number, blob_hashes
             FROM blob_transactions
             WHERE bytes_used IS NULL
             ORDER BY block_number ASC
             LIMIT $1 OFFSET $2",
        )
        .bind(batch_size)
        .bind(offset)
        .fetch_all(&pool)
        .await?;

        if rows.is_empty() {
            break;
        }

        // Group rows by block so we fetch each block's sidecars only once
        let mut by_block: std::collections::BTreeMap<i64, Vec<&TxRow>> = Default::default();
        for row in &rows {
            by_block.entry(row.block_number).or_default().push(row);
        }

        info!(
            "Processing batch: {} txs across {} blocks (offset {})",
            rows.len(), by_block.len(), offset
        );

        // Process blocks with bounded concurrency using a simple semaphore approach
        let block_nums: Vec<i64> = by_block.keys().copied().collect();

        // Split block_nums into chunks of `concurrency`
        for chunk in block_nums.chunks(concurrency) {
            let sidecar_results = futures_util::future::join_all(
                chunk.iter().map(|&block_number| {
                    let http_ref = &http;
                    let brpc = &beacon_rpc_override;
                    async move {
                        let map = beacon::fetch_slot_sidecars(http_ref, brpc, block_number as u64).await;
                        (block_number, map)
                    }
                })
            ).await;

            for (block_number, sidecar_map) in sidecar_results {
                let txs = match by_block.get(&block_number) {
                    Some(t) => t,
                    None => continue,
                };

                if sidecar_map.is_empty() {
                    warn!("No sidecars for block {} — skipping {} txs", block_number, txs.len());
                    skipped_total += txs.len() as u64;
                    continue;
                }

                for tx in txs {
                    match beacon::aggregate_tx_stats(&tx.blob_hashes, &sidecar_map) {
                        Some(stats) => {
                            if let Err(e) = sqlx::query(
                                "UPDATE blob_transactions
                                 SET bytes_used = $1, fullness_ratio = $2, is_ghost_blob = $3
                                 WHERE tx_hash = $4",
                            )
                            .bind(stats.bytes_used)
                            .bind(stats.fullness_ratio)
                            .bind(stats.is_ghost_blob)
                            .bind(&tx.tx_hash)
                            .execute(&pool)
                            .await
                            {
                                error!("DB update failed for {}: {}", tx.tx_hash, e);
                            } else {
                                updated_total += 1;
                            }
                        }
                        None => {
                            warn!("Hash mismatch for tx {} in block {} — no matching sidecars", &tx.tx_hash[..10], block_number);
                            skipped_total += 1;
                        }
                    }
                }
            }
        }

        offset += rows.len() as i64;

        info!(
            "Progress: {}/{} rows (updated={} skipped={})",
            offset.min(total), total, updated_total, skipped_total
        );

        if rows.len() < batch_size as usize {
            break;
        }
    }

    info!(
        "Backfill complete. updated={} skipped={} total_processed={}",
        updated_total, skipped_total, offset
    );

    // Print final health check numbers
    let result: (i64, i64, Option<f64>, i64) = sqlx::query_as(
        "SELECT
           COUNT(*),
           COUNT(CASE WHEN bytes_used IS NOT NULL THEN 1 END),
           AVG(fullness_ratio) * 100,
           SUM(CASE WHEN is_ghost_blob THEN 1 ELSE 0 END)
         FROM blob_transactions"
    )
    .fetch_one(&pool)
    .await?;

    info!("═══════════════════════════════════════");
    info!("  total_txs:        {}", result.0);
    info!("  with_beacon_data: {}", result.1);
    info!("  coverage_pct:     {:.1}%", result.1 as f64 / result.0 as f64 * 100.0);
    info!("  avg_fullness_pct: {}", result.2.map(|v| format!("{:.1}%", v)).unwrap_or("—".into()));
    info!("  ghost_blobs:      {}", result.3);
    info!("═══════════════════════════════════════");

    Ok(())
}
