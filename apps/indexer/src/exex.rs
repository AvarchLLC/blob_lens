/// Reth ExEx — receives ChainCommitted / ChainReverted / ChainUpdated notifications
/// from the node's execution pipeline and writes blob data to ClickHouse.
///
/// Re-org handling strategy:
///   On ChainReverted / the `old` side of ChainUpdated, we insert rows with
///   `is_canonical = 0` and a fresh `version` timestamp.  On ChainCommitted /
///   the `new` side of ChainUpdated we insert with `is_canonical = 1` and an
///   even newer `version`.  ClickHouse's ReplacingMergeTree keeps the row with
///   the highest version per primary key, so after compaction (or a FINAL query)
///   only the winning chain survives.
use std::{
    collections::HashMap,
    time::{SystemTime, UNIX_EPOCH},
};

use clickhouse::Client;
use reth_exex::{ExExContext, ExExEvent, ExExNotification};
use reth_node_api::FullNodeComponents;
use reth_primitives::Transaction;

use blob_indexer::{
    clickhouse_client::{insert_blob_txs, insert_block_stats, BlobTxRow, BlockStatRow},
    rollup::{build_registry, resolve},
};

// EIP-4844 / Cancun: target 3 blobs, max 6 blobs (post-Pectra: target 6, max 9)
// utilization = blob_gas_used / MAX_BLOB_GAS_PER_BLOCK
// Cancun max: 6 * 131_072 = 786_432
// Pectra max: 9 * 131_072 = 1_179_648
// We compute dynamically from blob_gas_used and blob_count.

pub async fn run<Node: FullNodeComponents>(
    mut ctx: ExExContext<Node>,
    ch: Client,
) -> eyre::Result<()> {
    let registry: HashMap<String, &'static str> = build_registry();

    while let Some(notification) = ctx.notifications.recv().await {
        match &notification {
            ExExNotification::ChainCommitted { new } => {
                process_chain(new, &registry, &ch, true).await?;
            }
            ExExNotification::ChainReverted { old } => {
                process_chain(old, &registry, &ch, false).await?;
            }
            ExExNotification::ChainUpdated { old, new } => {
                // Reorg: mark old chain non-canonical first, then commit new chain.
                process_chain(old, &registry, &ch, false).await?;
                process_chain(new, &registry, &ch, true).await?;
            }
        }

        // Signal to the node that we have processed up to this height so
        // it can advance its WAL pruning cursor.
        if let Some(committed) = notification.committed_chain() {
            ctx.events
                .send(ExExEvent::FinishedHeight(committed.tip().num_hash()))?;
        }
    }

    Ok(())
}

// ---------------------------------------------------------------------------

fn now_ns() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .expect("system time before epoch")
        .as_nanos() as u64
}

/// Blob base fee from EIP-4844 spec: fake_exponential(1, excess_blob_gas, 3338477)
fn calc_blob_base_fee(excess_blob_gas: u64) -> u128 {
    fake_exponential(1u128, excess_blob_gas as u128, 3_338_477u128)
}

fn fake_exponential(factor: u128, numerator: u128, denominator: u128) -> u128 {
    let mut output = 0u128;
    let mut numerator_accum = factor.saturating_mul(denominator);
    let mut i = 1u128;
    while numerator_accum > 0 {
        output = output.saturating_add(numerator_accum);
        numerator_accum = numerator_accum
            .saturating_mul(numerator)
            / denominator.saturating_mul(i);
        i += 1;
    }
    output / denominator
}

// ---------------------------------------------------------------------------

async fn process_chain(
    chain: &reth_execution_types::Chain,
    registry: &HashMap<String, &'static str>,
    ch: &Client,
    is_canonical: bool,
) -> eyre::Result<()> {
    let version    = now_ns();
    let canonical  = is_canonical as u8;

    let mut blob_txs:    Vec<BlobTxRow>    = Vec::new();
    let mut block_stats: Vec<BlockStatRow> = Vec::new();

    for (block_num, sealed_block) in chain.blocks() {
        // --- block header EIP-4844 fields -----------------------------------
        let header          = sealed_block.block.header.header();
        let excess_blob_gas = header.excess_blob_gas.unwrap_or(0);
        let blob_gas_used   = header.blob_gas_used.unwrap_or(0) as u64;
        let blob_base_fee   = calc_blob_base_fee(excess_blob_gas);
        let block_hash      = sealed_block.block.header.hash();
        let block_timestamp = header.timestamp as u32;
        let blob_count      = (blob_gas_used / 131_072) as u16;

        // utilization against the post-Cancun max of 6 blobs
        let utilization = if blob_gas_used == 0 {
            0.0
        } else {
            blob_gas_used as f64 / 786_432.0
        };

        block_stats.push(BlockStatRow {
            block_number: *block_num,
            block_hash: format!("{:#x}", block_hash),
            block_timestamp,
            blob_base_fee,
            blob_gas_used,
            excess_blob_gas,
            blob_count,
            utilization,
            is_canonical: canonical,
            version,
        });

        // --- transactions ----------------------------------------------------
        let txs     = &sealed_block.block.body.transactions;
        let senders = &sealed_block.senders;

        for (tx_idx, (tx, sender)) in txs.iter().zip(senders.iter()).enumerate() {
            let Transaction::Eip4844(inner) = &tx.transaction else {
                continue;
            };

            let to_addr = inner.to.to_string();
            let from_addr = format!("{:#x}", sender);
            let rollup = resolve(registry, &from_addr, &to_addr);

            let blob_hashes: Vec<String> = inner
                .blob_versioned_hashes
                .iter()
                .map(|h| format!("{:#x}", h))
                .collect();

            blob_txs.push(BlobTxRow {
                block_number:         *block_num,
                block_hash:           format!("{:#x}", block_hash),
                block_timestamp,
                tx_hash:              format!("{:#x}", tx.hash()),
                tx_index:             tx_idx as u32,
                from_address:         from_addr,
                to_address:           to_addr,
                rollup,
                num_blobs:            inner.blob_versioned_hashes.len() as u8,
                max_fee_per_blob_gas: inner.max_fee_per_blob_gas,
                blob_base_fee,
                blob_hashes,
                is_canonical:         canonical,
                version,
            });
        }
    }

    let blob_count_log = blob_txs.len();
    insert_block_stats(ch, &block_stats).await?;
    insert_blob_txs(ch, &blob_txs).await?;

    if blob_count_log > 0 {
        tracing::info!(
            blocks = block_stats.len(),
            blob_txs = blob_count_log,
            canonical = is_canonical,
            "indexed"
        );
    }

    Ok(())
}
