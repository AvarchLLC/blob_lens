use clickhouse::{Client, Row};
use serde::{Deserialize, Serialize};

// ── blob_lens.* row types ────────────────────────────────────────────────────

#[derive(Debug, Clone, Row, Serialize, Deserialize)]
pub struct BlobTxRow {
    pub block_number:         u64,
    pub block_hash:           String,
    pub block_timestamp:      u32,
    pub tx_hash:              String,
    pub tx_index:             u32,
    pub from_address:         String,
    pub to_address:           String,
    pub rollup:               String,
    pub num_blobs:            u8,
    pub max_fee_per_blob_gas: u128,
    pub blob_base_fee:        u128,
    pub blob_hashes:          Vec<String>,
    pub is_canonical:         u8,
    pub version:              u64,
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
    pub utilization:     f64,
    pub is_canonical:    u8,
    pub version:         u64,
}

#[derive(Debug, Clone, Row, Serialize, Deserialize)]
pub struct BlobTxLogRow {
    pub block_number:    u64,
    pub block_timestamp: u32,
    pub tx_hash:         String,
    pub log_index:       u32,
    pub address:         String,
    pub topic0:          String,
    pub topic1:          String,
    pub topic2:          String,
    pub topic3:          String,
    pub data:            String,
    pub is_canonical:    u8,
    pub version:         u64,
}

// ── ethereum.* row types ─────────────────────────────────────────────────────

#[derive(Debug, Clone, Row, Serialize, Deserialize)]
pub struct EthBlockRow {
    pub number:            u64,
    pub hash:              String,
    pub parent_hash:       String,
    pub is_deleted:        u8,
    pub timestamp:         u32,
    pub gas_used:          u64,
    pub gas_limit:         u64,
    pub base_fee_per_gas:  Option<u64>,
    pub state_root:        String,
    pub receipts_root:     String,
    pub transactions_root: String,
    pub miner:             String,
    pub difficulty:        u64,
    pub nonce:             u64,
    pub transaction_count: u32,
    pub extra_data:        String,
    pub blob_gas_used:     Option<u64>,
    pub excess_blob_gas:   Option<u64>,
    pub blob_count:        u16,
    pub blob_base_fee:     u128,
    pub utilization:       f64,
    pub inserted_at:       u32,
}

#[derive(Debug, Clone, Row, Serialize, Deserialize)]
pub struct EthTxRow {
    pub block_number:          u64,
    pub block_hash:            String,
    pub block_timestamp:       u32,
    pub tx_index:              u32,
    pub tx_hash:               String,
    pub is_deleted:            u8,
    pub tx_type:               u8,
    pub from_address:          String,
    pub to_address:            Option<String>,
    pub value:                 String,
    pub gas_limit:             u64,
    pub gas_price:             Option<u128>,
    pub max_fee_per_gas:       Option<u128>,
    pub max_priority_fee:      Option<u128>,
    pub nonce:                 u64,
    pub input:                 String,
    pub max_fee_per_blob_gas:  Option<u128>,
    pub blob_versioned_hashes: Vec<String>,
    pub rollup:                String,
    pub blob_base_fee:         u128,
    pub num_blobs:             u8,
    pub inserted_at:           u32,
}

#[derive(Debug, Clone, Row, Serialize, Deserialize)]
pub struct EthReceiptRow {
    pub block_number:        u64,
    pub block_hash:          String,
    pub block_timestamp:     u32,
    pub tx_hash:             String,
    pub tx_index:            u32,
    pub is_deleted:          u8,
    pub success:             u8,
    pub gas_used:            u64,
    pub cumulative_gas_used: u64,
    pub effective_gas_price: u64,
    pub blob_gas_used:       Option<u64>,
    pub blob_gas_price:      Option<u64>,
    pub inserted_at:         u32,
}

#[derive(Debug, Clone, Row, Serialize, Deserialize)]
pub struct EthLogRow {
    pub block_number:    u64,
    pub block_hash:      String,
    pub block_timestamp: u32,
    pub tx_hash:         String,
    pub tx_index:        u32,
    pub log_index:       u32,
    pub is_deleted:      u8,
    pub address:         String,
    pub topic0:          String,
    pub topic1:          Option<String>,
    pub topic2:          Option<String>,
    pub topic3:          Option<String>,
    pub data:            String,
    pub inserted_at:     u32,
}

