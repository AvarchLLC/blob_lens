use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct BlobTransaction {
    pub id: i64,
    pub tx_hash: String,
    pub block_number: i64,
    pub block_hash: String,
    pub from_address: String,
    pub to_address: Option<String>,
    pub num_blobs: i32,
    pub max_fee_per_blob_gas: String,
    pub blob_base_fee: i64,
    pub blob_hashes: Vec<String>,
    pub rollup: String,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct BlobHash {
    pub id: i64,
    pub tx_hash: String,
    pub blob_index: i32,
    pub versioned_hash: String,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct RollupRegistry {
    pub address: String,
    pub rollup_name: String,
    pub chain_id: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct BlobStats {
    pub rollup: String,
    pub total_blobs: i64,
    pub total_transactions: i64,
    pub avg_fee_per_blob_gas: String,
    pub last_seen: DateTime<Utc>,
}

/// Per-block blob usage metrics derived from the execution layer header.
/// blob_count   = blob_gas_used / 131_072  (0–6, EIP-4844 max 6 blobs/block)
/// utilization  = blob_gas_used / 786_432  (0.0–1.0, target 0.5 = 3/6 blobs)
/// blob_base_fee = calc_blob_fee(excess_blob_gas) — actual wei per blob gas unit burned
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct BlockBlobStats {
    pub block_number: i64,
    pub blob_base_fee: i64,
    pub blob_gas_used: i32,
    pub blob_count: i32,
    pub utilization: f64,
    pub created_at: DateTime<Utc>,
}
