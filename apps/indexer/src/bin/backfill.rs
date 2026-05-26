/// Backfill binary — walks Dencun activation → current head using Reth's
/// JSON-RPC and writes blob transactions to ClickHouse.
///
/// Progress is persisted in `blob_lens.sync_progress` so the process can be
/// interrupted and resumed safely.  Re-running from scratch is also safe
/// because ReplacingMergeTree deduplicates on (block_number, tx_hash).
///
/// Usage:
///   RETH_RPC=http://ba-data:8545 \
///   CLICKHOUSE_URL=http://ba-data:8123 \
///   cargo run --bin backfill
///
/// Environment variables:
///   RETH_RPC              JSON-RPC endpoint  (default: http://localhost:8545)
///   CLICKHOUSE_URL        ClickHouse HTTP     (default: http://localhost:8123)
///   CLICKHOUSE_DB         database name       (default: blob_lens)
///   CLICKHOUSE_USER       optional
///   CLICKHOUSE_PASSWORD   optional
///   START_BLOCK           override start block (default: 19_426_587 = Dencun)
///   BATCH_SIZE            blocks per RPC batch (default: 100)
use std::collections::HashMap;

use blob_indexer::{
    clickhouse_client::{
        get_sync_progress, init_schema, insert_blob_txs, insert_block_stats,
        set_sync_progress, BlobTxRow, BlockStatRow,
    },
    rollup::{build_registry, resolve},
};
use serde::Deserialize;
use serde_json::{json, Value};
use tracing_subscriber::EnvFilter;

/// EIP-4844 activation on mainnet
const DENCUN_BLOCK: u64 = 19_426_587;

// ---------------------------------------------------------------------------
// JSON-RPC response shapes
// ---------------------------------------------------------------------------

#[derive(Debug, Deserialize)]
struct RpcBlock {
    number: String,
    hash: String,
    timestamp: String,
    #[serde(rename = "excessBlobGas")]
    excess_blob_gas: Option<String>,
    #[serde(rename = "blobGasUsed")]
    blob_gas_used: Option<String>,
    transactions: Vec<RpcTx>,
}

#[derive(Debug, Deserialize)]
struct RpcTx {
    hash: String,
    from: String,
    to: Option<String>,
    #[serde(rename = "transactionIndex")]
    transaction_index: String,
    #[serde(rename = "type")]
    tx_type: String,
    #[serde(rename = "maxFeePerBlobGas")]
    max_fee_per_blob_gas: Option<String>,
    #[serde(rename = "blobVersionedHashes")]
    blob_versioned_hashes: Option<Vec<String>>,
}

// ---------------------------------------------------------------------------

fn fake_exponential(factor: u128, numerator: u128, denominator: u128) -> u128 {
    let mut output = 0u128;
    let mut acc = factor.saturating_mul(denominator);
    let mut i = 1u128;
    while acc > 0 {
        output = output.saturating_add(acc);
        acc = acc.saturating_mul(numerator) / denominator.saturating_mul(i);
        i += 1;
    }
    output / denominator
}

fn calc_blob_base_fee(excess: u64) -> u128 {
    fake_exponential(1, excess as u128, 3_338_477)
}

fn hex_to_u64(s: &str) -> u64 {
    u64::from_str_radix(s.trim_start_matches("0x"), 16).unwrap_or(0)
}

fn hex_to_u128(s: &str) -> u128 {
    u128::from_str_radix(s.trim_start_matches("0x"), 16).unwrap_or(0)
}

// ---------------------------------------------------------------------------

async fn fetch_block(client: &reqwest::Client, rpc: &str, block_num: u64) -> eyre::Result<Option<RpcBlock>> {
    let hex = format!("{:#x}", block_num);
    let body = json!({
        "jsonrpc": "2.0",
        "id": 1,
        "method": "eth_getBlockByNumber",
        "params": [hex, true]
    });

    let resp: Value = client.post(rpc).json(&body).send().await?.json().await?;

    if resp["result"].is_null() {
        return Ok(None);
    }

    let block: RpcBlock = serde_json::from_value(resp["result"].clone())?;
    Ok(Some(block))
}

async fn fetch_head(client: &reqwest::Client, rpc: &str) -> eyre::Result<u64> {
    let body = json!({
        "jsonrpc": "2.0", "id": 1,
        "method": "eth_blockNumber", "params": []
    });
    let resp: Value = client.post(rpc).json(&body).send().await?.json().await?;
    let hex = resp["result"].as_str().unwrap_or("0x0");
    Ok(hex_to_u64(hex))
}

// ---------------------------------------------------------------------------

