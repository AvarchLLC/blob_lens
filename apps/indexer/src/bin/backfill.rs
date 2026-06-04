/// Backfill binary — walks Dencun activation → current head via JSON-RPC and
/// writes to both blob_lens.* and ethereum.* tables in ClickHouse.
///
/// Tables written:
///   blob_lens.blob_transactions, blob_lens.block_blob_stats, blob_lens.blob_tx_logs
///   ethereum.blocks, ethereum.transactions, ethereum.receipts, ethereum.logs
///   (ethereum.erc20_transfers / block_gas_stats / contract_events auto-populate via MVs)
///
/// Progress tracked in blob_lens.sync_progress (source='backfill').
/// Safe to interrupt and resume. ReplacingMergeTree handles duplicate re-inserts.
///
/// Environment variables:
///   RETH_RPC              JSON-RPC endpoint  (default: http://localhost:8545)
///   CLICKHOUSE_URL        ClickHouse HTTP     (default: http://localhost:8123)
///   CLICKHOUSE_DB         database name       (default: blob_lens)
///   CLICKHOUSE_USER       optional
///   CLICKHOUSE_PASSWORD   optional
///   START_BLOCK           override start block (default: Dencun = 19_426_587)
///   BATCH_SIZE            blocks per batch    (default: 50)
use clickhouse::{Client, Row};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use tracing_subscriber::EnvFilter;

use blob_indexer::clickhouse_client::{
    EthBlockRow, EthLogRow, EthReceiptRow, EthTxRow,
    insert_eth_blocks, insert_eth_logs, insert_eth_receipts, insert_eth_txs,
};

const DENCUN_BLOCK: u64 = 19_426_587;

// ── blob_lens row types (local, not re-exported from lib) ────────────────────

#[derive(Debug, Clone, Row, Serialize, Deserialize)]
struct BlobTxRow {
    block_number:         u64,
    block_hash:           String,
    block_timestamp:      u32,
    tx_hash:              String,
    tx_index:             u32,
    from_address:         String,
    to_address:           String,
    rollup:               String,
    num_blobs:            u8,
    max_fee_per_blob_gas: u128,
    blob_base_fee:        u128,
    blob_hashes:          Vec<String>,
    is_canonical:         u8,
    version:              u64,
}

#[derive(Debug, Clone, Row, Serialize, Deserialize)]
struct BlockStatRow {
    block_number:    u64,
    block_hash:      String,
    block_timestamp: u32,
    blob_base_fee:   u128,
    blob_gas_used:   u64,
    excess_blob_gas: u64,
    blob_count:      u16,
    utilization:     f64,
    is_canonical:    u8,
    version:         u64,
}

#[derive(Debug, Clone, Row, Serialize, Deserialize)]
struct BlobTxLogRow {
    block_number:    u64,
    block_timestamp: u32,
    tx_hash:         String,
    log_index:       u32,
    address:         String,
    topic0:          String,
    topic1:          String,
    topic2:          String,
    topic3:          String,
    data:            String,
    is_canonical:    u8,
    version:         u64,
}

// ── RPC response shapes ──────────────────────────────────────────────────────

#[derive(Debug, Deserialize)]
struct RpcBlock {
    number:    String,
    hash:      String,
    #[serde(rename = "parentHash")]
    parent_hash: String,
    timestamp: String,
    #[serde(rename = "gasUsed")]
    gas_used: String,
    #[serde(rename = "gasLimit")]
    gas_limit: String,
    #[serde(rename = "baseFeePerGas")]
    base_fee_per_gas: Option<String>,
    #[serde(rename = "stateRoot")]
    state_root: String,
    #[serde(rename = "receiptsRoot")]
    receipts_root: String,
    #[serde(rename = "transactionsRoot")]
    transactions_root: String,
    miner: String,
    difficulty: String,
    nonce: String,
    #[serde(rename = "extraData")]
    extra_data: String,
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
    to:   Option<String>,
    #[serde(rename = "transactionIndex")]
    transaction_index: String,
    #[serde(rename = "type")]
    tx_type: String,
    value: String,
    gas: String,
    #[serde(rename = "gasPrice")]
    gas_price: Option<String>,
    #[serde(rename = "maxFeePerGas")]
    max_fee_per_gas: Option<String>,
    #[serde(rename = "maxPriorityFeePerGas")]
    max_priority_fee_per_gas: Option<String>,
    nonce: String,
    input: String,
    #[serde(rename = "maxFeePerBlobGas")]
    max_fee_per_blob_gas: Option<String>,
    #[serde(rename = "blobVersionedHashes")]
    blob_versioned_hashes: Option<Vec<String>>,
}

