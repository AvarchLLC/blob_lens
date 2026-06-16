mod api;
mod wallet_api;

use blob_lens::{db, services::{alerts, rwa_indexer, eth_distribution, whale_indexer, ofac_sync, l1_cost_tracker, security_metrics, ai_analyst}};
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

    // Initialize ClickHouse client for wallet API
    let ch_url   = env::var("CLICKHOUSE_URL").unwrap_or_else(|_| "http://100.76.225.2:8123".into());
    let ch_user  = env::var("CLICKHOUSE_USER").unwrap_or_else(|_| "blob_lens".into());
    let ch_pass  = env::var("CLICKHOUSE_PASSWORD").unwrap_or_else(|_| "changeme".into());
    let reth_rpc = env::var("RETH_RPC").unwrap_or_else(|_| "http://100.76.225.2:8545".into());
    let ch_client = clickhouse::Client::default()
        .with_url(&ch_url)
        .with_user(&ch_user)
        .with_password(&ch_pass);
    tracing::info!("✓ ClickHouse connected: {}", ch_url);

    // Clone pool for API server
    let pool_clone = pool.clone();

    // Start API server on port 8080
    let api_handle = tokio::spawn(async move {
        let wallet_state = wallet_api::WalletState {
            ch:       ch_client,
            pool:     pool_clone.clone(),
            reth_rpc,
        };
        let app = Router::new()
            .merge(wallet_api::wallet_router(wallet_state))
            .merge(api::api_router())
            .layer(TraceLayer::new_for_http());

        let addr = SocketAddr::from(([0, 0, 0, 0], 8080));
        tracing::info!("📊 API server listening on http://0.0.0.0:8080");

        let listener = tokio::net::TcpListener::bind(&addr).await.unwrap();
        axum::serve(listener, app).await.unwrap();
    });

    // Start persistent alert worker
    let pool_for_alerts = pool.clone();
    let alert_handle = tokio::spawn(async move {
        alerts::run_alert_worker(pool_for_alerts).await;
    });

    // Start RWA indexer
    let pool_for_rwa = pool.clone();
    let rwa_handle = tokio::spawn(async move {
        rwa_indexer::run_rwa_indexer(pool_for_rwa).await;
    });

    // Start ETH distribution indexer
    let pool_for_eth = pool.clone();
    let eth_handle = tokio::spawn(async move {
        eth_distribution::run_eth_distribution_indexer(pool_for_eth).await;
    });

    // Start Whale Watch indexer
    let pool_for_whales = pool.clone();
    let whale_handle = tokio::spawn(async move {
        whale_indexer::run_whale_indexer(pool_for_whales).await;
    });

    // Start OFAC sync
    let pool_for_ofac = pool.clone();
    let ofac_handle = tokio::spawn(async move {
        ofac_sync::run_ofac_sync(pool_for_ofac).await;
    });

    // Start L1 cost tracker
    let pool_for_l1 = pool.clone();
    let l1_handle = tokio::spawn(async move {
        l1_cost_tracker::run_l1_cost_tracker(pool_for_l1).await;
    });

    // Start security metrics indexer
    let pool_for_security = pool.clone();
    let security_handle = tokio::spawn(async move {
        security_metrics::run_security_metrics_indexer(pool_for_security).await;
    });

    // Start AI analyst
    let pool_for_ai = pool.clone();
    let ai_handle = tokio::spawn(async move {
        ai_analyst::run_ai_analyst(pool_for_ai).await;
    });

    // Only the API server exiting should bring down the process.
    tokio::select! {
        _ = api_handle   => tracing::error!("API server stopped unexpectedly"),
        _ = alert_handle => tracing::error!("Alert worker task stopped unexpectedly"),
        _ = rwa_handle   => tracing::error!("RWA indexer task stopped unexpectedly"),
        _ = eth_handle   => tracing::error!("ETH distribution indexer task stopped unexpectedly"),
        _ = whale_handle => tracing::error!("Whale Watch indexer task stopped unexpectedly"),
        _ = ofac_handle  => tracing::error!("OFAC sync task stopped unexpectedly"),
        _ = l1_handle    => tracing::error!("L1 cost tracker task stopped unexpectedly"),
        _ = security_handle => tracing::error!("Security metrics indexer task stopped unexpectedly"),
        _ = ai_handle       => tracing::error!("AI analyst task stopped unexpectedly"),
    }

    Ok(())
}
