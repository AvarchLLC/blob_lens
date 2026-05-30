use std::{collections::HashMap, str::FromStr, time::{SystemTime, UNIX_EPOCH}};

use alloy_consensus::{BlockHeader, EthereumTxEnvelope, TxEip4844, TxReceipt};
use alloy_primitives::TxHash;
use futures_util::StreamExt;
use reth_ethereum::{
    exex::{ExExContext, ExExEvent, ExExNotification},
    node::api::{FullNodeComponents, NodeTypes},
    provider::{BlockReader, HeaderProvider, ReceiptProvider},
    EthPrimitives,
};
use reth_execution_types::Chain;
// BlockHashOrNumber + TransactionVariant live in reth's storage-api, re-exported via reth_provider.
// alloy_eips is a transitive dep through alloy_consensus in Cargo.toml.
use alloy_eips::BlockHashOrNumber;
use reth_ethereum::provider::TransactionVariant;

use crate::{
    clickhouse_client::{
        insert_blob_tx_logs, insert_blob_txs, insert_block_stats,
        BlobTxLogRow, BlobTxRow, BlockStatRow,
    },
    rollup::{build_registry, resolve},
};

/// EIP-4844 activation on Ethereum mainnet (Dencun / Cancun fork)
const DENCUN_BLOCK: u64 = 19_426_587;
/// Blocks per batch during blob tx backfill (reads full block bodies — smaller batches)
const BLOB_BACKFILL_BATCH: u64 = 500;
/// Blocks per batch during log backfill (reads only receipts — larger batches)
const LOG_BACKFILL_BATCH: u64 = 2_000;

// ---------------------------------------------------------------------------
// Blob-tx backfill — reads block headers + full blocks + receipts directly
// from Reth's MDBX storage via the ExEx provider. No JSON-RPC dependency.
// ---------------------------------------------------------------------------

async fn get_blob_cursor(ch: &clickhouse::Client) -> eyre::Result<u64> {
    #[derive(clickhouse::Row, serde::Deserialize)]
    struct R { last_block: u64 }
    let row: Option<R> = ch
        .query("SELECT last_block FROM blob_lens.sync_progress FINAL WHERE source = 'blob_backfill' LIMIT 1")
        .fetch_optional()
        .await?;
    Ok(row.map(|r| r.last_block).unwrap_or(DENCUN_BLOCK - 1))
}

async fn set_blob_cursor(ch: &clickhouse::Client, block: u64) -> eyre::Result<()> {
    ch.query("INSERT INTO blob_lens.sync_progress (source, last_block) VALUES ('blob_backfill', ?)")
        .bind(block)
        .execute()
        .await?;
    Ok(())
}