#[derive(Debug, Deserialize)]
struct RpcLog {
    #[serde(rename = "transactionHash")]
    transaction_hash: String,
    #[serde(rename = "transactionIndex")]
    transaction_index: String,
    #[serde(rename = "logIndex")]
    log_index: String,
    address: String,
    topics: Vec<String>,
    data: String,
}

#[derive(Debug, Deserialize)]
struct RpcReceipt {
    #[serde(rename = "transactionHash")]
    transaction_hash: String,
    #[serde(rename = "transactionIndex")]
    transaction_index: String,
    status: Option<String>,
    #[serde(rename = "gasUsed")]
    gas_used: String,
    #[serde(rename = "cumulativeGasUsed")]
    cumulative_gas_used: String,
    #[serde(rename = "effectiveGasPrice")]
    effective_gas_price: String,
    #[serde(rename = "blobGasUsed")]
    blob_gas_used: Option<String>,
    #[serde(rename = "blobGasPrice")]
    blob_gas_price: Option<String>,
    logs: Vec<RpcLog>,
}

// ── Rollup registry ──────────────────────────────────────────────────────────

fn build_registry() -> std::collections::HashMap<String, &'static str> {
    let mut m = std::collections::HashMap::new();
    let mut add = |addr: &str, name: &'static str| { m.insert(addr.to_lowercase(), name); };
    add("0x6887246668a3b87f54bed3cb3f02b747db32f2db", "Base");
    add("0xff00000000000000000000000000000000008453", "Base");
    add("0x5050f69a9786f081509234f1a7f4684b5e5b76c9", "Base");
    add("0xff00000000000000000000000000000000000010", "OP Mainnet");
    add("0x49277ee36a024120ee218127354c4a3591dc90a9", "OP Mainnet");
    add("0xff00000000000000000000000000000000000130", "Unichain");
    add("0x2f60a5184c63ca94f82a27100643dbabe4f3f7fd", "Unichain");
    add("0xff00000000000000000000000000000000081457", "Blast");
    add("0x415c8893d514f9bc5211d36eeda4183226b84aa7", "Blast");
    add("0xff00000000000000000000000000000000011000", "Mode");
    add("0xff00000000000000000000000000000000060900", "Zora");
    add("0x625726c858dbf78c0125436c943bf4b4be9d9033", "Zora");
    add("0xff00000000000000000000000000000000000480", "World Chain");
    add("0xdbbe3d8c2d2b22a2611c5a94a9a12c2fcd49eb29", "World Chain");
    add("0xff00000000000000000000000000000000002000", "Fraxtal");
    add("0x1c479675ad559dc151f6ec7ed3fbf8cee79582b6", "Arbitrum One");
    add("0xc1b634853cb333d3ad8663715b08f41a3aec47cc", "Arbitrum One");
    add("0xb80e953f51e3ee52dc9a00b5f1a2c8a5f5735c3e", "Arbitrum One");
    add("0x51ce04be214b38861890e7064c1db1202166edf0", "Arbitrum Nova");
    add("0xbb80f5e9b75ba0c04e8560194b4500a4eb0decae", "zkSync Era");
    add("0xa9232040bf0e0aea2578a5b2243f2916dbfc0a69", "zkSync Era");
    add("0xde1709b46e1e0786a27c3afb41d5d2a0f9ff6ef3", "zkSync Era");
    add("0x8453957136a1f1fd053161a9cb221206f66d58ab", "Starknet");
    add("0x2c169dfe5fbba12957bdd0ba47d9cedbfe260ca7", "Starknet");
    add("0xd19d4b5d358258f05be33b186d6e83e942f0bfb7", "Linea");
    add("0x46d2f319fd42165d4318f099e143dea8124e9e3e", "Linea");
    add("0xa1db05c9e47feb2f18628b295763f49aceb77475", "Scroll");
    add("0x054a47b9e2a22af6c0ce55020238c8fecd7d334b", "Scroll");
    add("0x0b2c63c18a0ef42abe6a2a96b06a93e6c5f5bd72", "Scroll");
    add("0xef6ab30b56ad41b49f9def93d95e86df3c66e31f", "Taiko");
    add("0x000cb000e880a92a8f383d69da2142a969b93de7", "Taiko");
    add("0xcbeb5d484b54498d3893a0c3eb790331962e9e9d", "Taiko");
    add("0x5f62d006c10c009ff50c878cd6157ac861c99990", "Taiko");
    add("0x1a1ec25dc08e98e5e93f1104b5ca0ad82b8bfe46", "Mantle");
    add("0x2f40d796917ffb642bd2e2bdd2c762a5e40fd749", "Mantle");
    add("0x86bbdfe1b8b9a7c29bea6e84e0f2e9ebfb39c137", "Polygon zkEVM");
    add("0xaf1e4f6a47af647f87c0ec814d8032c4a4bff145", "Zircuit");
    add("0xff00000000000000000000000000000000048900", "Zircuit");
    add("0x6776be80dbada6a02b5f2095cf13734ac303b8d1", "Soneium");
    add("0x4b2d036d2c27192549ad5a2f2d9875e1843833de", "Abstract");
    add("0x65115c6d23274e0a29a63b69130efe901aa52e7a", "Hemi");
    add("0xae4d46bd9117cb017c5185844699c51107cb28a9", "Metis");
    add("0xa4ed58737fc5c4861c33410c29ecb1e2af29d960", "Boba");
    add("0xff000000000000000000000000000000000000fe", "Kroma");
    add("0xff0000000000000000000000000000000000169",  "Manta Pacific");
    add("0xff00000000000000000000000000000000033139", "ApeChain");
    add("0xff00000000000000000000000000000888888888", "Ancient8");
    add("0xff00000000000000000000000000000000042220", "Celo");
    add("0x1a7e4e63778b4f12a199c062f3efdd288afcbce8", "Celo");
    add("0xf854cd5b26bfd73d51236c0122798907ed65b1f2", "Swell Chain");
    add("0x500d7ea63cf2e501dadaa5feec1fc19fe2aa72ac", "Ink");
    add("0x8839e742fd56ebc0d31d11dd5a2ca25aa61c54da", "Forknet");
    add("0xc70ae19b5feaa5c19f576e621d2bad9771864fe2", "Paradex");
    add("0x6ab0e960911b50f6d14f249782ac12ec3e7584a0", "Morph");
    m
}

