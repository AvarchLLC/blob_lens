use sqlx::postgres::PgPoolOptions;
use sqlx::{Pool, Postgres};
use eyre::Result;

pub mod models;

pub async fn init_pool(database_url: &str) -> Result<Pool<Postgres>> {
    let pool = PgPoolOptions::new()
        .max_connections(5)
        .connect(database_url)
        .await?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS blob_transactions (
            id                  BIGSERIAL PRIMARY KEY,
            tx_hash             VARCHAR(255) UNIQUE NOT NULL,
            block_number        BIGINT NOT NULL,
            block_hash          VARCHAR(255) NOT NULL,
            from_address        VARCHAR(255) NOT NULL,
            to_address          VARCHAR(255),
            num_blobs           INT NOT NULL,
            max_fee_per_blob_gas VARCHAR(255) NOT NULL,
            blob_base_fee       BIGINT NOT NULL DEFAULT 0,
            blob_hashes         TEXT[] NOT NULL,
            rollup              VARCHAR(255) NOT NULL,
            created_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
        "#,
    )
    .execute(&pool)
    .await?;

    // block_blob_stats: one row per block — real per-block blob usage metrics
    // blob_count     = blob_gas_used / 131_072   (0–6)
    // utilization    = blob_gas_used / 786_432.0  (0.0–1.0, target 0.5)
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS block_blob_stats (
            block_number  BIGINT PRIMARY KEY,
            blob_base_fee BIGINT NOT NULL DEFAULT 0,
            blob_gas_used INT    NOT NULL DEFAULT 0,
            blob_count    INT    NOT NULL DEFAULT 0,
            utilization   FLOAT  NOT NULL DEFAULT 0,
            created_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
        "#,
    )
    .execute(&pool)
    .await?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS blob_hashes (
            id             BIGSERIAL PRIMARY KEY,
            tx_hash        VARCHAR(255) NOT NULL,
            blob_index     INT NOT NULL,
            versioned_hash VARCHAR(255) NOT NULL,
            created_at     TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
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
            address      VARCHAR(255) PRIMARY KEY,
            rollup_name  VARCHAR(255) NOT NULL,
            chain_id     VARCHAR(255)
        )
        "#,
    )
    .execute(&pool)
    .await?;

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

    sqlx::query(
        r#"CREATE INDEX IF NOT EXISTS idx_block_blob_stats_created ON block_blob_stats(created_at)"#,
    )
    .execute(&pool)
    .await?;

    Ok(pool)
}

pub async fn insert_block_stats(
    pool: &Pool<Postgres>,
    block_number: i64,
    blob_base_fee: i64,
    blob_gas_used: i32,
    blob_count: i32,
    utilization: f64,
) -> Result<()> {
    sqlx::query(
        r#"
        INSERT INTO block_blob_stats (block_number, blob_base_fee, blob_gas_used, blob_count, utilization)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (block_number) DO NOTHING
        "#,
    )
    .bind(block_number)
    .bind(blob_base_fee)
    .bind(blob_gas_used)
    .bind(blob_count)
    .bind(utilization)
    .execute(pool)
    .await?;

    Ok(())
}

pub async fn insert_blob_transaction(
    pool: &Pool<Postgres>,
    tx_hash: &str,
    block_number: i64,
    block_hash: &str,
    from_address: &str,
    to_address: Option<&str>,
    num_blobs: i32,
    max_fee_per_blob_gas: &str,
    blob_base_fee: i64,
    blob_hashes: Vec<String>,
    rollup: &str,
) -> Result<()> {
    sqlx::query(
        r#"
        INSERT INTO blob_transactions
        (tx_hash, block_number, block_hash, from_address, to_address, num_blobs,
         max_fee_per_blob_gas, blob_base_fee, blob_hashes, rollup)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
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
    .bind(blob_base_fee)
    .bind(blob_hashes.clone())
    .bind(rollup)
    .execute(pool)
    .await?;

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

pub async fn get_recent_blobs(pool: &Pool<Postgres>, hours: i64, limit: i64) -> Result<Vec<models::BlobTransaction>> {
    let transactions = sqlx::query_as::<_, models::BlobTransaction>(
        r#"
        SELECT id, tx_hash, block_number, block_hash, from_address, to_address,
               num_blobs, max_fee_per_blob_gas, blob_base_fee, blob_hashes, rollup, created_at
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
