use alloy::providers::{Provider, ProviderBuilder};
use alloy::rpc::client::WsConnect;
use alloy::rpc::types::BlockNumberOrTag;
use futures_util::StreamExt;
use dotenvy::dotenv;
use std::env;
use sqlx::Pool;
use sqlx::postgres::Postgres;
use crate::rollup_registry;
use eyre::Result;
use tracing::{info, error, warn};

const GAS_PER_BLOB: u64 = 131_072;
const MAX_BLOB_GAS_PER_BLOCK: f64 = 1_179_648.0; // 9 blobs × 131,072 (post-Pectra)

pub async fn fetch_blob(pool: &Pool<Postgres>) -> Result<()> {
    dotenv().ok();
    let alchemy_key = env::var("ALCHEMY_KEY")
        .map_err(|_| eyre::eyre!("ALCHEMY_KEY not set in .env"))?;
    let ws_url = format!("wss://eth-mainnet.g.alchemy.com/v2/{}", alchemy_key);

    info!("Connecting to Alchemy WebSocket: {}", ws_url);

    let ws = WsConnect::new(ws_url);
    let provider = ProviderBuilder::new()
        .on_ws(ws)
        .await?;

    info!("✓ Connected to Alchemy WebSocket. Listening for Type 3 (Blob) Transactions...");

    let mut sub = provider.subscribe_blocks().await?.into_stream();

    let mut rollup_registry = rollup_registry::get_rollup_registry();
    match rollup_registry::merge_db_rollup_registry(pool, &mut rollup_registry).await {
        Ok(()) => info!("Loaded {} rollup mappings", rollup_registry.len()),
        Err(e) => warn!("Failed to load DB rollup registry, using static map only: {}", e),
    }

    while let Some(block) = sub.next().await {
        let block_hash = block.header.hash;
        let block_number = block.header.number as i64;

        info!("📦 Processing Block #{} ({})", block_number, block_hash);

        match provider.get_block_by_hash(block_hash, alloy::rpc::types::BlockTransactionsKind::Full).await {
            Ok(Some(full_block)) => {
                // Fetch blob base fee from the node via eth_feeHistory.
                // Alloy 0.4 hardcodes the pre-Pectra BLOB_GASPRICE_UPDATE_FRACTION (3_338_477)
                // in header.blob_fee(), which produces astronomically wrong values post-Pectra.
                // The node computes the fee using the correct current constants.
                let blob_base_fee: i64 = match provider
                    .get_fee_history(1u64, BlockNumberOrTag::Number(block_number as u64), &[])
                    .await
                {
                    Ok(fh) => fh
                        .base_fee_per_blob_gas
                        .first()
                        .copied()
                        .unwrap_or(0)
                        .min(i64::MAX as u128) as i64,
                    Err(e) => {
                        warn!("get_fee_history failed for block {}: {}", block_number, e);
                        0
                    }
                };

                let blob_gas_used = full_block.header.blob_gas_used.unwrap_or(0) as i32;
                let blob_count    = blob_gas_used / GAS_PER_BLOB as i32;
                let utilization   = blob_gas_used as f64 / MAX_BLOB_GAS_PER_BLOCK;

                if let Err(e) = crate::db::insert_block_stats(
                    pool,
                    block_number,
                    blob_base_fee,
                    blob_gas_used,
                    blob_count,
                    utilization,
                ).await {
                    error!("Failed to insert block stats for #{}: {}", block_number, e);
                }

                let excess_blob_gas = full_block.header.excess_blob_gas.unwrap_or(0);
                let blob_fee_gwei = blob_base_fee as f64 / 1e9;
                info!(
                    "  📊 Block #{}: excess_blob_gas={} base_fee={:.6}gwei blobs={}/9 utilization={:.1}%",
                    block_number, excess_blob_gas, blob_fee_gwei, blob_count, utilization * 100.0
                );

                let mut blob_tx_count = 0;

                for tx in full_block.transactions.into_transactions() {
                    if tx.transaction_type == Some(3) {
                        blob_tx_count += 1;

                        let tx_hash          = tx.hash.to_string();
                        let from_address     = tx.from.to_string();
                        let to_address       = tx.to.map(|addr| addr.to_string());
                        let max_fee_per_blob_gas = tx.max_fee_per_blob_gas
                            .map(|val| val.to_string())
                            .unwrap_or_else(|| "0".to_string());

                        let blob_hashes = tx.blob_versioned_hashes
                            .clone()
                            .unwrap_or_default()
                            .into_iter()
                            .map(|h| h.to_string())
                            .collect::<Vec<_>>();

                        let num_blobs = blob_hashes.len() as i32;
                        let rollup    = rollup_registry::resolve_rollup(
                            &from_address, to_address.as_deref(), &rollup_registry
                        );

                        info!(
                            "  🔹 Blob Tx: {} | Rollup: {} | Blobs: {} | Base Fee: {:.6}gwei | Max Bid: {}",
                            &tx_hash[..10], rollup, num_blobs, blob_fee_gwei, max_fee_per_blob_gas
                        );

                        if let Err(e) = crate::db::insert_blob_transaction(
                            pool,
                            &tx_hash,
                            block_number,
                            &block_hash.to_string(),
                            &from_address,
                            to_address.as_deref(),
                            num_blobs,
                            &max_fee_per_blob_gas,
                            blob_base_fee,
                            blob_hashes.clone(),
                            &rollup,
                        ).await {
                            error!("Failed to insert blob transaction: {}", e);
                        }
                    }
                }

                if blob_tx_count > 0 {
                    info!("✓ Block #{} had {} blob txs", block_number, blob_tx_count);
                }
            }
            Ok(None) => {
                warn!("Block {} not found", block_hash);
            }
            Err(e) => {
                error!("Failed to fetch block {}: {}", block_hash, e);
            }
        }
    }

    Ok(())
}