fn resolve_rollup(
    registry: &std::collections::HashMap<String, &'static str>,
    from: &str,
    to: &str,
) -> String {
    registry.get(&from.to_lowercase())
        .or_else(|| if !to.is_empty() { registry.get(&to.to_lowercase()) } else { None })
        .map(|s| s.to_string())
        .unwrap_or_else(|| "UNKNOWN".to_string())
}

// ── Helpers ──────────────────────────────────────────────────────────────────

fn blob_update_fraction(block_number: u64) -> u128 {
    if block_number >= 24_833_256 {
        11_684_671
    } else if block_number >= 22_431_084 {
        5_007_716
    } else {
        3_338_477
    }
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

fn calc_blob_base_fee(block_number: u64, excess: u64) -> u128 {
    fake_exponential(1, excess as u128, blob_update_fraction(block_number))
}

fn hex_u64(s: &str) -> u64 {
    u64::from_str_radix(s.trim_start_matches("0x"), 16).unwrap_or(0)
}

fn hex_u128(s: &str) -> u128 {
    u128::from_str_radix(s.trim_start_matches("0x"), 16).unwrap_or(0)
}

// ── Schema init ──────────────────────────────────────────────────────────────

async fn init_schema(client: &Client) -> eyre::Result<()> {
    // blob_lens tables (idempotent — tables already exist on ba-data)
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
        ) ENGINE = ReplacingMergeTree(version)
        PARTITION BY toYYYYMM(block_timestamp)
        ORDER BY (block_number, tx_hash)",
    ).execute().await?;
    client.query(
        "CREATE TABLE IF NOT EXISTS blob_lens.block_blob_stats (
            block_number    UInt64,  block_hash      String,  block_timestamp DateTime,
            blob_base_fee   UInt128, blob_gas_used   UInt64,  excess_blob_gas UInt64,
            blob_count      UInt16,  utilization     Float64,
            is_canonical    UInt8 DEFAULT 1,         version UInt64
        ) ENGINE = ReplacingMergeTree(version)
        PARTITION BY toYYYYMM(block_timestamp)
        ORDER BY block_number",
    ).execute().await?;
    client.query(
        "CREATE TABLE IF NOT EXISTS blob_lens.sync_progress (
            source LowCardinality(String), last_block UInt64, updated_at DateTime DEFAULT now()
        ) ENGINE = ReplacingMergeTree(updated_at) ORDER BY source",
    ).execute().await?;
    client.query(
        "CREATE TABLE IF NOT EXISTS blob_lens.blob_tx_logs (
            block_number UInt64, block_timestamp DateTime, tx_hash String,
            log_index UInt32, address LowCardinality(String),
            topic0 String, topic1 String, topic2 String, topic3 String,
            data String, is_canonical UInt8 DEFAULT 1, version UInt64
        ) ENGINE = ReplacingMergeTree(version)
        PARTITION BY toYYYYMM(block_timestamp)
        ORDER BY (block_number, tx_hash, log_index)",
    ).execute().await?;

    // ethereum tables — already created on ba-data with full schema + indexes + MVs
    client.query("CREATE DATABASE IF NOT EXISTS ethereum").execute().await?;
    Ok(())
}

