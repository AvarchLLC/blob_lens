mod services;
mod db;
mod rollup_registry;

use services::blob_parser;
use dotenvy::dotenv;
use std::env;
use tracing_subscriber;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Initialize environment
    dotenv().ok();

    // Initialize logging
    tracing_subscriber::fmt()
        .with_max_level(tracing::Level::INFO)
        .init();

    tracing::info!("🚀 Starting BlobLens Indexer...");

    // Get database URL
    let database_url = env::var("DATABASE_URL")
        .expect("DATABASE_URL must be set in .env");

    // Initialize database connection pool
    let pool = db::init_pool(&database_url).await?;
    tracing::info!("✓ Database connected: {}", database_url);

    // Start blob listener
    tracing::info!("Starting blob transaction listener...");
    blob_parser::fetch_blob(&pool).await?;

    Ok(())
}