/// Backfill `blob_transactions`, `block_blob_stats`, and `blob_tx_logs` for all
/// historical blob blocks by reading directly from Reth's storage via the ExEx
/// provider. No JSON-RPC required — reads MDBX in-process.
///
/// Progress is tracked in `sync_progress` under `source = 'blob_backfill'`.
/// Safe to interrupt and resume.
pub async fn backfill_blobs<Node>(
    ctx: &ExExContext<Node>,
    ch: &clickhouse::Client,
    registry: &HashMap<String, &'static str>,
) -> eyre::Result<()>
where
    Node: FullNodeComponents<Types: NodeTypes<Primitives = EthPrimitives>>,
    Node::Provider: BlockReader + HeaderProvider,
    <Node::Provider as ReceiptProvider>::Receipt: TxReceipt<Log = alloy_primitives::Log>,
{
    let current_head = ctx.head.number;
    let start        = get_blob_cursor(ch).await?;

    if start >= current_head {
        tracing::info!(cursor = start, "blob backfill already up to date");
        return Ok(());
    }

    tracing::info!(
        start, head = current_head, blocks = current_head - start,
        "blob backfill starting (provider-based, no RPC)"
    );

    let provider = ctx.provider().clone();
    let mut cur  = start + 1;

    while cur <= current_head {
        let batch_end = (cur + BLOB_BACKFILL_BATCH - 1).min(current_head);

        let mut blob_txs:    Vec<BlobTxRow>    = Vec::new();
        let mut block_stats: Vec<BlockStatRow> = Vec::new();
        let mut tx_logs:     Vec<BlobTxLogRow> = Vec::new();
        let version = now_ns();

        // Provider reads are synchronous MDBX mmap operations.
        tokio::task::block_in_place(|| -> eyre::Result<()> {
            for block_num in cur..=batch_end {
                // Read sealed header first — cheap, gives us hash + blob gas fields.
                let Ok(Some(sealed_hdr)) = provider.sealed_header(block_num) else { continue };

                let excess_blob_gas = sealed_hdr.excess_blob_gas().unwrap_or(0);
                let blob_gas_used   = sealed_hdr.blob_gas_used().unwrap_or(0);

                // Skip blocks with no blob activity.
                if blob_gas_used == 0 { continue; }

                let blob_base_fee   = calc_blob_base_fee(block_num, excess_blob_gas);
                let block_hash      = format!("{:#x}", *sealed_hdr.hash_ref());
                let block_timestamp = sealed_hdr.timestamp() as u32;
                let blob_count      = (blob_gas_used / 131_072) as u16;
                let utilization     = blob_gas_used as f64 / 786_432.0;

                block_stats.push(BlockStatRow {
                    block_number: block_num,
                    block_hash: block_hash.clone(),
                    block_timestamp,
                    blob_base_fee,
                    blob_gas_used,
                    excess_blob_gas,
                    blob_count,
                    utilization,
                    is_canonical: 1,
                    version,
                });

                // Read full block body with recovered senders.
                let Ok(Some(block)) = provider.recovered_block(
                    BlockHashOrNumber::Number(block_num),
                    TransactionVariant::WithHash,
                ) else { continue };

                // Receipts for log extraction.
                let receipts = provider
                    .receipts_by_block(BlockHashOrNumber::Number(block_num))
                    .unwrap_or_default()
                    .unwrap_or_default();

                let mut blob_tx_index = 0u32;
                // transactions_with_sender() yields (&Address, &Tx) — enumerate gives the
                // absolute tx position in the block, which matches receipt index.
                for (tx_pos, (sender, tx)) in block.transactions_with_sender().enumerate() {
                    let EthereumTxEnvelope::Eip4844(signed) = tx else { continue };
                    let inner: &TxEip4844 = signed.tx();

                    let from_addr = format!("{:#x}", sender);
                    let to_addr   = format!("{:#x}", inner.to);
                    let rollup    = resolve(registry, &from_addr, &to_addr);
                    let tx_hash   = format!("{:#x}", signed.hash());

                    let blob_hashes: Vec<String> = inner
                        .blob_versioned_hashes
                        .iter()
                        .map(|h| format!("{:#x}", h))
                        .collect();

                    blob_txs.push(BlobTxRow {
                        block_number:         block_num,
                        block_hash:           block_hash.clone(),
                        block_timestamp,
                        tx_hash:              tx_hash.clone(),
                        tx_index:             blob_tx_index,
                        from_address:         from_addr,
                        to_address:           to_addr,
                        rollup,
                        num_blobs:            inner.blob_versioned_hashes.len() as u8,
                        max_fee_per_blob_gas: inner.max_fee_per_blob_gas,
                        blob_base_fee,
                        blob_hashes,
                        is_canonical:         1,
                        version,
                    });
                    blob_tx_index += 1;

                    if let Some(receipt) = receipts.get(tx_pos) {
                        for (log_idx, log) in receipt.logs().iter().enumerate() {
                            let topics = log.data.topics();
                            tx_logs.push(BlobTxLogRow {
                                block_number:    block_num,
                                block_timestamp,
                                tx_hash:         tx_hash.clone(),
                                log_index:       log_idx as u32,
                                address:         format!("{:#x}", log.address),
                                topic0:          topics.first().map(|t| format!("{:#x}", t)).unwrap_or_default(),
                                topic1:          topics.get(1).map(|t| format!("{:#x}", t)).unwrap_or_default(),
                                topic2:          topics.get(2).map(|t| format!("{:#x}", t)).unwrap_or_default(),
                                topic3:          topics.get(3).map(|t| format!("{:#x}", t)).unwrap_or_default(),
                                data:            format!("0x{}", alloy_primitives::hex::encode(&log.data.data)),
                                is_canonical:    1,
                                version,
                            });
                        }
                    }
                }
            }
            Ok(())
        })?;

        insert_block_stats(ch, &block_stats).await?;
        insert_blob_txs(ch, &blob_txs).await?;
        insert_blob_tx_logs(ch, &tx_logs).await?;
        set_blob_cursor(ch, batch_end).await?;

        tracing::info!(
            up_to   = batch_end,
            pct     = format!("{:.1}%",
                          (batch_end - start) as f64
                          / (current_head - start).max(1) as f64
                          * 100.0),
            blobs   = blob_txs.len(),
            tx_logs = tx_logs.len(),
            "blob backfill batch done"
        );

        cur = batch_end + 1;
    }

    tracing::info!("blob backfill complete");
    Ok(())
}