// ── Progress tracking ────────────────────────────────────────────────────────

async fn get_progress(client: &Client) -> eyre::Result<Option<u64>> {
    #[derive(Row, Deserialize)]
    struct R { last_block: u64 }
    let row: Option<R> = client
        .query("SELECT last_block FROM blob_lens.sync_progress FINAL WHERE source = 'backfill' LIMIT 1")
        .fetch_optional()
        .await?;
    Ok(row.map(|r| r.last_block))
}

async fn set_progress(client: &Client, block: u64) -> eyre::Result<()> {
    client
        .query("INSERT INTO blob_lens.sync_progress (source, last_block) VALUES ('backfill', ?)")
        .bind(block)
        .execute()
        .await?;
    Ok(())
}

// ── RPC helpers ──────────────────────────────────────────────────────────────

async fn rpc_block(http: &reqwest::Client, rpc: &str, num: u64) -> eyre::Result<Option<RpcBlock>> {
    let resp: Value = http
        .post(rpc)
        .json(&json!({"jsonrpc":"2.0","id":1,"method":"eth_getBlockByNumber",
                      "params":[format!("{:#x}", num), true]}))
        .send().await?.json().await?;
    if resp["result"].is_null() { return Ok(None); }
    Ok(Some(serde_json::from_value(resp["result"].clone())?))
}

async fn rpc_head(http: &reqwest::Client, rpc: &str) -> eyre::Result<u64> {
    let resp: Value = http
        .post(rpc)
        .json(&json!({"jsonrpc":"2.0","id":1,"method":"eth_blockNumber","params":[]}))
        .send().await?.json().await?;
    Ok(hex_u64(resp["result"].as_str().unwrap_or("0x0")))
}

