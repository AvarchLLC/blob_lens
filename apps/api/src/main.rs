mod services;
mod db;
mod rollup_registry;
mod api;

use services::blob_parser;
use dotenvy::dotenv;
use std::env;
use tracing_subscriber;
use axum::Router;
use std::net::SocketAddr;
use tower_http::trace::TraceLayer;
use tower_http::services::ServeDir;
use std::sync::Arc;

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

    // Clone pool for API server
    let pool_clone = pool.clone();

    // Start API server on port 8080
    let api_handle = tokio::spawn(async move {
        let app = Router::new()
            .nest("/", api::api_router(pool_clone))
            .layer(TraceLayer::new_for_http());

        let addr = SocketAddr::from(([0, 0, 0, 0], 8080));
        tracing::info!("📊 API server listening on http://0.0.0.0:8080");

        let listener = tokio::net::TcpListener::bind(&addr).await.unwrap();
        axum::serve(listener, app).await.unwrap();
    });

    // Start blob listener in parallel
    let blob_handle = tokio::spawn(async move {
        tracing::info!("Starting blob transaction listener...");
        if let Err(e) = blob_parser::fetch_blob(&pool).await {
            tracing::error!("Blob parser error: {}", e);
        }
    });

    // Wait for both tasks
    tokio::select! {
        _ = api_handle => tracing::error!("API server stopped"),
        _ = blob_handle => tracing::error!("Blob parser stopped"),
    }

    Ok(())
}
