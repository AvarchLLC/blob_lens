use std::{collections::HashMap, str::FromStr, time::{SystemTime, UNIX_EPOCH}};

use alloy_consensus::{BlockHeader, EthereumTxEnvelope, TxEip4844, TxReceipt, Transaction};
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
        insert_eth_blocks, insert_eth_txs, insert_eth_receipts, insert_eth_logs,
        BlobTxLogRow, BlobTxRow, BlockStatRow,
        EthBlockRow, EthTxRow, EthReceiptRow, EthLogRow,
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

/// Backfill all historical data from Dencun to current head.
/// Writes to BOTH blob_lens.* (legacy blob tables) and ethereum.* (general schema).
/// Reads directly from Reth's MDBX storage — no JSON-RPC.
///
/// For every block: writes ethereum.blocks + ethereum.transactions + ethereum.receipts + ethereum.logs.
/// For blob blocks only: also writes blob_lens.blob_transactions + block_blob_stats + blob_tx_logs.
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

        // blob_lens.* (legacy)
        let mut blob_txs:    Vec<BlobTxRow>    = Vec::new();
        let mut block_stats: Vec<BlockStatRow> = Vec::new();
        let mut tx_logs:     Vec<BlobTxLogRow> = Vec::new();
        // ethereum.* (general)
        let mut eth_blocks:   Vec<EthBlockRow>   = Vec::new();
        let mut eth_txs:      Vec<EthTxRow>      = Vec::new();
        let mut eth_receipts: Vec<EthReceiptRow> = Vec::new();
        let mut eth_logs:     Vec<EthLogRow>     = Vec::new();

        let version = now_ns();
        let now_sec = version as u32;

        tokio::task::block_in_place(|| -> eyre::Result<()> {
            for block_num in cur..=batch_end {
                let Ok(Some(sealed_hdr)) = provider.sealed_header(block_num) else { continue };

                let excess_blob_gas = sealed_hdr.excess_blob_gas().unwrap_or(0);
                let blob_gas_used   = sealed_hdr.blob_gas_used().unwrap_or(0);
                let blob_base_fee   = calc_blob_base_fee(block_num, excess_blob_gas);
                let block_hash      = format!("{:#x}", *sealed_hdr.hash_ref());
                let block_timestamp = sealed_hdr.timestamp() as u32;
                let blob_count      = (blob_gas_used / 131_072) as u16;
                let utilization     = if blob_gas_used == 0 { 0.0 } else { blob_gas_used as f64 / 786_432.0 };
                let base_fee_u64    = sealed_hdr.base_fee_per_gas().map(|f| f as u64);
                let block_nonce     = sealed_hdr.nonce().map(|n| u64::from_be_bytes(*n)).unwrap_or(0);

                // Read full block (all blocks, not just blob blocks — needed for ethereum.transactions)
                let Ok(Some(block)) = provider.recovered_block(
                    BlockHashOrNumber::Number(block_num),
                    TransactionVariant::WithHash,
                ) else { continue };

                // receipts_by_block silently returns empty for historical blocks stored in
                // Reth's static files. Use receipt_by_hash per tx instead — same approach
                // as backfill_logs which is proven to work for all historical data.
                let receipts_per_tx: Vec<Option<_>> = block
                    .transactions_with_sender()
                    .map(|(_, tx)| provider.receipt_by_hash(*tx.tx_hash()).ok().flatten())
                    .collect();

                let tx_count = receipts_per_tx.len() as u32;

                // ── ethereum.blocks (every block) ──────────────────────────
                eth_blocks.push(EthBlockRow {
                    number:            block_num,
                    hash:              block_hash.clone(),
                    parent_hash:       format!("{:#x}", sealed_hdr.parent_hash()),
                    is_deleted:        0,
                    timestamp:         block_timestamp,
                    gas_used:          sealed_hdr.gas_used(),
                    gas_limit:         sealed_hdr.gas_limit(),
                    base_fee_per_gas:  base_fee_u64,
                    state_root:        format!("{:#x}", sealed_hdr.state_root()),
                    receipts_root:     format!("{:#x}", sealed_hdr.receipts_root()),
                    transactions_root: format!("{:#x}", sealed_hdr.transactions_root()),
                    miner:             format!("{:#x}", sealed_hdr.beneficiary()),
                    difficulty:        sealed_hdr.difficulty().saturating_to::<u64>(),
                    nonce:             block_nonce,
                    transaction_count: tx_count,
                    extra_data:        format!("0x{}", alloy_primitives::hex::encode(sealed_hdr.extra_data())),
                    blob_gas_used:     sealed_hdr.blob_gas_used(),
                    excess_blob_gas:   sealed_hdr.excess_blob_gas(),
                    blob_count,
                    blob_base_fee,
                    utilization,
                    inserted_at:       now_sec,
                });

                // ── blob_lens.block_blob_stats (blob blocks only) ──────────
                if blob_gas_used > 0 {
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
                }

                let mut blob_tx_index  = 0u32;
                let mut prev_cum_gas   = 0u64;

                for (tx_pos, (sender, tx)) in block.transactions_with_sender().enumerate() {
                    let from_addr  = format!("{:#x}", sender);
                    let tx_hash    = format!("{:#x}", tx.tx_hash());
                    let tx_type    = tx.tx_type() as u8;
                    let to_opt     = tx.to().map(|a| format!("{:#x}", a));
                    let value_hex  = format!("{:#x}", tx.value());
                    let gas_lim    = tx.gas_limit();
                    let tx_nonce   = tx.nonce();
                    let input_hex  = format!("0x{}", alloy_primitives::hex::encode(tx.input()));
                    let gas_price  = tx.gas_price().map(|p| p as u128);
                    let max_fee    = if gas_price.is_none() { Some(tx.max_fee_per_gas() as u128) } else { None };
                    let max_prio   = tx.max_priority_fee_per_gas().map(|p| p as u128);
                    let max_blob   = tx.max_fee_per_blob_gas().map(|p| p as u128);
                    let blob_hashes_eth: Vec<String> = tx.blob_versioned_hashes()
                        .map(|s| s.iter().map(|h| format!("{:#x}", h)).collect())
                        .unwrap_or_default();
                    let num_blobs  = blob_hashes_eth.len() as u8;
                    let to_str_eth = to_opt.clone().unwrap_or_default();
                    let rollup     = resolve(registry, &from_addr, &to_str_eth);

                    // ── ethereum.transactions (all tx types) ───────────────
                    eth_txs.push(EthTxRow {
                        block_number:          block_num,
                        block_hash:            block_hash.clone(),
                        block_timestamp,
                        tx_index:              tx_pos as u32,
                        tx_hash:               tx_hash.clone(),
                        is_deleted:            0,
                        tx_type,
                        from_address:          from_addr.clone(),
                        to_address:            to_opt.clone(),
                        value:                 value_hex,
                        gas_limit:             gas_lim,
                        gas_price,
                        max_fee_per_gas:       max_fee,
                        max_priority_fee:      max_prio,
                        nonce:                 tx_nonce,
                        input:                 input_hex,
                        max_fee_per_blob_gas:  max_blob,
                        blob_versioned_hashes: blob_hashes_eth.clone(),
                        rollup:                rollup.clone(),
                        blob_base_fee:         if tx_type == 3 { blob_base_fee } else { 0 },
                        num_blobs,
                        inserted_at:           now_sec,
                    });

                    if let Some(receipt) = receipts_per_tx.get(tx_pos).and_then(|r| r.as_ref()) {
                        let cum_gas  = receipt.cumulative_gas_used;
                        let gas_used = cum_gas.saturating_sub(prev_cum_gas);
                        prev_cum_gas = cum_gas;
                        let eff_price = if let Some(gp) = tx.gas_price() {
                            gp as u64
                        } else {
                            let base = base_fee_u64.unwrap_or(0);
                            let prio = tx.max_priority_fee_per_gas().unwrap_or(0) as u64;
                            (tx.max_fee_per_gas() as u64).min(base + prio)
                        };

                        // ── ethereum.receipts ─────────────────────────────
                        eth_receipts.push(EthReceiptRow {
                            block_number:        block_num,
                            block_hash:          block_hash.clone(),
                            block_timestamp,
                            tx_hash:             tx_hash.clone(),
                            tx_index:            tx_pos as u32,
                            is_deleted:          0,
                            success:             receipt.status() as u8,
                            gas_used,
                            cumulative_gas_used: cum_gas,
                            effective_gas_price: eff_price,
                            blob_gas_used:       tx.blob_versioned_hashes().map(|s| s.len() as u64 * 131_072).filter(|&g| g > 0),
                            blob_gas_price:      tx.blob_versioned_hashes().filter(|s| !s.is_empty()).map(|_| blob_base_fee as u64),
                            inserted_at:         now_sec,
                        });

                        // ── ethereum.logs (all tx types) ──────────────────
                        for (log_idx, log) in receipt.logs().iter().enumerate() {
                            let topics = log.data.topics();
                            eth_logs.push(EthLogRow {
                                block_number:    block_num,
                                block_hash:      block_hash.clone(),
                                block_timestamp,
                                tx_hash:         tx_hash.clone(),
                                tx_index:        tx_pos as u32,
                                log_index:       log_idx as u32,
                                is_deleted:      0,
                                address:         format!("{:#x}", log.address),
                                topic0:          topics.first().map(|t| format!("{:#x}", t)).unwrap_or_default(),
                                topic1:          topics.get(1).map(|t| format!("{:#x}", t)),
                                topic2:          topics.get(2).map(|t| format!("{:#x}", t)),
                                topic3:          topics.get(3).map(|t| format!("{:#x}", t)),
                                data:            format!("0x{}", alloy_primitives::hex::encode(&log.data.data)),
                                inserted_at:     now_sec,
                            });
                        }

                        // ── blob_lens.blob_tx_logs (blob txs only) ────────
                        if tx_type == 3 {
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

                    // ── blob_lens.blob_transactions (blob txs only) ────────
                    if tx_type == 3 {
                        if let EthereumTxEnvelope::Eip4844(signed) = tx {
                            let inner: &TxEip4844 = signed.tx();
                            let to_bl = format!("{:#x}", inner.to);
                            let blob_hashes_bl: Vec<String> = inner.blob_versioned_hashes
                                .iter().map(|h| format!("{:#x}", h)).collect();
                            blob_txs.push(BlobTxRow {
                                block_number:         block_num,
                                block_hash:           block_hash.clone(),
                                block_timestamp,
                                tx_hash:              tx_hash.clone(),
                                tx_index:             blob_tx_index,
                                from_address:         from_addr.clone(),
                                to_address:           to_bl.clone(),
                                rollup:               resolve(registry, &from_addr, &to_bl),
                                num_blobs:            inner.blob_versioned_hashes.len() as u8,
                                max_fee_per_blob_gas: inner.max_fee_per_blob_gas,
                                blob_base_fee,
                                blob_hashes:          blob_hashes_bl,
                                is_canonical:         1,
                                version,
                            });
                            blob_tx_index += 1;
                        }
                    }
                }
            }
            Ok(())
        })?;

        // Flush to ClickHouse
        insert_block_stats(ch, &block_stats).await?;
        insert_blob_txs(ch, &blob_txs).await?;
        insert_blob_tx_logs(ch, &tx_logs).await?;
        insert_eth_blocks(ch, &eth_blocks).await?;
        insert_eth_txs(ch, &eth_txs).await?;
        insert_eth_receipts(ch, &eth_receipts).await?;
        insert_eth_logs(ch, &eth_logs).await?;
        set_blob_cursor(ch, batch_end).await?;

        tracing::info!(
            up_to    = batch_end,
            pct      = format!("{:.1}%", (batch_end - start) as f64 / (current_head - start).max(1) as f64 * 100.0),
            eth_txs  = eth_txs.len(),
            blobs    = blob_txs.len(),
            eth_logs = eth_logs.len(),
            "backfill batch done"
        );

        cur = batch_end + 1;
    }

    tracing::info!("backfill complete");
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
    let version    = now_ns();
    let canonical  = is_canonical as u8;
    let is_deleted = if is_canonical { 0u8 } else { 1u8 };
    let now        = now_ns() as u32;  // second-resolution timestamp for inserted_at

    // blob_lens.* (legacy, keeps frontend working)
    let mut blob_txs:    Vec<BlobTxRow>    = Vec::new();
    let mut block_stats: Vec<BlockStatRow> = Vec::new();
    let mut tx_logs:     Vec<BlobTxLogRow> = Vec::new();

    // ethereum.* (new general schema)
    let mut eth_blocks:   Vec<EthBlockRow>   = Vec::new();
    let mut eth_txs:      Vec<EthTxRow>      = Vec::new();
    let mut eth_receipts: Vec<EthReceiptRow> = Vec::new();
    let mut eth_logs:     Vec<EthLogRow>     = Vec::new();

    for (block, receipts) in chain.blocks_and_receipts() {
        let block_number    = block.number();
        let excess_blob_gas = block.excess_blob_gas().unwrap_or(0);
        let blob_gas_used   = block.blob_gas_used().unwrap_or(0);
        let blob_base_fee   = calc_blob_base_fee(block_number, excess_blob_gas);
        let block_hash      = format!("{:#x}", block.hash());
        let block_timestamp = block.timestamp() as u32;
        let blob_count      = (blob_gas_used / 131_072) as u16;
        let utilization     = if blob_gas_used == 0 { 0.0 } else { blob_gas_used as f64 / 786_432.0 };
        let base_fee_u64    = block.base_fee_per_gas().map(|f| f as u64);
        let tx_count        = block.body().transactions().count() as u32;
        let block_nonce     = block.nonce().map(|n| u64::from_be_bytes(*n)).unwrap_or(0);

        // ── blob_lens.block_blob_stats ──────────────────────────────────────
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

        // ── ethereum.blocks ─────────────────────────────────────────────────
        eth_blocks.push(EthBlockRow {
            number:            block_number,
            hash:              block_hash.clone(),
            parent_hash:       format!("{:#x}", block.parent_hash()),
            is_deleted,
            timestamp:         block_timestamp,
            gas_used:          block.gas_used(),
            gas_limit:         block.gas_limit(),
            base_fee_per_gas:  base_fee_u64,
            state_root:        format!("{:#x}", block.state_root()),
            receipts_root:     format!("{:#x}", block.receipts_root()),
            transactions_root: format!("{:#x}", block.transactions_root()),
            miner:             format!("{:#x}", block.beneficiary()),
            difficulty:        block.difficulty().saturating_to::<u64>(),
            nonce:             block_nonce,
            transaction_count: tx_count,
            extra_data:        format!("0x{}", alloy_primitives::hex::encode(block.extra_data())),
            blob_gas_used:     block.blob_gas_used(),
            excess_blob_gas:   block.excess_blob_gas(),
            blob_count,
            blob_base_fee,
            utilization,
            inserted_at:       now,
        });

        // ── Per-transaction: blob_lens.* + ethereum.transactions/receipts/logs
        let mut blob_tx_index  = 0u32;
        let mut prev_cum_gas   = 0u64;

        for (tx_pos, (sender, tx)) in block.transactions_with_sender().enumerate() {
            let from_addr  = format!("{:#x}", sender);
            let tx_hash    = format!("{:#x}", tx.tx_hash());
            let tx_type    = tx.tx_type() as u8;
            let to_addr    = tx.to().map(|a| format!("{:#x}", a));
            let value_hex  = format!("{:#x}", tx.value());
            let gas_lim    = tx.gas_limit();
            let tx_nonce   = tx.nonce();
            let input_hex  = format!("0x{}", alloy_primitives::hex::encode(tx.input()));
            let gas_price  = tx.gas_price().map(|p| p as u128);
            let max_fee    = if gas_price.is_none() { Some(tx.max_fee_per_gas() as u128) } else { None };
            let max_prio   = tx.max_priority_fee_per_gas().map(|p| p as u128);
            let max_blob   = tx.max_fee_per_blob_gas().map(|p| p as u128);
            let blob_hashes_eth: Vec<String> = tx.blob_versioned_hashes()
                .map(|s| s.iter().map(|h| format!("{:#x}", h)).collect())
                .unwrap_or_default();

            let to_str    = to_addr.clone().unwrap_or_default();
            let tx_rollup = resolve(registry, &from_addr, &to_str);
            let tx_num_blobs = blob_hashes_eth.len() as u8;

            // ── ethereum.transactions ─────────────────────────────────────
            eth_txs.push(EthTxRow {
                block_number,
                block_hash:            block_hash.clone(),
                block_timestamp,
                tx_index:              tx_pos as u32,
                tx_hash:               tx_hash.clone(),
                is_deleted,
                tx_type,
                from_address:          from_addr.clone(),
                to_address:            to_addr.clone(),
                value:                 value_hex,
                gas_limit:             gas_lim,
                gas_price,
                max_fee_per_gas:       max_fee,
                max_priority_fee:      max_prio,
                nonce:                 tx_nonce,
                input:                 input_hex,
                max_fee_per_blob_gas:  max_blob,
                blob_versioned_hashes: blob_hashes_eth,
                rollup:                tx_rollup,
                blob_base_fee:         if tx_type == 3 { blob_base_fee } else { 0 },
                num_blobs:             tx_num_blobs,
                inserted_at:           now,
            });

            // ── ethereum.receipts + effective gas price ────────────────────
            if let Some(receipt) = receipts.get(tx_pos) {
                let cum_gas  = receipt.cumulative_gas_used;
                let gas_used = cum_gas.saturating_sub(prev_cum_gas);
                prev_cum_gas = cum_gas;

                let effective_gas_price = if let Some(gp) = tx.gas_price() {
                    gp as u64
                } else {
                    let base = base_fee_u64.unwrap_or(0);
                    let prio = tx.max_priority_fee_per_gas().unwrap_or(0) as u64;
                    let cap  = tx.max_fee_per_gas() as u64;
                    cap.min(base + prio)
                };

                // blob gas per tx = num_blobs * GAS_PER_BLOB
                let tx_blob_gas = tx.blob_versioned_hashes()
                    .map(|s| s.len() as u64 * 131_072)
                    .filter(|&g| g > 0);

                eth_receipts.push(EthReceiptRow {
                    block_number,
                    block_hash:          block_hash.clone(),
                    block_timestamp,
                    tx_hash:             tx_hash.clone(),
                    tx_index:            tx_pos as u32,
                    is_deleted,
                    success:             receipt.status() as u8,
                    gas_used,
                    cumulative_gas_used: cum_gas,
                    effective_gas_price,
                    blob_gas_used:       tx_blob_gas,
                    blob_gas_price:      tx_blob_gas.map(|_| blob_base_fee as u64),
                    inserted_at:         now,
                });

                // ── ethereum.logs ─────────────────────────────────────────
                for (log_idx, log) in receipt.logs.iter().enumerate() {
                    let topics = log.data.topics();
                    eth_logs.push(EthLogRow {
                        block_number,
                        block_hash:      block_hash.clone(),
                        block_timestamp,
                        tx_hash:         tx_hash.clone(),
                        tx_index:        tx_pos as u32,
                        log_index:       log_idx as u32,
                        is_deleted,
                        address:         format!("{:#x}", log.address),
                        topic0:          topics.first().map(|t| format!("{:#x}", t)).unwrap_or_default(),
                        topic1:          topics.get(1).map(|t| format!("{:#x}", t)),
                        topic2:          topics.get(2).map(|t| format!("{:#x}", t)),
                        topic3:          topics.get(3).map(|t| format!("{:#x}", t)),
                        data:            format!("0x{}", alloy_primitives::hex::encode(&log.data.data)),
                        inserted_at:     now,
                    });
                }
            }

            // ── blob_lens.* (only for Type-3 blob txs) ───────────────────
            if let EthereumTxEnvelope::Eip4844(signed) = tx {
                let inner: &TxEip4844 = signed.tx();
                let to_str = format!("{:#x}", inner.to);
                let rollup = resolve(registry, &from_addr, &to_str);

                let blob_hashes_bl: Vec<String> = inner
                    .blob_versioned_hashes.iter()
                    .map(|h| format!("{:#x}", h))
                    .collect();

                blob_txs.push(BlobTxRow {
                    block_number,
                    block_hash:           block_hash.clone(),
                    block_timestamp,
                    tx_hash:              tx_hash.clone(),
                    tx_index:             blob_tx_index,
                    from_address:         from_addr.clone(),
                    to_address:           to_str,
                    rollup,
                    num_blobs:            inner.blob_versioned_hashes.len() as u8,
                    max_fee_per_blob_gas: inner.max_fee_per_blob_gas,
                    blob_base_fee,
                    blob_hashes:          blob_hashes_bl,
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
    }

    // ── Flush to ClickHouse ─────────────────────────────────────────────────
    insert_block_stats(ch, &block_stats).await?;
    insert_blob_txs(ch, &blob_txs).await?;
    insert_blob_tx_logs(ch, &tx_logs).await?;

    insert_eth_blocks(ch, &eth_blocks).await?;
    insert_eth_txs(ch, &eth_txs).await?;
    insert_eth_receipts(ch, &eth_receipts).await?;
    insert_eth_logs(ch, &eth_logs).await?;

    if !eth_txs.is_empty() {
        tracing::info!(
            blocks    = eth_blocks.len(),
            txs       = eth_txs.len(),
            blob_txs  = blob_txs.len(),
            logs      = eth_logs.len(),
            canonical = is_canonical,
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