async fn rpc_block_receipts(
    http: &reqwest::Client,
    rpc: &str,
    num: u64,
) -> eyre::Result<Vec<RpcReceipt>> {
    let resp: Value = http
        .post(rpc)
        .json(&json!({"jsonrpc":"2.0","id":1,"method":"eth_getBlockReceipts",
                      "params":[format!("{:#x}", num)]}))
        .send().await?.json().await?;
    if resp["result"].is_null() { return Ok(vec![]); }
    Ok(serde_json::from_value(resp["result"].clone()).unwrap_or_default())
}

// ── Main ─────────────────────────────────────────────────────────────────────

#[tokio::main]
async fn main() -> eyre::Result<()> {
    tracing_subscriber::fmt()
        .with_env_filter(EnvFilter::from_default_env())
        .init();
    dotenvy::dotenv().ok();

    let rpc        = std::env::var("RETH_RPC").unwrap_or_else(|_| "http://localhost:8545".into());
    let ch_url     = std::env::var("CLICKHOUSE_URL").unwrap_or_else(|_| "http://localhost:8123".into());
    let ch_db      = std::env::var("CLICKHOUSE_DB").unwrap_or_else(|_| "blob_lens".into());
    let ch_user    = std::env::var("CLICKHOUSE_USER").ok();
    let ch_pass    = std::env::var("CLICKHOUSE_PASSWORD").ok();
    let batch_size = std::env::var("BATCH_SIZE").ok()
        .and_then(|s| s.parse().ok()).unwrap_or(50u64);
    let start_override = std::env::var("START_BLOCK").ok()
        .and_then(|s| s.parse().ok());

    let mut ch = Client::default().with_url(&ch_url).with_database(&ch_db);
    if let Some(u) = &ch_user { ch = ch.with_user(u); }
    if let Some(p) = &ch_pass { ch = ch.with_password(p); }

    init_schema(&ch).await?;

    let registry = build_registry();
    let http = reqwest::Client::new();

    let head  = rpc_head(&http, &rpc).await?;
    let saved = get_progress(&ch).await?;
    let start = start_override
        .unwrap_or_else(|| saved.map(|b| b + 1).unwrap_or(DENCUN_BLOCK));

    tracing::info!(start, head, blocks = head - start, "backfill starting");

    let mut cur = start;
    while cur <= head {
        let end = (cur + batch_size - 1).min(head);

        let mut blob_txs:    Vec<BlobTxRow>    = Vec::new();
        let mut block_stats: Vec<BlockStatRow> = Vec::new();
        let mut tx_logs:     Vec<BlobTxLogRow> = Vec::new();

        let mut eth_blocks:   Vec<EthBlockRow>   = Vec::new();
        let mut eth_txs:      Vec<EthTxRow>      = Vec::new();
        let mut eth_receipts: Vec<EthReceiptRow> = Vec::new();
        let mut eth_logs:     Vec<EthLogRow>     = Vec::new();

        for num in cur..=end {
            let Some(block) = rpc_block(&http, &rpc, num).await? else { continue };

            let excess    = block.excess_blob_gas.as_deref().map(hex_u64).unwrap_or(0);
            let gas_used  = block.blob_gas_used.as_deref().map(hex_u64).unwrap_or(0);
            let base_fee  = calc_blob_base_fee(num, excess);
            let timestamp = hex_u64(&block.timestamp) as u32;
            let blob_count = (gas_used / 131_072) as u16;
            let utilization = if gas_used == 0 { 0.0 } else { gas_used as f64 / 786_432.0 };

            // blob_lens.block_blob_stats
            block_stats.push(BlockStatRow {
                block_number: num, block_hash: block.hash.clone(),
                block_timestamp: timestamp, blob_base_fee: base_fee,
                blob_gas_used: gas_used, excess_blob_gas: excess,
                blob_count, utilization, is_canonical: 1, version: num,
            });

            // ethereum.blocks
            eth_blocks.push(EthBlockRow {
                number: num,
                hash: block.hash.clone(),
                parent_hash: block.parent_hash.clone(),
                is_deleted: 0,
                timestamp,
                gas_used: hex_u64(&block.gas_used),
                gas_limit: hex_u64(&block.gas_limit),
                base_fee_per_gas: block.base_fee_per_gas.as_deref().map(hex_u64),
                state_root: block.state_root.clone(),
                receipts_root: block.receipts_root.clone(),
                transactions_root: block.transactions_root.clone(),
                miner: block.miner.clone(),
                difficulty: hex_u64(&block.difficulty),
                nonce: hex_u64(&block.nonce),
                transaction_count: block.transactions.len() as u32,
                extra_data: block.extra_data.clone(),
                blob_gas_used: if gas_used > 0 { Some(gas_used) } else { None },
                excess_blob_gas: if excess > 0 { Some(excess) } else { None },
                blob_count,
                blob_base_fee: base_fee,
                utilization,
                inserted_at: timestamp,
            });

            // Fetch receipts for ALL blocks (needed for ethereum.receipts + logs)
            let receipts: std::collections::HashMap<String, RpcReceipt> =
                rpc_block_receipts(&http, &rpc, num).await?
                    .into_iter()
                    .map(|r| (r.transaction_hash.to_lowercase(), r))
                    .collect();

            for tx in &block.transactions {
                let to      = tx.to.clone().unwrap_or_default();
                let rollup  = resolve_rollup(&registry, &tx.from, &to);
                let tx_type = hex_u64(&tx.tx_type) as u8;
                let tx_idx  = hex_u64(&tx.transaction_index) as u32;
                let hashes  = tx.blob_versioned_hashes.clone().unwrap_or_default();
                let max_fee = tx.max_fee_per_blob_gas.as_deref().map(hex_u128);
                let is_blob_tx = tx_type == 3;

                // ethereum.transactions — ALL tx types
                eth_txs.push(EthTxRow {
                    block_number: num,
                    block_hash: block.hash.clone(),
                    block_timestamp: timestamp,
                    tx_index: tx_idx,
                    tx_hash: tx.hash.clone(),
                    is_deleted: 0,
                    tx_type,
                    from_address: tx.from.clone(),
                    to_address: tx.to.clone(),
                    value: tx.value.clone(),
                    gas_limit: hex_u64(&tx.gas),
                    gas_price: tx.gas_price.as_deref().map(hex_u128),
                    max_fee_per_gas: tx.max_fee_per_gas.as_deref().map(hex_u128),
                    max_priority_fee: tx.max_priority_fee_per_gas.as_deref().map(hex_u128),
                    nonce: hex_u64(&tx.nonce),
                    input: tx.input.clone(),
                    max_fee_per_blob_gas: max_fee,
                    blob_versioned_hashes: hashes.clone(),
                    rollup: rollup.clone(),
                    blob_base_fee: if is_blob_tx { base_fee } else { 0 },
                    num_blobs: hashes.len() as u8,
                    inserted_at: timestamp,
                });

                // blob_lens.blob_transactions — type 3 only
                if is_blob_tx {
                    blob_txs.push(BlobTxRow {
                        block_number: num, block_hash: block.hash.clone(),
                        block_timestamp: timestamp, tx_hash: tx.hash.clone(),
                        tx_index: tx_idx, from_address: tx.from.clone(),
                        to_address: to, rollup,
                        num_blobs: hashes.len() as u8,
                        max_fee_per_blob_gas: max_fee.unwrap_or(0),
                        blob_base_fee: base_fee, blob_hashes: hashes,
                        is_canonical: 1, version: num,
                    });
                }

                // ethereum.receipts + logs + blob_lens.blob_tx_logs from receipts
                if let Some(receipt) = receipts.get(&tx.hash.to_lowercase()) {
                    let r_idx = hex_u64(&receipt.transaction_index) as u32;

                    eth_receipts.push(EthReceiptRow {
                        block_number: num,
                        block_hash: block.hash.clone(),
                        block_timestamp: timestamp,
                        tx_hash: tx.hash.clone(),
                        tx_index: r_idx,
                        is_deleted: 0,
                        success: receipt.status.as_deref()
                            .map(|s| if hex_u64(s) == 1 { 1u8 } else { 0u8 })
                            .unwrap_or(1),
                        gas_used: hex_u64(&receipt.gas_used),
                        cumulative_gas_used: hex_u64(&receipt.cumulative_gas_used),
                        effective_gas_price: hex_u64(&receipt.effective_gas_price),
                        blob_gas_used: receipt.blob_gas_used.as_deref().map(hex_u64),
                        blob_gas_price: receipt.blob_gas_price.as_deref().map(hex_u64),
                        inserted_at: timestamp,
                    });

                    for log in &receipt.logs {
                        let log_idx = hex_u64(&log.log_index) as u32;
                        let log_tx_idx = hex_u64(&log.transaction_index) as u32;

                        // ethereum.logs — ALL logs
                        eth_logs.push(EthLogRow {
                            block_number: num,
                            block_hash: block.hash.clone(),
                            block_timestamp: timestamp,
                            tx_hash: log.transaction_hash.clone(),
                            tx_index: log_tx_idx,
                            log_index: log_idx,
                            is_deleted: 0,
                            address: log.address.clone(),
                            topic0: log.topics.first().cloned().unwrap_or_default(),
                            topic1: log.topics.get(1).cloned(),
                            topic2: log.topics.get(2).cloned(),
                            topic3: log.topics.get(3).cloned(),
                            data: log.data.clone(),
                            inserted_at: timestamp,
                        });

                        // blob_lens.blob_tx_logs — only for blob txs
                        if is_blob_tx {
                            tx_logs.push(BlobTxLogRow {
                                block_number: num,
                                block_timestamp: timestamp,
                                tx_hash: tx.hash.clone(),
                                log_index: log_idx,
                                address: log.address.clone(),
                                topic0: log.topics.first().cloned().unwrap_or_default(),
                                topic1: log.topics.get(1).cloned().unwrap_or_default(),
                                topic2: log.topics.get(2).cloned().unwrap_or_default(),
                                topic3: log.topics.get(3).cloned().unwrap_or_default(),
                                data: log.data.clone(),
                                is_canonical: 1,
                                version: num,
                            });
                        }
                    }
                }
            }
        }

        // ── blob_lens inserts ─────────────────────────────────────────────────
        if !block_stats.is_empty() {
            let mut ins = ch.insert("blob_lens.block_blob_stats")?;
            for r in &block_stats { ins.write(r).await?; }
            ins.end().await?;
        }
        if !blob_txs.is_empty() {
            let mut ins = ch.insert("blob_lens.blob_transactions")?;
            for r in &blob_txs { ins.write(r).await?; }
            ins.end().await?;
        }
        if !tx_logs.is_empty() {
            let mut ins = ch.insert("blob_lens.blob_tx_logs")?;
            for r in &tx_logs { ins.write(r).await?; }
            ins.end().await?;
        }

        // ── ethereum inserts ──────────────────────────────────────────────────
        insert_eth_blocks(&ch, &eth_blocks).await?;
        insert_eth_txs(&ch, &eth_txs).await?;
        insert_eth_receipts(&ch, &eth_receipts).await?;
        insert_eth_logs(&ch, &eth_logs).await?;

        set_progress(&ch, end).await?;
        tracing::info!(
            up_to   = end,
            pct     = format!("{:.1}%", (end - start) as f64 / (head - start).max(1) as f64 * 100.0),
            blobs   = blob_txs.len(),
            eth_txs = eth_txs.len(),
            eth_logs= eth_logs.len(),
            "batch done"
        );

        cur = end + 1;
    }

    tracing::info!("backfill complete");
    Ok(())
}
