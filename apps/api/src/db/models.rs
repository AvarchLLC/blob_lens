use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

/// Represents a single blob transaction stored in PostgreSQL
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
    pub blob_hashes: Vec<String>,
    pub rollup: String,
    pub created_at: DateTime<Utc>,
}

/// Represents a blob versioned hash record
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct BlobHash {
    pub id: i64,
    pub tx_hash: String,
    pub blob_index: i32,
    pub versioned_hash: String,
    pub created_at: DateTime<Utc>,
}

/// Represents rollup attribution data
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct RollupRegistry {
    pub address: String,
    pub rollup_name: String,
    pub chain_id: Option<String>,
}

/// Aggregated blob statistics
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct BlobStats {
    pub rollup: String,
    pub total_blobs: i64,
    pub total_transactions: i64,
    pub avg_fee_per_blob_gas: String,
    pub last_seen: DateTime<Utc>,
}
