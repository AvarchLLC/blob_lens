use clickhouse::{Client, Row};
use serde::{Deserialize, Serialize};

// ---------------------------------------------------------------------------
// Row types — field names must match ClickHouse column names exactly
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Row, Serialize, Deserialize)]
pub struct BlobTxRow {
    pub block_number:         u64,
    pub block_hash:           String,
    pub block_timestamp:      u32,
    pub tx_hash:              String,
    pub tx_index:             u32,
    pub from_address:         String,
    pub to_address:           String,   // empty string when contract creation
    pub rollup:               String,
    pub num_blobs:            u8,
    pub max_fee_per_blob_gas: u128,
    pub blob_base_fee:        u128,
    pub blob_hashes:          Vec<String>,
    pub is_canonical:         u8,       // 1 = canonical, 0 = reorged out
    pub version:              u64,      // nanos since epoch — ReplacingMergeTree key
}

#[derive(Debug, Clone, Row, Serialize, Deserialize)]
pub struct BlockStatRow {
    pub block_number:    u64,
    pub block_hash:      String,
    pub block_timestamp: u32,
    pub blob_base_fee:   u128,
    pub blob_gas_used:   u64,
    pub excess_blob_gas: u64,
    pub blob_count:      u16,
    pub utilization:     f64,   // 0.0–1.0
    pub is_canonical:    u8,
    pub version:         u64,
}

// ---------------------------------------------------------------------------
// Schema — CREATE TABLE IF NOT EXISTS (idempotent)
// ---------------------------------------------------------------------------

pub async fn init_schema(client: &Client) -> eyre::Result<()> {
    client
        .query(
            "CREATE DATABASE IF NOT EXISTS blob_lens",
        )
        .execute()
        .await?;

    // blob_transactions
    // ReplacingMergeTree(version): on merge, keeps row with highest `version`
    // for each (block_number, tx_hash) key. Query with FINAL to force
    // deduplication, then filter WHERE is_canonical = 1.
    client
        .query(
            "CREATE TABLE IF NOT EXISTS blob_lens.blob_transactions (
                block_number         UInt64,
                block_hash           String,
                block_timestamp      DateTime,
                tx_hash              String,
                tx_index             UInt32,
                from_address         String,
                to_address           String,
                rollup               LowCardinality(String),
                num_blobs            UInt8,
                max_fee_per_blob_gas UInt128,
                blob_base_fee        UInt128,
                blob_hashes          Array(String),
                is_canonical         UInt8       DEFAULT 1,
                version              UInt64
            )
            ENGINE = ReplacingMergeTree(version)
            PARTITION BY toYYYYMM(block_timestamp)
            ORDER BY (block_number, tx_hash)",
        )
        .execute()
        .await?;

    // block_blob_stats
    client
        .query(
            "CREATE TABLE IF NOT EXISTS blob_lens.block_blob_stats (
                block_number    UInt64,
                block_hash      String,
                block_timestamp DateTime,
                blob_base_fee   UInt128,
                blob_gas_used   UInt64,
                excess_blob_gas UInt64,
                blob_count      UInt16,
                utilization     Float64,
                is_canonical    UInt8 DEFAULT 1,
                version         UInt64
            )
            ENGINE = ReplacingMergeTree(version)
            PARTITION BY toYYYYMM(block_timestamp)
            ORDER BY block_number",
        )
        .execute()
        .await?;

    // Progress table for the backfill binary — tracks highest indexed block
    client
        .query(
            "CREATE TABLE IF NOT EXISTS blob_lens.sync_progress (
                source          LowCardinality(String),
                last_block      UInt64,
                updated_at      DateTime DEFAULT now()
            )
            ENGINE = ReplacingMergeTree(updated_at)
            ORDER BY source",
        )
        .execute()
        .await?;

    Ok(())
}

// ---------------------------------------------------------------------------
// Batch writers — returns Err on first ClickHouse failure
// ---------------------------------------------------------------------------

pub async fn insert_blob_txs(client: &Client, rows: &[BlobTxRow]) -> eyre::Result<()> {
    if rows.is_empty() {
        return Ok(());
    }
    let mut insert = client.insert("blob_lens.blob_transactions")?;
    for row in rows {
        insert.write(row).await?;
    }
    insert.end().await?;
    Ok(())
}

pub async fn insert_block_stats(client: &Client, rows: &[BlockStatRow]) -> eyre::Result<()> {
    if rows.is_empty() {
        return Ok(());
    }
    let mut insert = client.insert("blob_lens.block_blob_stats")?;
    for row in rows {
        insert.write(row).await?;
    }
    insert.end().await?;
    Ok(())
}

pub async fn get_sync_progress(client: &Client, source: &str) -> eyre::Result<Option<u64>> {
    let row: Option<(u64,)> = client
        .query(
            "SELECT last_block FROM blob_lens.sync_progress FINAL
             WHERE source = ? ORDER BY updated_at DESC LIMIT 1",
        )
        .bind(source)
        .fetch_optional()
        .await?;
    Ok(row.map(|(b,)| b))
}

pub async fn set_sync_progress(client: &Client, source: &str, block: u64) -> eyre::Result<()> {
    client
        .query("INSERT INTO blob_lens.sync_progress (source, last_block) VALUES (?, ?)")
        .bind(source)
        .bind(block)
        .execute()
        .await?;
    Ok(())
}
