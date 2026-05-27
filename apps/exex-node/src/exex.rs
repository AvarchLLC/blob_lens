use std::{collections::HashMap, time::{SystemTime, UNIX_EPOCH}};

use alloy_consensus::{BlockHeader, EthereumTxEnvelope, TxEip4844};
use futures_util::StreamExt;
use reth_ethereum::{
    exex::{ExExContext, ExExEvent, ExExNotification},
    node::api::{FullNodeComponents, NodeTypes},
    EthPrimitives,
};
use reth_execution_types::Chain;

use crate::{
    clickhouse_client::{
        insert_blob_tx_logs, insert_blob_txs, insert_block_stats,
        BlobTxLogRow, BlobTxRow, BlockStatRow,
    },
    rollup::{build_registry, resolve},
};

pub async fn run<Node>(mut ctx: ExExContext<Node>, ch: clickhouse::Client) -> eyre::Result<()>
where
    Node: FullNodeComponents<Types: NodeTypes<Primitives = EthPrimitives>>,
{
    let registry = build_registry();

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
///   BPO2 / Fusaka  (>= 24_833_256): 11_684_671  ← TODO: verify exact activation block
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