// ---------------------------------------------------------------------------
// Log backfill — uses the ExEx's in-process provider to read historical
// receipts directly from Reth's storage (no JSON-RPC round-trips).
// ---------------------------------------------------------------------------

#[derive(clickhouse::Row, serde::Deserialize)]
struct BlobTxMeta {
    tx_hash:         String,
    block_number:    u64,
    block_timestamp: u32,
}

async fn get_log_cursor(ch: &clickhouse::Client) -> eyre::Result<u64> {
    #[derive(clickhouse::Row, serde::Deserialize)]
    struct R { last_block: u64 }
    let row: Option<R> = ch
        .query("SELECT last_block FROM blob_lens.sync_progress FINAL WHERE source = 'log_backfill' LIMIT 1")
        .fetch_optional()
        .await?;
    Ok(row.map(|r| r.last_block).unwrap_or(DENCUN_BLOCK - 1))
}

async fn set_log_cursor(ch: &clickhouse::Client, block: u64) -> eyre::Result<()> {
    ch.query("INSERT INTO blob_lens.sync_progress (source, last_block) VALUES ('log_backfill', ?)")
        .bind(block)
        .execute()
        .await?;
    Ok(())
}

/// Backfill `blob_tx_logs` for all historical blob transactions by reading
/// receipts from the live Reth node's storage via the ExEx provider.
///
/// Progress is tracked in `sync_progress` under `source = 'log_backfill'`.
/// Safe to interrupt and resume. Runs before the live notification loop.
pub async fn backfill_logs<Node>(ctx: &ExExContext<Node>, ch: &clickhouse::Client) -> eyre::Result<()>
where
    Node: FullNodeComponents<Types: NodeTypes<Primitives = EthPrimitives>>,
    <Node::Provider as ReceiptProvider>::Receipt: TxReceipt<Log = alloy_primitives::Log>,
{
    let current_head = ctx.head.number;
    let start        = get_log_cursor(ch).await?;

    if start >= current_head {
        tracing::info!(cursor = start, "log backfill already up to date");
        return Ok(());
    }

    tracing::info!(
        start,
        head  = current_head,
        blocks = current_head - start,
        "log backfill starting (provider-based, no RPC)"
    );

    let provider = ctx.provider().clone();
    let mut cur  = start;

    while cur < current_head {
        let batch_end = (cur + LOG_BACKFILL_BATCH).min(current_head);

        let tx_meta: Vec<BlobTxMeta> = ch
            .query(
                "SELECT tx_hash, block_number, toUnixTimestamp(block_timestamp) AS block_timestamp \
                 FROM blob_lens.blob_transactions FINAL \
                 WHERE is_canonical = 1 AND block_number > ? AND block_number <= ? \
                 ORDER BY block_number",
            )
            .bind(cur)
            .bind(batch_end)
            .fetch_all()
            .await?;

        if !tx_meta.is_empty() {
            let version = now_ns();
            let mut log_rows: Vec<BlobTxLogRow> = Vec::new();

            tokio::task::block_in_place(|| {
                for meta in &tx_meta {
                    let Ok(hash) = TxHash::from_str(&meta.tx_hash) else { continue };
                    let Ok(Some(receipt)) = provider.receipt_by_hash(hash) else { continue };

                    for (log_idx, log) in receipt.logs().iter().enumerate() {
                        let topics = log.data.topics();
                        log_rows.push(BlobTxLogRow {
                            block_number:    meta.block_number,
                            block_timestamp: meta.block_timestamp,
                            tx_hash:         meta.tx_hash.clone(),
                            log_index:       log_idx as u32,
                            address:         format!("{:#x}", log.address),
                            topic0:          topics.first().map(|t| format!("{:#x}", t)).unwrap_or_default(),
                            topic1:          topics.get(1).map(|t| format!("{:#x}", t)).unwrap_or_default(),
                            topic2:          topics.get(2).map(|t| format!("{:#x}", t)).unwrap_or_default(),
                            topic3:          topics.get(3).map(|t| format!("{:#x}", t)).unwrap_or_default(),
                            data:            format!("0x{}", alloy_primitives::hex::encode(&log.data.data)),
                            is_canonical:    1,
                            version,
                        });
                    }
                }
            });

            insert_blob_tx_logs(ch, &log_rows).await?;

            tracing::info!(
                up_to    = batch_end,
                pct      = format!("{:.1}%",
                               (batch_end - start) as f64
                               / (current_head - start).max(1) as f64
                               * 100.0),
                txs      = tx_meta.len(),
                logs     = log_rows.len(),
                "log backfill batch done"
            );
        }

        set_log_cursor(ch, batch_end).await?;
        cur = batch_end;
    }

    tracing::info!("log backfill complete");
    Ok(())
}

