use axum::{
    extract::Query,
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

#[derive(Serialize, Deserialize, Debug)]
pub struct UnknownSenderStat {
    pub from_address: String,
    pub tx_count: i64,
    pub total_blobs: i64,
    pub last_seen: String,
}

#[derive(Deserialize, Debug)]
pub struct UnknownTopQuery {
    pub hours: Option<i64>,
    pub limit: Option<i64>,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct RWAToken {
    pub id: uuid::Uuid,
    pub symbol: String,
    pub name: String,
    pub contract_addresses: serde_json::Value,
    pub decimals: i32,
    pub coingecko_id: Option<String>,
    pub price_usd: Option<f64>,
    pub market_cap_usd: Option<f64>,
    pub volume_24h_usd: Option<f64>,
    pub updated_at: Option<String>,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct ETHLiquiditySnapshot {
    pub category: String,
    pub balance_eth: f64,
    pub balance_usd: f64,
    pub num_addresses: i32,
    pub timestamp: String,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct WhaleWallet {
    pub id: uuid::Uuid,
    pub address: String,
    pub balance_eth: f64,
    pub balance_usd: f64,
    pub label: Option<String>,
    pub category: Option<String>,
    pub is_verified: bool,
    pub last_updated: String,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct WhaleActivity {
    pub tx_hash: String,
    pub from_addr: String,
    pub to_addr: String,
    pub amount_eth: f64,
    pub tx_type: String,
    pub timestamp: String,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct OFACSanction {
    pub id: uuid::Uuid,
    pub address: String,
    pub label: Option<String>,
    pub source: String,
    pub severity: String,
    pub risk_tags: Vec<String>,
    pub added_at: String,
}
#[derive(Serialize, Deserialize, Debug)]
pub struct L1Cost {
    pub block_number: i64,
    pub avg_gwei_per_gas: f64,
    pub avg_usd_per_tx: f64,
    pub avg_usd_per_swap: f64,
    pub timestamp: String,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct SecurityMetric {
    pub chain_name: String,
    pub validator_count: i32,
    pub staking_ratio: Option<f64>,
    pub avg_stake_eth: Option<f64>,
    pub sequencer_count: Option<i32>,
    pub timestamp: String,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct AIInsight {
    pub id: uuid::Uuid,
    pub insight_type: String,
    pub title: String,
    pub body: String,
    pub confidence_score: Option<f64>,
    pub generated_at: String,
}

#[derive(Deserialize, Debug)]
pub struct AIInsightQuery {
    pub insight_type: Option<String>,
    pub limit: Option<i64>,
}

#[derive(Deserialize, Debug)]
pub struct L1CostQuery {
...

    pub days: Option<i64>,
}

#[derive(Deserialize, Debug)]
pub struct OFACCheckQuery {
    pub address: String,
}

#[derive(Deserialize, Debug)]
pub struct OFACReportRequest {
    pub address: String,
    pub label: String,
    pub risk_tags: Vec<String>,
}

#[derive(Deserialize, Debug)]
pub struct WhaleQuery {
    pub limit: Option<i64>,
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

// GET /api/blobs/unknown-top?hours=24&limit=20
async fn unknown_top_handler(
    State(pool): State<PgPool>,
    Query(params): Query<UnknownTopQuery>,
) -> Result<Json<Vec<UnknownSenderStat>>, StatusCode> {
    let hours = params.hours.unwrap_or(24).clamp(1, 24 * 30);
    let limit = params.limit.unwrap_or(20).clamp(1, 200);

    let rows: Vec<(String, i64, i64, String)> = sqlx::query_as(
        "SELECT
            from_address,
            COUNT(*)::bigint AS tx_count,
            COALESCE(SUM(num_blobs), 0)::bigint AS total_blobs,
            MAX(created_at)::text AS last_seen
         FROM blob_transactions
         WHERE rollup = 'UNKNOWN'
           AND created_at > NOW() - INTERVAL '1 hour' * $1
         GROUP BY from_address
         ORDER BY total_blobs DESC, tx_count DESC
         LIMIT $2"
    )
    .bind(hours)
    .bind(limit)
    .fetch_all(&pool)
    .await
    .map_err(|e| {
        error!("unknown_top_handler error: {:?}", e);
        StatusCode::INTERNAL_SERVER_ERROR
    })?;

    let stats = rows
        .into_iter()
        .map(|(from_address, tx_count, total_blobs, last_seen)| UnknownSenderStat {
            from_address,
            tx_count,
            total_blobs,
            last_seen,
        })
        .collect();

    Ok(Json(stats))
}

// GET /api/rwa/tokens
async fn rwa_tokens_handler(State(pool): State<PgPool>) -> Result<Json<Vec<RWAToken>>, StatusCode> {
    let rows: Vec<(uuid::Uuid, String, String, serde_json::Value, i32, Option<String>, Option<f64>, Option<f64>, Option<f64>, Option<String>)> = sqlx::query_as(
        r#"
        SELECT 
            t.id, t.symbol, t.name, t.contract_addresses, t.decimals, t.coingecko_id,
            p.price_usd::FLOAT8, p.market_cap_usd::FLOAT8, p.volume_24h_usd::FLOAT8, p.timestamp::text as updated_at
        FROM rwa_tokens t
        LEFT JOIN (
            SELECT DISTINCT ON (rwa_token_id) *
            FROM rwa_token_prices
            ORDER BY rwa_token_id, timestamp DESC
        ) p ON t.id = p.rwa_token_id
        ORDER BY p.market_cap_usd DESC NULLS LAST
        "#
    )
    .fetch_all(&pool)
    .await
    .map_err(|e| {
        error!("rwa_tokens_handler error: {:?}", e);
        StatusCode::INTERNAL_SERVER_ERROR
    })?;

    let tokens = rows
        .into_iter()
        .map(|row| RWAToken {
            id: row.0,
            symbol: row.1,
            name: row.2,
            contract_addresses: row.3,
            decimals: row.4,
            coingecko_id: row.5,
            price_usd: row.6,
            market_cap_usd: row.7,
            volume_24h_usd: row.8,
            updated_at: row.9,
        })
        .collect();

    Ok(Json(tokens))
}

// GET /api/eth-distribution
async fn eth_distribution_handler(State(pool): State<PgPool>) -> Result<Json<Vec<ETHLiquiditySnapshot>>, StatusCode> {
    let rows: Vec<(String, f64, f64, i32, Option<String>)> = sqlx::query_as(
        r#"
        SELECT DISTINCT ON (category) 
            category, balance_eth::FLOAT8, balance_usd::FLOAT8, num_addresses, timestamp::text
        FROM eth_liquidity_snapshot
        ORDER BY category, timestamp DESC
        "#
    )
    .fetch_all(&pool)
    .await
    .map_err(|e| {
        error!("eth_distribution_handler error: {:?}", e);
        StatusCode::INTERNAL_SERVER_ERROR
    })?;

    let snapshots = rows
        .into_iter()
        .map(|row| ETHLiquiditySnapshot {
            category: row.0,
            balance_eth: row.1,
            balance_usd: row.2,
            num_addresses: row.3,
            timestamp: row.4.unwrap_or_default(),
        })
        .collect();

    Ok(Json(snapshots))
}

// GET /api/whale-watch
async fn whale_watch_handler(
    State(pool): State<PgPool>,
    Query(params): Query<WhaleQuery>,
) -> Result<Json<Vec<WhaleWallet>>, StatusCode> {
    let limit = params.limit.unwrap_or(100).clamp(1, 1000);

    let rows: Vec<(uuid::Uuid, String, f64, f64, Option<String>, Option<String>, bool, String)> = sqlx::query_as(
        r#"
        SELECT 
            id, address, balance_eth::FLOAT8, balance_usd::FLOAT8, 
            label, category, is_verified, last_updated::text
        FROM whale_wallets
        ORDER BY balance_eth DESC
        LIMIT $1
        "#
    )
    .bind(limit)
    .fetch_all(&pool)
    .await
    .map_err(|e| {
        error!("whale_watch_handler error: {:?}", e);
        StatusCode::INTERNAL_SERVER_ERROR
    })?;

    let whales = rows
        .into_iter()
        .map(|row| WhaleWallet {
            id: row.0,
            address: row.1,
            balance_eth: row.2,
            balance_usd: row.3,
            label: row.4,
            category: row.5,
            is_verified: row.6,
            last_updated: row.7,
        })
        .collect();

    Ok(Json(whales))
}

// GET /api/ofac/list
async fn ofac_list_handler(State(pool): State<PgPool>) -> Result<Json<Vec<OFACSanction>>, StatusCode> {
    let rows: Vec<(uuid::Uuid, String, Option<String>, String, String, Vec<String>, String)> = sqlx::query_as(
        r#"
        SELECT id, address, label, source, severity, risk_tags, added_at::text
        FROM ofac_sanctions_list
        ORDER BY added_at DESC
        "#
    )
    .fetch_all(&pool)
    .await
    .map_err(|e| {
        error!("ofac_list_handler error: {:?}", e);
        StatusCode::INTERNAL_SERVER_ERROR
    })?;

    let sanctions = rows
        .into_iter()
        .map(|row| OFACSanction {
            id: row.0,
            address: row.1,
            label: row.2,
            source: row.3,
            severity: row.4,
            risk_tags: row.5,
            added_at: row.6,
        })
        .collect();

    Ok(Json(sanctions))
}

// GET /api/ofac/check?address=0x...
async fn ofac_check_handler(
    State(pool): State<PgPool>,
    Query(params): Query<OFACCheckQuery>,
) -> Result<Json<Option<OFACSanction>>, StatusCode> {
    let row: Option<(uuid::Uuid, String, Option<String>, String, String, Vec<String>, String)> = sqlx::query_as(
        r#"
        SELECT id, address, label, source, severity, risk_tags, added_at::text
        FROM ofac_sanctions_list
        WHERE address = $1
        "#
    )
    .bind(&params.address)
    .fetch_optional(&pool)
    .await
    .map_err(|e| {
        error!("ofac_check_handler error: {:?}", e);
        StatusCode::INTERNAL_SERVER_ERROR
    })?;

    let sanction = row.map(|r| OFACSanction {
        id: r.0,
        address: r.1,
        label: r.2,
        source: r.3,
        severity: r.4,
        risk_tags: r.5,
        added_at: r.6,
    });

    Ok(Json(sanction))
}

// POST /api/ofac/report
async fn ofac_report_handler(
    State(pool): State<PgPool>,
    Json(payload): Json<OFACReportRequest>,
) -> Result<StatusCode, StatusCode> {
    sqlx::query(
        "INSERT INTO ofac_sanctions_list (address, label, source, risk_tags) 
         VALUES ($1, $2, 'community', $3) 
         ON CONFLICT (address) DO UPDATE SET community_votes = ofac_sanctions_list.community_votes + 1"
    )
    .bind(&payload.address)
    .bind(&payload.label)
    .bind(&payload.risk_tags)
    .execute(&pool)
    .await
    .map_err(|e| {
        error!("ofac_report_handler error: {:?}", e);
        StatusCode::INTERNAL_SERVER_ERROR
    })?;

    Ok(StatusCode::CREATED)
}

// GET /api/l1-costs?days=30
async fn l1_costs_handler(
    State(pool): State<PgPool>,
    Query(params): Query<L1CostQuery>,
) -> Result<Json<Vec<L1Cost>>, StatusCode> {
    let days = params.days.unwrap_or(30).clamp(1, 365);

    let rows: Vec<(i64, f64, f64, f64, String)> = sqlx::query_as(
        r#"
        SELECT block_number, avg_gwei_per_gas::FLOAT8, avg_usd_per_tx::FLOAT8, avg_usd_per_swap::FLOAT8, timestamp::text
        FROM l1_transaction_costs
        WHERE timestamp > NOW() - INTERVAL '1 day' * $1
        ORDER BY timestamp ASC
        "#
    )
    .bind(days)
    .fetch_all(&pool)
    .await
    .map_err(|e| {
        error!("l1_costs_handler error: {:?}", e);
        StatusCode::INTERNAL_SERVER_ERROR
    })?;

    let costs = rows
        .into_iter()
        .map(|row| L1Cost {
            block_number: row.0,
            avg_gwei_per_gas: row.1,
            avg_usd_per_tx: row.2,
            avg_usd_per_swap: row.3,
            timestamp: row.4,
        })
        .collect();

    Ok(Json(costs))
}

// GET /api/security-comparison
async fn security_comparison_handler(State(pool): State<PgPool>) -> Result<Json<Vec<SecurityMetric>>, StatusCode> {
    let rows: Vec<(String, i32, Option<f64>, Option<f64>, Option<i32>, String)> = sqlx::query_as(
        r#"
        SELECT chain_name, validator_count, staking_ratio::FLOAT8, avg_stake_eth::FLOAT8, sequencer_count, timestamp::text
        FROM chain_security_metrics
        ORDER BY validator_count DESC
        "#
    )
    .fetch_all(&pool)
    .await
    .map_err(|e| {
        error!("security_comparison_handler error: {:?}", e);
        StatusCode::INTERNAL_SERVER_ERROR
    })?;

    let metrics = rows
        .into_iter()
        .map(|row| SecurityMetric {
            chain_name: row.0,
            validator_count: row.1,
            staking_ratio: row.2,
            avg_stake_eth: row.3,
            sequencer_count: row.4,
            timestamp: row.5,
        })
        .collect();

    Ok(Json(metrics))
}

// GET /api/ai-insights
async fn ai_insights_handler(
    State(pool): State<PgPool>,
    Query(params): Query<AIInsightQuery>,
) -> Result<Json<Vec<AIInsight>>, StatusCode> {
    let limit = params.limit.unwrap_or(10).clamp(1, 100);

    let rows: Vec<(uuid::Uuid, String, String, String, Option<f64>, String)> = if let Some(t) = params.insight_type {
        sqlx::query_as(
            r#"
            SELECT id, insight_type, title, body, confidence_score::FLOAT8, generated_at::text
            FROM ai_insights
            WHERE insight_type = $1
            ORDER BY generated_at DESC
            LIMIT $2
            "#
        )
        .bind(t)
        .bind(limit)
        .fetch_all(&pool)
        .await
    } else {
        sqlx::query_as(
            r#"
            SELECT id, insight_type, title, body, confidence_score::FLOAT8, generated_at::text
            FROM ai_insights
            ORDER BY generated_at DESC
            LIMIT $1
            "#
        )
        .bind(limit)
        .fetch_all(&pool)
        .await
    }
    .map_err(|e| {
        error!("ai_insights_handler error: {:?}", e);
        StatusCode::INTERNAL_SERVER_ERROR
    })?;

    let insights = rows
        .into_iter()
        .map(|row| AIInsight {
            id: row.0,
            insight_type: row.1,
            title: row.2,
            body: row.3,
            confidence_score: row.4,
            generated_at: row.5,
        })
        .collect();

    Ok(Json(insights))
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
        .route("/api/blobs/unknown-top", get(unknown_top_handler))
        .route("/api/activity/hourly", get(activity_hourly_handler))
        .route("/api/fees/trend", get(fee_trend_handler))
        .route("/api/rwa/tokens", get(rwa_tokens_handler))
        .route("/api/eth-distribution", get(eth_distribution_handler))
        .route("/api/whale-watch", get(whale_watch_handler))
        .route("/api/ofac/list", get(ofac_list_handler))
        .route("/api/ofac/check", get(ofac_check_handler))
        .route("/api/ofac/report", axum::routing::post(ofac_report_handler))
        .route("/api/l1-costs", get(l1_costs_handler))
        .route("/api/security-comparison", get(security_comparison_handler))
        .route("/api/ai-insights", get(ai_insights_handler))
        .route("/health", get(health_handler))
        .with_state(pool)
}