#[tokio::main]
async fn main() -> eyre::Result<()> {
    tracing_subscriber::fmt()
        .with_env_filter(EnvFilter::from_default_env())
        .init();

    dotenvy::dotenv().ok();

    let rpc_url     = std::env::var("RETH_RPC").unwrap_or_else(|_| "http://localhost:8545".into());
    let ch_url      = std::env::var("CLICKHOUSE_URL").unwrap_or_else(|_| "http://localhost:8123".into());
    let ch_db       = std::env::var("CLICKHOUSE_DB").unwrap_or_else(|_| "blob_lens".into());
    let ch_user     = std::env::var("CLICKHOUSE_USER").ok();
    let ch_pass     = std::env::var("CLICKHOUSE_PASSWORD").ok();
    let batch_size  = std::env::var("BATCH_SIZE").ok()
        .and_then(|s| s.parse::<u64>().ok())
        .unwrap_or(100);
    let start_override = std::env::var("START_BLOCK").ok()
        .and_then(|s| s.parse::<u64>().ok());

    let mut ch_client = clickhouse::Client::default()
        .with_url(&ch_url)
        .with_database(&ch_db);
    if let Some(u) = &ch_user { ch_client = ch_client.with_user(u); }
    if let Some(p) = &ch_pass { ch_client = ch_client.with_password(p); }

    init_schema(&ch_client).await?;

    let registry: HashMap<String, &'static str> = build_registry();
    let http = reqwest::Client::new();

    let head = fetch_head(&http, &rpc_url).await?;
    tracing::info!(head, "current chain head");

    // Resume from last saved checkpoint, or from Dencun activation
    let resume_from = get_sync_progress(&ch_client, "backfill").await?;
    let start = start_override
        .unwrap_or_else(|| resume_from.map(|b| b + 1).unwrap_or(DENCUN_BLOCK));

    tracing::info!(start, head, "starting backfill");

    let mut current = start;
    while current <= head {
        let batch_end = (current + batch_size - 1).min(head);

        let mut blob_txs:    Vec<BlobTxRow>    = Vec::new();
        let mut block_stats: Vec<BlockStatRow> = Vec::new();

        for block_num in current..=batch_end {
            let Some(block) = fetch_block(&http, &rpc_url, block_num).await? else {
                tracing::warn!(block_num, "block not found, skipping");
                continue;
            };

            let excess = block.excess_blob_gas.as_deref().map(hex_to_u64).unwrap_or(0);
            let gas_used = block.blob_gas_used.as_deref().map(hex_to_u64).unwrap_or(0);
            let blob_base_fee = calc_blob_base_fee(excess);
            let blob_count = (gas_used / 131_072) as u16;
            let timestamp = hex_to_u64(&block.timestamp) as u32;
            let utilization = if gas_used == 0 { 0.0 } else { gas_used as f64 / 786_432.0 };

            // version: use block_number shifted left so backfill rows always
            // lose to live ExEx rows (which use nanos-since-epoch >> block_num).
            let version = block_num;

            block_stats.push(BlockStatRow {
                block_number: block_num,
                block_hash: block.hash.clone(),
                block_timestamp: timestamp,
                blob_base_fee,
                blob_gas_used: gas_used,
                excess_blob_gas: excess,
                blob_count,
                utilization,
                is_canonical: 1,
                version,
            });

            for tx in &block.transactions {
                if tx.tx_type != "0x3" {
                    continue;
                }
                let blob_hashes = tx.blob_versioned_hashes.clone().unwrap_or_default();
                let to_addr = tx.to.clone().unwrap_or_default();
                let rollup = resolve(&registry, &tx.from, &to_addr);
                let max_fee = tx.max_fee_per_blob_gas.as_deref().map(hex_to_u128).unwrap_or(0);
                let tx_idx = hex_to_u64(&tx.transaction_index) as u32;

                blob_txs.push(BlobTxRow {
                    block_number: block_num,
                    block_hash: block.hash.clone(),
                    block_timestamp: timestamp,
                    tx_hash: tx.hash.clone(),
                    tx_index: tx_idx,
                    from_address: tx.from.clone(),
                    to_address: to_addr,
                    rollup,
                    num_blobs: blob_hashes.len() as u8,
                    max_fee_per_blob_gas: max_fee,
                    blob_base_fee,
                    blob_hashes,
                    is_canonical: 1,
                    version,
                });
            }
        }

        insert_block_stats(&ch_client, &block_stats).await?;
        insert_blob_txs(&ch_client, &blob_txs).await?;
        set_sync_progress(&ch_client, "backfill", batch_end).await?;

        tracing::info!(
            blocks = block_stats.len(),
            blob_txs = blob_txs.len(),
            up_to = batch_end,
            pct = format!("{:.1}", (batch_end - start) as f64 / (head - start).max(1) as f64 * 100.0),
            "batch done"
        );

        current = batch_end + 1;
    }

    tracing::info!("backfill complete");
    Ok(())
}
