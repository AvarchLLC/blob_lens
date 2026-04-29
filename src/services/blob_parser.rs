
use alloy::providers::{Provider, ProviderBuilder};
use alloy::rpc::client::WsConnect;
use futures_util::StreamExt;
use dotenvy::dotenv;
use std::env;
use sqlx::Pool;
use sqlx::postgres::Postgres;
use crate::rollup_registry;
use eyre::Result;
use tracing::{info, error, warn};

pub async fn fetch_blob(pool: &Pool<Postgres>) -> Result<()> {
    // 1. Setup Alchemy WebSocket URL
    dotenv().ok();
    let alchemy_key = env::var("ALCHEMY_KEY")
        .map_err(|_| eyre::eyre!("ALCHEMY_KEY not set in .env"))?;
    let ws_url = format!("wss://eth-mainnet.g.alchemy.com/v2/{}", alchemy_key);

    info!("Connecting to Alchemy WebSocket: {}", ws_url);

    // 2. Initialize the WS Provider
    let ws = WsConnect::new(ws_url);
    let provider = ProviderBuilder::new()
        .on_ws(ws)
        .await?;

    info!("✓ Connected to Alchemy WebSocket. Listening for Type 3 (Blob) Transactions...");

    // 3. Subscribe to new blocks for full transaction data
    let mut sub = provider.subscribe_blocks().await?.into_stream();

    let rollup_registry = rollup_registry::get_rollup_registry();

    while let Some(block) = sub.next().await {
        let block_hash = block.header.hash;
        let block_number = block.header.number as i64;

        info!("📦 Processing Block #{} ({})", block_number, block_hash);

        // 4. Fetch full block details to see all transactions
        match provider.get_block_by_hash(block_hash, alloy::rpc::types::BlockTransactionsKind::Full).await {
            Ok(Some(full_block)) => {
                let mut blob_count = 0;

                for tx in full_block.transactions.into_transactions() {
                    // 5. Check for Transaction Type 0x03 (Blob transactions)
                    if tx.transaction_type == Some(3) {
                        blob_count += 1;

                        let tx_hash = tx.hash.to_string();
                        let from_address = tx.from.to_string();
                        let to_address = tx.to.map(|addr| addr.to_string());
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

                        // Resolve rollup from from/to addresses
                        let rollup = rollup_registry::resolve_rollup(&from_address, to_address.as_deref(), &rollup_registry);

                        info!(
                            "  🔹 Blob Tx: {} | Rollup: {} | Blobs: {} | Max Fee: {}",
                            &tx_hash[..10],
                            rollup,
                            num_blobs,
                            max_fee_per_blob_gas
                        );

                        // Store in PostgreSQL
                        if let Err(e) = crate::db::insert_blob_transaction(
                            pool,
                            &tx_hash,
                            block_number,
                            &block_hash.to_string(),
                            &from_address,
                            to_address.as_deref(),
                            num_blobs,
                            &max_fee_per_blob_gas,
                            blob_hashes.clone(),
                            &rollup,
                        ).await {
                            error!("Failed to insert blob transaction: {}", e);
                        }
                    }
                }

                if blob_count > 0 {
                    info!("✓ Block #{} contained {} blob transactions", block_number, blob_count);
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