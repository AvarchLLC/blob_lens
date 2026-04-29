use sqlx::postgres::PgPoolOptions;
use sqlx::{Pool, Postgres};
use eyre::Result;

pub mod models;

/// Initialize PostgreSQL connection pool
pub async fn init_pool(database_url: &str) -> Result<Pool<Postgres>> {
    let pool = PgPoolOptions::new()
        .max_connections(5)
        .connect(database_url)
        .await?;

    // Run migrations
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS blob_transactions (
            id BIGSERIAL PRIMARY KEY,
            tx_hash VARCHAR(255) UNIQUE NOT NULL,
            block_number BIGINT NOT NULL,
            block_hash VARCHAR(255) NOT NULL,
            from_address VARCHAR(255) NOT NULL,
            to_address VARCHAR(255),
            num_blobs INT NOT NULL,
            max_fee_per_blob_gas VARCHAR(255) NOT NULL,
            blob_hashes TEXT[] NOT NULL,
            rollup VARCHAR(255) NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
        "#,
    )
    .execute(&pool)
    .await?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS blob_hashes (
            id BIGSERIAL PRIMARY KEY,
            tx_hash VARCHAR(255) NOT NULL,
            blob_index INT NOT NULL,
            versioned_hash VARCHAR(255) NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            FOREIGN KEY (tx_hash) REFERENCES blob_transactions(tx_hash),
            UNIQUE(tx_hash, blob_index)
        )
        "#,
    )
    .execute(&pool)
    .await?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS rollup_registry (
            address VARCHAR(255) PRIMARY KEY,
            rollup_name VARCHAR(255) NOT NULL,
            chain_id VARCHAR(255)
        )
        "#,
    )
    .execute(&pool)
    .await?;

    // Create indexes for faster queries
    sqlx::query(
        r#"CREATE INDEX IF NOT EXISTS idx_blob_transactions_rollup ON blob_transactions(rollup)"#,
    )
    .execute(&pool)
    .await?;

    sqlx::query(
        r#"CREATE INDEX IF NOT EXISTS idx_blob_transactions_block ON blob_transactions(block_number)"#,
    )
    .execute(&pool)
    .await?;

    Ok(pool)
}

/// Insert a blob transaction into the database
pub async fn insert_blob_transaction(
    pool: &Pool<Postgres>,
    tx_hash: &str,
    block_number: i64,
    block_hash: &str,
    from_address: &str,
    to_address: Option<&str>,
    num_blobs: i32,
    max_fee_per_blob_gas: &str,
    blob_hashes: Vec<String>,
    rollup: &str,
) -> Result<()> {
    sqlx::query(
        r#"
        INSERT INTO blob_transactions 
        (tx_hash, block_number, block_hash, from_address, to_address, num_blobs, 
         max_fee_per_blob_gas, blob_hashes, rollup)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (tx_hash) DO NOTHING
        "#,
    )
    .bind(tx_hash)
    .bind(block_number)
    .bind(block_hash)
    .bind(from_address)
    .bind(to_address)
    .bind(num_blobs)
    .bind(max_fee_per_blob_gas)
    .bind(blob_hashes.clone())
    .bind(rollup)
    .execute(pool)
    .await?;

    // Insert individual blob hashes
    for (index, hash) in blob_hashes.iter().enumerate() {
        sqlx::query(
            r#"
            INSERT INTO blob_hashes (tx_hash, blob_index, versioned_hash)
            VALUES ($1, $2, $3)
            ON CONFLICT DO NOTHING
            "#,
        )
        .bind(tx_hash)
        .bind(index as i32)
        .bind(hash)
        .execute(pool)
        .await?;
    }

    Ok(())
}

/// Get blob transaction statistics by rollup
pub async fn get_rollup_stats(pool: &Pool<Postgres>, rollup: &str) -> Result<Option<models::BlobStats>> {
    let stats = sqlx::query_as::<_, models::BlobStats>(
        r#"
        SELECT 
            rollup,
            COUNT(*)::bigint as total_transactions,
            SUM(num_blobs)::bigint as total_blobs,
            '0' as avg_fee_per_blob_gas,
            MAX(created_at) as last_seen
        FROM blob_transactions
        WHERE rollup = $1
        GROUP BY rollup
        "#,
    )
    .bind(rollup)
    .fetch_optional(pool)
    .await?;

    Ok(stats)
}

/// Get all recent blob transactions (last N hours)
pub async fn get_recent_blobs(pool: &Pool<Postgres>, hours: i64, limit: i64) -> Result<Vec<models::BlobTransaction>> {
    let transactions = sqlx::query_as::<_, models::BlobTransaction>(
        r#"
        SELECT id, tx_hash, block_number, block_hash, from_address, to_address, 
               num_blobs, max_fee_per_blob_gas, blob_hashes, rollup, created_at
        FROM blob_transactions
        WHERE created_at > NOW() - INTERVAL '1 hour' * $1
        ORDER BY created_at DESC
        LIMIT $2
        "#,
    )
    .bind(hours)
    .bind(limit)
    .fetch_all(pool)
    .await?;

    Ok(transactions)
}