// ---------------------------------------------------------------------------
// Live ExEx notification loop
// ---------------------------------------------------------------------------

pub async fn run<Node>(mut ctx: ExExContext<Node>, ch: clickhouse::Client) -> eyre::Result<()>
where
    Node: FullNodeComponents<Types: NodeTypes<Primitives = EthPrimitives>>,
    Node::Provider: BlockReader + HeaderProvider,
    <Node::Provider as ReceiptProvider>::Receipt: TxReceipt<Log = alloy_primitives::Log>,
{
    let registry = build_registry();

    // Blob tx backfill — runs first so log_backfill can query blob_transactions.
    if let Err(e) = backfill_blobs(&ctx, &ch, &registry).await {
        tracing::warn!(err = %e, "blob backfill failed — continuing with live indexing");
    }

    // Log backfill — reads receipts for already-indexed blob txs.
    if let Err(e) = backfill_logs(&ctx, &ch).await {
        tracing::warn!(err = %e, "log backfill failed — continuing with live indexing");
    }

    while let Some(notification) = ctx.notifications.next().await {
        let notification = notification?;

        match &notification {
            ExExNotification::ChainCommitted { new } => {
                process_chain(new, &registry, &ch, true).await?;
            }
            ExExNotification::ChainReorged { old, new } => {
                process_chain(old, &registry, &ch, false).await?;
                process_chain(new, &registry, &ch, true).await?;
            }
            ExExNotification::ChainReverted { old } => {
                process_chain(old, &registry, &ch, false).await?;
            }
        }

        if let Some(committed) = notification.committed_chain() {
            ctx.events.send(ExExEvent::FinishedHeight(committed.tip().num_hash()))?;
        }
    }

    Ok(())
}

