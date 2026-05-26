use sqlx::postgres::PgPoolOptions;
use std::env;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Load environment variables from .env
    dotenvy::dotenv().ok();

    let database_url = env::var("DATABASE_URL")
        .unwrap_or_else(|_| "postgresql://postgres:password@localhost:5432/blob_lens".to_string());

    println!("\n🔍 BlobLens Database Inspector");
    println!("════════════════════════════════════════════\n");

    // Connect to database
    let pool = PgPoolOptions::new()
        .max_connections(1)
        .connect(&database_url)
        .await?;

    // Query 1: Total transactions
    println!("1️⃣  TOTAL BLOB TRANSACTIONS INDEXED");
    println!("──────────────────────────────────────────");
    let count: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM blob_transactions")
        .fetch_one(&pool)
        .await?;
    println!(" total_transactions\n{}...\n", count.0);

    // Query 2: Total blobs
    println!("2️⃣  TOTAL BLOBS (Sum of all num_blobs)");
    println!("──────────────────────────────────────────");
    let total: (Option<i64>,) = sqlx::query_as("SELECT SUM(num_blobs) FROM blob_transactions")
        .fetch_one(&pool)
        .await?;
    println!(" total_blobs\n{}...\n", total.0.unwrap_or(0));

    // Query 3: Latest 5 transactions
    println!("3️⃣  LATEST 5 BLOB TRANSACTIONS");
    println!("──────────────────────────────────────────");
    let recent: Vec<(String, i64, i32, String, String, String)> = sqlx::query_as(
        "SELECT tx_hash, block_number, num_blobs, max_fee_per_blob_gas, rollup, created_at::TEXT \
         FROM blob_transactions \
         ORDER BY created_at DESC \
         LIMIT 5"
    )
    .fetch_all(&pool)
    .await?;

    println!("{:<70} | {:>12} | {:>8} | {:>20} | {:>10} | {:>26}", 
             "tx_hash", "block_num", "blobs", "max_fee_gas", "rollup", "created_at");
    println!("{}", "─".repeat(175));
    for (tx, block, blobs, fee, rollup, created) in recent {
        println!("{:<70} | {:>12} | {:>8} | {:>20} | {:>10} | {:>26}",
                 &tx[0..66.min(tx.len())], block, blobs, fee, rollup, &created[0..19]);
    }
    println!();

    // Query 4: By rollup
    println!("4️⃣  BLOB TRANSACTIONS BY ROLLUP");
    println!("──────────────────────────────────────────");
    let rollups: Vec<(String, i64, Option<i64>)> = sqlx::query_as(
        "SELECT rollup, COUNT(*) as transactions, SUM(num_blobs) as total_blobs \
         FROM blob_transactions \
         GROUP BY rollup \
         ORDER BY total_blobs DESC"
    )
    .fetch_all(&pool)
    .await?;

    println!("{:<15} | {:>12} | {:>12}", "rollup", "transactions", "total_blobs");
    println!("{}", "─".repeat(42));
    for (rollup, txs, blobs) in rollups {
        println!("{:<15} | {:>12} | {:>12}", rollup, txs, blobs.unwrap_or(0));
    }
    println!();

    // Query 5: Average fee
    println!("5️⃣  AVERAGE FEE PER BLOB (Last 10 transactions)");
    println!("──────────────────────────────────────────");
    let avg_fee: (Option<i64>,) = sqlx::query_as(
        "SELECT AVG(CAST(max_fee_per_blob_gas AS BIGINT))::BIGINT \
         FROM (SELECT max_fee_per_blob_gas FROM blob_transactions ORDER BY created_at DESC LIMIT 10) t"
    )
    .fetch_one(&pool)
    .await?;
    println!(" avg_fee_per_blob_gas\n{}...\n", avg_fee.0.unwrap_or(0));

    // Query 6: Busiest blocks
    println!("6️⃣  BLOCKS WITH MOST BLOBS");
    println!("──────────────────────────────────────────");
    let blocks: Vec<(i64, i64, Option<i32>)> = sqlx::query_as(
        "SELECT block_number, COUNT(*) as tx_count, SUM(num_blobs) as total_blobs \
         FROM blob_transactions \
         GROUP BY block_number \
         ORDER BY total_blobs DESC \
         LIMIT 5"
    )
    .fetch_all(&pool)
    .await?;

    println!("{:<15} | {:>10} | {:>12}", "block_number", "tx_count", "total_blobs");
    println!("{}", "─".repeat(40));
    for (block, txs, blobs) in blocks {
        println!("{:<15} | {:>10} | {:>12}", block, txs, blobs.unwrap_or(0));
    }
    println!();

    println!("════════════════════════════════════════════");
    println!("✅ Collection is running continuously!");
    println!("   Use: docker-compose logs blob-lens -f");
    println!("   To see live indexing in progress\n");

    Ok(())
}