// ── Schema init (idempotent) ─────────────────────────────────────────────────

pub async fn init_schema(client: &Client) -> eyre::Result<()> {
    client.query("CREATE DATABASE IF NOT EXISTS blob_lens").execute().await?;

    client.query(
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
            is_canonical         UInt8 DEFAULT 1,
            version              UInt64
        )
        ENGINE = ReplacingMergeTree(version)
        PARTITION BY toYYYYMM(block_timestamp)
        ORDER BY (block_number, tx_hash)",
    ).execute().await?;

    client.query(
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
    ).execute().await?;

    client.query(
        "CREATE TABLE IF NOT EXISTS blob_lens.sync_progress (
            source     LowCardinality(String),
            last_block UInt64,
            updated_at DateTime DEFAULT now()
        )
        ENGINE = ReplacingMergeTree(updated_at)
        ORDER BY source",
    ).execute().await?;

    client.query(
        "CREATE TABLE IF NOT EXISTS blob_lens.blob_tx_logs (
            block_number    UInt64,
            block_timestamp DateTime,
            tx_hash         String,
            log_index       UInt32,
            address         LowCardinality(String),
            topic0          String,
            topic1          String,
            topic2          String,
            topic3          String,
            data            String,
            is_canonical    UInt8 DEFAULT 1,
            version         UInt64
        )
        ENGINE = ReplacingMergeTree(version)
        PARTITION BY toYYYYMM(block_timestamp)
        ORDER BY (block_number, tx_hash, log_index)",
    ).execute().await?;

    Ok(())
}

// ── Insert helpers ───────────────────────────────────────────────────────────

pub async fn insert_blob_txs(client: &Client, rows: &[BlobTxRow]) -> eyre::Result<()> {
    if rows.is_empty() { return Ok(()); }
    let mut ins = client.insert("blob_lens.blob_transactions")?;
    for row in rows { ins.write(row).await?; }
    ins.end().await?;
    Ok(())
}

pub async fn insert_block_stats(client: &Client, rows: &[BlockStatRow]) -> eyre::Result<()> {
    if rows.is_empty() { return Ok(()); }
    let mut ins = client.insert("blob_lens.block_blob_stats")?;
    for row in rows { ins.write(row).await?; }
    ins.end().await?;
    Ok(())
}

pub async fn insert_blob_tx_logs(client: &Client, rows: &[BlobTxLogRow]) -> eyre::Result<()> {
    if rows.is_empty() { return Ok(()); }
    let mut ins = client.insert("blob_lens.blob_tx_logs")?;
    for row in rows { ins.write(row).await?; }
    ins.end().await?;
    Ok(())
}

pub async fn insert_eth_blocks(client: &Client, rows: &[EthBlockRow]) -> eyre::Result<()> {
    if rows.is_empty() { return Ok(()); }
    let mut ins = client.insert("ethereum.blocks")?;
    for row in rows { ins.write(row).await?; }
    ins.end().await?;
    Ok(())
}

pub async fn insert_eth_txs(client: &Client, rows: &[EthTxRow]) -> eyre::Result<()> {
    if rows.is_empty() { return Ok(()); }
    let mut ins = client.insert("ethereum.transactions")?;
    for row in rows { ins.write(row).await?; }
    ins.end().await?;
    Ok(())
}

pub async fn insert_eth_receipts(client: &Client, rows: &[EthReceiptRow]) -> eyre::Result<()> {
    if rows.is_empty() { return Ok(()); }
    let mut ins = client.insert("ethereum.receipts")?;
    for row in rows { ins.write(row).await?; }
    ins.end().await?;
    Ok(())
}

pub async fn insert_eth_logs(client: &Client, rows: &[EthLogRow]) -> eyre::Result<()> {
    if rows.is_empty() { return Ok(()); }
    let mut ins = client.insert("ethereum.logs")?;
    for row in rows { ins.write(row).await?; }
    ins.end().await?;
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