async fn process_chain(
    chain: &Chain<EthPrimitives>,
    registry: &HashMap<String, &'static str>,
    ch: &clickhouse::Client,
    is_canonical: bool,
) -> eyre::Result<()> {
    let version   = now_ns();
    let canonical = is_canonical as u8;

    let mut blob_txs:    Vec<BlobTxRow>    = Vec::new();
    let mut block_stats: Vec<BlockStatRow> = Vec::new();
    let mut tx_logs:     Vec<BlobTxLogRow> = Vec::new();

    for (block, receipts) in chain.blocks_and_receipts() {
        let block_number    = block.number();
        let excess_blob_gas = block.excess_blob_gas().unwrap_or(0);
        let blob_gas_used   = block.blob_gas_used().unwrap_or(0);
        let blob_base_fee   = calc_blob_base_fee(block_number, excess_blob_gas);
        let block_hash      = format!("{:#x}", block.hash());
        let block_timestamp = block.timestamp() as u32;
        let blob_count      = (blob_gas_used / 131_072) as u16;
        let utilization     = if blob_gas_used == 0 { 0.0 } else { blob_gas_used as f64 / 786_432.0 };

        block_stats.push(BlockStatRow {
            block_number,
            block_hash: block_hash.clone(),
            block_timestamp,
            blob_base_fee,
            blob_gas_used,
            excess_blob_gas,
            blob_count,
            utilization,
            is_canonical: canonical,
            version,
        });

        let mut blob_tx_index = 0u32;
        for (tx_pos, (sender, tx)) in block.transactions_with_sender().enumerate() {
            let EthereumTxEnvelope::Eip4844(signed) = tx else { continue };
            let inner: &TxEip4844 = signed.tx();

            let from_addr = format!("{:#x}", sender);
            let to_addr   = format!("{:#x}", inner.to);
            let rollup    = resolve(registry, &from_addr, &to_addr);
            let tx_hash   = format!("{:#x}", signed.hash());

            let blob_hashes: Vec<String> = inner
                .blob_versioned_hashes
                .iter()
                .map(|h| format!("{:#x}", h))
                .collect();

            blob_txs.push(BlobTxRow {
                block_number,
                block_hash:           block_hash.clone(),
                block_timestamp,
                tx_hash:              tx_hash.clone(),
                tx_index:             blob_tx_index,
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
            blob_tx_index += 1;

            if let Some(receipt) = receipts.get(tx_pos) {
                for (log_idx, log) in receipt.logs.iter().enumerate() {
                    let topics = log.data.topics();
                    tx_logs.push(BlobTxLogRow {
                        block_number,
                        block_timestamp,
                        tx_hash:      tx_hash.clone(),
                        log_index:    log_idx as u32,
                        address:      format!("{:#x}", log.address),
                        topic0:       topics.first().map(|t| format!("{:#x}", t)).unwrap_or_default(),
                        topic1:       topics.get(1).map(|t| format!("{:#x}", t)).unwrap_or_default(),
                        topic2:       topics.get(2).map(|t| format!("{:#x}", t)).unwrap_or_default(),
                        topic3:       topics.get(3).map(|t| format!("{:#x}", t)).unwrap_or_default(),
                        data:         format!("0x{}", alloy_primitives::hex::encode(&log.data.data)),
                        is_canonical: canonical,
                        version,
                    });
                }
            }
        }
    }

    let blob_count_log = blob_txs.len();
    let log_count      = tx_logs.len();
    insert_block_stats(ch, &block_stats).await?;
    insert_blob_txs(ch, &blob_txs).await?;
    insert_blob_tx_logs(ch, &tx_logs).await?;

    if blob_count_log > 0 {
        tracing::info!(
            blocks      = block_stats.len(),
            blob_txs    = blob_count_log,
            tx_logs     = log_count,
            canonical   = is_canonical,
            "indexed"
        );
    }

    Ok(())
}

fn now_ns() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .expect("system time before epoch")
        .as_nanos() as u64
}

/// EIP-4844 blob base fee: fake_exponential(1, excess_blob_gas, update_fraction)
/// update_fraction is hardfork-dependent:
///   Cancun/Dencun  (< 22_431_084):  3_338_477
///   Pectra EIP-7691 (>= 22_431_084): 5_007_716
///   BPO2 / Fusaka  (>= 24_833_256): 11_684_671
fn blob_update_fraction(block_number: u64) -> u128 {
    if block_number >= 24_833_256 {
        11_684_671
    } else if block_number >= 22_431_084 {
        5_007_716
    } else {
        3_338_477
    }
}

fn calc_blob_base_fee(block_number: u64, excess_blob_gas: u64) -> u128 {
    fake_exponential(1u128, excess_blob_gas as u128, blob_update_fraction(block_number))
}

fn fake_exponential(factor: u128, numerator: u128, denominator: u128) -> u128 {
    let mut output = 0u128;
    let mut numerator_accum = factor * denominator;
    let mut i = 1u128;
    while numerator_accum > 0 {
        output += numerator_accum;
        let Some(next) = numerator_accum.checked_mul(numerator) else { break };
        numerator_accum = next / (denominator * i);
        i += 1;
    }
    output / denominator
}
