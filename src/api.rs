use axum::{
    extract::State,
    http::StatusCode,
    routing::get,
    Json, Router,
};
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use tracing::error;

#[derive(Serialize, Deserialize, Debug)]
pub struct StatsResponse {
    pub total_blobs: i64,
    pub total_transactions: i64,
    pub avg_fee_per_blob_gas: f64,
    pub network: String,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct RollupStat {
    pub rollup: String,
    pub count: i64,
    pub total_blobs: i64,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct RecentBlob {
    pub tx_hash: String,
    pub block_number: i64,
    pub num_blobs: i32,
    pub max_fee_per_blob_gas: i64,
    pub rollup: String,
    pub created_at: String,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct ActivityHourly {
    pub hour: String,
    pub count: i64,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct FeeTrend {
    pub timestamp: String,
    pub min_fee: i64,
    pub max_fee: i64,
    pub avg_fee: f64,
}

// GET /api/stats
async fn stats_handler(State(pool): State<PgPool>) -> Result<Json<StatsResponse>, StatusCode> {
    let row: (i64, i64, Option<f64>) = sqlx::query_as(
        "SELECT COUNT(*), COALESCE(SUM(num_blobs), 0), COALESCE(AVG(CAST(max_fee_per_blob_gas AS BIGINT))::FLOAT8, 0.0) FROM blob_transactions"
    )
    .fetch_one(&pool)
    .await
    .map_err(|e| {
        error!("stats_handler error: {:?}", e);
        StatusCode::INTERNAL_SERVER_ERROR
    })?;

    Ok(Json(StatsResponse {
        total_transactions: row.0,
        total_blobs: row.1,
        avg_fee_per_blob_gas: row.2.unwrap_or(0.0),
        network: "Ethereum Mainnet".to_string(),
    }))
}

// GET /api/blobs/by-rollup
async fn rollup_stats_handler(State(pool): State<PgPool>) -> Result<Json<Vec<RollupStat>>, StatusCode> {
    let rows: Vec<(String, i64, i64)> = sqlx::query_as(
        "SELECT rollup, COUNT(*), COALESCE(SUM(num_blobs), 0) 
         FROM blob_transactions 
         GROUP BY rollup 
         ORDER BY COUNT(*) DESC"
    )
    .fetch_all(&pool)
    .await
    .map_err(|e| {
        error!("rollup_stats_handler error: {:?}", e);
        StatusCode::INTERNAL_SERVER_ERROR
    })?;

    let stats = rows
        .into_iter()
        .map(|(rollup, count, total_blobs)| RollupStat {
            rollup,
            count,
            total_blobs,
        })
        .collect();

    Ok(Json(stats))
}

// GET /api/blobs/recent?limit=20
async fn recent_blobs_handler(State(pool): State<PgPool>) -> Result<Json<Vec<RecentBlob>>, StatusCode> {
    let rows: Vec<(String, i64, i32, i64, String, String)> = sqlx::query_as(
        "SELECT 
            tx_hash, 
            block_number, 
            num_blobs, 
            CAST(max_fee_per_blob_gas AS BIGINT), 
            rollup,
            created_at::text
         FROM blob_transactions 
         ORDER BY created_at DESC 
         LIMIT 50"
    )
    .fetch_all(&pool)
    .await
    .map_err(|e| {
        error!("recent_blobs_handler error: {:?}", e);
        StatusCode::INTERNAL_SERVER_ERROR
    })?;

    let blobs = rows
        .into_iter()
        .map(|(tx_hash, block_number, num_blobs, max_fee_per_blob_gas, rollup, created_at)| {
            RecentBlob {
                tx_hash,
                block_number,
                num_blobs,
                max_fee_per_blob_gas,
                rollup,
                created_at,
            }
        })
        .collect();

    Ok(Json(blobs))
}

// GET /api/activity/hourly
async fn activity_hourly_handler(State(pool): State<PgPool>) -> Result<Json<Vec<ActivityHourly>>, StatusCode> {
    let rows: Vec<(String, i64)> = sqlx::query_as(
        "SELECT 
            DATE_TRUNC('hour', created_at)::text as hour,
            COUNT(*) as count
         FROM blob_transactions 
         WHERE created_at > NOW() - INTERVAL '24 hours'
         GROUP BY DATE_TRUNC('hour', created_at)
         ORDER BY DATE_TRUNC('hour', created_at) ASC"
    )
    .fetch_all(&pool)
    .await
    .map_err(|e| {
        error!("activity_hourly_handler error: {:?}", e);
        StatusCode::INTERNAL_SERVER_ERROR
    })?;

    let activity = rows
        .into_iter()
        .map(|(hour, count)| ActivityHourly { hour, count })
        .collect();

    Ok(Json(activity))
}

// GET /api/fees/trend
async fn fee_trend_handler(State(pool): State<PgPool>) -> Result<Json<Vec<FeeTrend>>, StatusCode> {
    let rows: Vec<(String, i64, i64, Option<f64>)> = sqlx::query_as(
        "SELECT 
            DATE_TRUNC('hour', created_at)::text as hour,
            MIN(CAST(max_fee_per_blob_gas AS BIGINT)) as min_fee,
            MAX(CAST(max_fee_per_blob_gas AS BIGINT)) as max_fee,
            COALESCE(AVG(CAST(max_fee_per_blob_gas AS BIGINT))::FLOAT8, 0.0) as avg_fee
         FROM blob_transactions 
         WHERE created_at > NOW() - INTERVAL '7 days'
         GROUP BY DATE_TRUNC('hour', created_at)
         ORDER BY DATE_TRUNC('hour', created_at) ASC"
    )
    .fetch_all(&pool)
    .await
    .map_err(|e| {
        error!("fee_trend_handler error: {:?}", e);
        StatusCode::INTERNAL_SERVER_ERROR
    })?;

    let trends = rows
        .into_iter()
        .map(|(timestamp, min_fee, max_fee, avg_fee)| FeeTrend {
            timestamp,
            min_fee,
            max_fee,
            avg_fee: avg_fee.unwrap_or(0.0),
        })
        .collect();

    Ok(Json(trends))
}

// GET /health
async fn health_handler() -> Json<serde_json::Value> {
    Json(serde_json::json!({ "status": "ok" }))
}

pub fn api_router(pool: PgPool) -> Router {
    Router::new()
        .route("/api/stats", get(stats_handler))
        .route("/api/blobs/by-rollup", get(rollup_stats_handler))
        .route("/api/blobs/recent", get(recent_blobs_handler))
        .route("/api/activity/hourly", get(activity_hourly_handler))
        .route("/api/fees/trend", get(fee_trend_handler))
        .route("/health", get(health_handler))
        .with_state(pool)
}
