mod api;

use blob_lens::{db, services::{alerts, blob_parser}};
use dotenvy::dotenv;
use std::env;
use axum::Router;
use std::net::SocketAddr;
use tower_http::trace::TraceLayer;

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

    // Start blob listener with auto-retry so the HTTP server stays alive
    // even when the Alchemy WebSocket connection drops or errors.
    let pool_for_blobs = pool.clone();
    let blob_handle = tokio::spawn(async move {
        let mut attempt: u32 = 0;
        loop {
            attempt += 1;
            tracing::info!("Starting blob transaction listener (attempt {})...", attempt);
            match blob_parser::fetch_blob(&pool_for_blobs).await {
                Ok(_)  => tracing::warn!("Blob parser exited cleanly; reconnecting in 30s"),
                Err(e) => tracing::error!("Blob parser error: {}; reconnecting in 30s", e),
            }
            tokio::time::sleep(std::time::Duration::from_secs(30)).await;
        }
    });

    // Start persistent alert worker
    let pool_for_alerts = pool.clone();
    let alert_handle = tokio::spawn(async move {
        alerts::run_alert_worker(pool_for_alerts).await;
    });

    // Only the API server exiting should bring down the process.
    // The blob handle is an infinite retry loop and never resolves.
    tokio::select! {
        _ = api_handle   => tracing::error!("API server stopped unexpectedly"),
        _ = blob_handle  => tracing::error!("Blob parser task stopped unexpectedly"),
        _ = alert_handle => tracing::error!("Alert worker task stopped unexpectedly"),
    }

    Ok(())
}
