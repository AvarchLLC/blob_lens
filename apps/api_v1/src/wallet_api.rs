use axum::{
    extract::{Path, Query, State},
    http::{HeaderMap, StatusCode},
    routing::{get, post},
    Json, Router,
};
use clickhouse::Client as ChClient;
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use std::sync::Arc;
use tracing::error;

const DATA_FROM_BLOCK: u64 = 19_426_587; // Dencun

// ── Shared state ─────────────────────────────────────────────────────────────

#[derive(Clone)]
pub struct WalletState {
    pub ch:       ChClient,
    pub pool:     PgPool,
    pub reth_rpc: String,
}

fn valid_eth_address(addr: &str) -> bool {
    addr.len() == 42
        && addr.starts_with("0x")
        && addr[2..].chars().all(|c| c.is_ascii_hexdigit())
}

// ── Row types for ClickHouse deserialization ──────────────────────────────────

#[derive(clickhouse::Row, Deserialize)]
struct TxStatsRow {
    tx_sent:     u64,
    tx_received: u64,
    tx_total:    u64,
    first_seen:  String,
    last_seen:   String,
}

#[derive(clickhouse::Row, Deserialize)]
struct GasRow {
    gas_spent_wei: String,
}

#[derive(clickhouse::Row, Deserialize)]
struct TokenCountRow {
    token_count: u64,
}

#[derive(clickhouse::Row, Deserialize)]
struct BlobStatsRow {
    blob_tx_count: u64,
    top_rollups:   Vec<String>,
    rollup_count:  u64,
}

#[derive(clickhouse::Row, Deserialize)]
struct TxRow {
    block_number:       u64,
    block_timestamp:    String,
    tx_hash:            String,
    from_address:       String,
    to_address:         String,
    value:              String,
    tx_type:            u8,
    rollup:             String,
    success:            u8,
    gas_used:           u64,
    effective_gas_price: u64,
}

#[derive(clickhouse::Row, Deserialize)]
struct TokenFlowRow {
    token_address:   String,
    transfers_in:    u64,
    transfers_out:   u64,
    total_transfers: u64,
    last_transfer:   String,
}

#[derive(clickhouse::Row, Deserialize)]
struct RollupRow {
    rollup:      String,
    tx_count:    u64,
    total_blobs: u64,
    first_seen:  String,
    last_seen:   String,
}

// ── ETH balance via Reth RPC ──────────────────────────────────────────────────

async fn fetch_eth_balance(rpc: &str, addr: &str) -> String {
    let body = serde_json::json!({
        "jsonrpc": "2.0",
        "method": "eth_getBalance",
        "params": [addr, "latest"],
        "id": 1
    });
    match reqwest::Client::new().post(rpc).json(&body).send().await {
        Ok(resp) => {
            if let Ok(json) = resp.json::<serde_json::Value>().await {
                let hex = json["result"].as_str().unwrap_or("0x0");
                let wei = u128::from_str_radix(hex.trim_start_matches("0x"), 16).unwrap_or(0);
                format!("{:.6}", wei as f64 / 1e18)
            } else {
                "0.000000".to_string()
            }
        }
        Err(_) => "0.000000".to_string(),
    }
}

// ── GET /api/wallet/:address ──────────────────────────────────────────────────

#[derive(Serialize)]
pub struct WalletSummary {
    address:                 String,
    eth_balance:             String,
    tx_total:                u64,
    tx_sent:                 u64,
    tx_received:             u64,
    gas_spent_wei:           String,
    gas_spent_eth:           String,
    first_seen:              Option<String>,
    last_seen:               Option<String>,
    erc20_tokens_interacted: u64,
    blob_tx_count:           u64,
    top_rollup:              Option<String>,
    rollup_count:            u64,
    ofac_flagged:            bool,
    whale_flagged:           bool,
    data_from_block:         u64,
}

async fn wallet_summary(
    State(state): State<Arc<WalletState>>,
    Path(address): Path<String>,
) -> Result<Json<WalletSummary>, StatusCode> {
    let addr = address.to_lowercase();
    if !valid_eth_address(&addr) {
        return Err(StatusCode::BAD_REQUEST);
    }

    let (tx_res, gas_res, token_res, blob_res, eth_bal, ofac_res, whale_res) = tokio::join!(
        state.ch.query(
            "SELECT
               countIf(from_address = {addr:String}) AS tx_sent,
               countIf(to_address   = {addr:String}) AS tx_received,
               count()                               AS tx_total,
               toString(min(block_timestamp))        AS first_seen,
               toString(max(block_timestamp))        AS last_seen
             FROM blob_lens.wallet_txs_by_addr FINAL
             WHERE addr = {addr:String} AND is_deleted = 0"
        ).param("addr", addr.as_str()).fetch_optional::<TxStatsRow>(),

        state.ch.query(
            "SELECT toString(sum(toUInt256(r.gas_used) * toUInt256(r.effective_gas_price))) AS gas_spent_wei
             FROM blob_lens.wallet_txs_by_addr w FINAL
             JOIN ethereum.receipts r FINAL ON w.tx_hash = r.tx_hash AND r.is_deleted = 0
             WHERE w.addr = {addr:String} AND w.is_deleted = 0 AND w.from_address = {addr:String}"
        ).param("addr", addr.as_str()).fetch_optional::<GasRow>(),

        state.ch.query(
            "SELECT uniqExact(token_address) AS token_count
             FROM ethereum.erc20_transfers
             WHERE from_address = {addr:String} OR to_address = {addr:String}"
        ).param("addr", addr.as_str()).fetch_optional::<TokenCountRow>(),

        state.ch.query(
            "SELECT count()              AS blob_tx_count,
                    topK(1)(rollup)    AS top_rollups,
                    uniqExact(rollup)  AS rollup_count
             FROM blob_lens.blob_transactions FINAL
             WHERE is_canonical = 1 AND from_address = {addr:String}"
        ).param("addr", addr.as_str()).fetch_optional::<BlobStatsRow>(),

        fetch_eth_balance(&state.reth_rpc, &addr),

        sqlx::query_scalar::<_, bool>(
            "SELECT EXISTS(SELECT 1 FROM ofac_sanctions_list WHERE lower(address) = $1)"
        ).bind(&addr).fetch_one(&state.pool),

        sqlx::query_scalar::<_, bool>(
            "SELECT EXISTS(SELECT 1 FROM whale_wallets WHERE lower(address) = $1)"
        ).bind(&addr).fetch_one(&state.pool),
    );

    let tx = tx_res.map_err(|e| { error!("wallet tx query: {e}"); StatusCode::INTERNAL_SERVER_ERROR })?
        .unwrap_or(TxStatsRow { tx_sent: 0, tx_received: 0, tx_total: 0, first_seen: String::new(), last_seen: String::new() });

    let gas_wei = gas_res.map_err(|e| { error!("wallet gas query: {e}"); StatusCode::INTERNAL_SERVER_ERROR })?
        .map(|r| r.gas_spent_wei).unwrap_or_else(|| "0".into());
    let gas_eth = gas_wei.parse::<u128>()
        .map(|w| format!("{:.6}", w as f64 / 1e18))
        .unwrap_or_else(|_| "0.000000".into());

    let token_count = token_res.map_err(|e| { error!("wallet token query: {e}"); StatusCode::INTERNAL_SERVER_ERROR })?
        .map(|r| r.token_count).unwrap_or(0);

    let blob = blob_res.map_err(|e| { error!("wallet blob query: {e}"); StatusCode::INTERNAL_SERVER_ERROR })?
        .unwrap_or(BlobStatsRow { blob_tx_count: 0, top_rollups: vec![], rollup_count: 0 });

    let ofac  = ofac_res.map_err(|e|  { error!("ofac check: {e}");  StatusCode::INTERNAL_SERVER_ERROR })?;
    let whale = whale_res.map_err(|e| { error!("whale check: {e}"); StatusCode::INTERNAL_SERVER_ERROR })?;

    Ok(Json(WalletSummary {
        address:                 addr,
        eth_balance:             eth_bal,
        tx_total:                tx.tx_total,
        tx_sent:                 tx.tx_sent,
        tx_received:             tx.tx_received,
        gas_spent_wei:           gas_wei,
        gas_spent_eth:           gas_eth,
        first_seen:              if tx.first_seen.is_empty() { None } else { Some(tx.first_seen) },
        last_seen:               if tx.last_seen.is_empty() { None } else { Some(tx.last_seen) },
        erc20_tokens_interacted: token_count,
        blob_tx_count:           blob.blob_tx_count,
        top_rollup:              blob.top_rollups.into_iter().find(|s| !s.is_empty()),
        rollup_count:            blob.rollup_count,
        ofac_flagged:            ofac,
        whale_flagged:           whale,
        data_from_block:         DATA_FROM_BLOCK,
    }))
}

// ── GET /api/wallet/:address/txs?page=1&limit=25 ─────────────────────────────

#[derive(Deserialize)]
pub struct TxPageQuery {
    pub page:  Option<u32>,
    pub limit: Option<u32>,
}

#[derive(Serialize)]
pub struct TxEntry {
    block_number:        u64,
    block_timestamp:     String,
    tx_hash:             String,
    from_address:        String,
    to_address:          String,
    value:               String,
    tx_type:             u8,
    direction:           &'static str,
    rollup:              String,
    success:             bool,
    gas_used:            u64,
    effective_gas_price: u64,
}

#[derive(Serialize)]
pub struct TxPage {
    address: String,
    page:    u32,
    limit:   u32,
    txs:     Vec<TxEntry>,
}

async fn wallet_txs(
    State(state): State<Arc<WalletState>>,
    Path(address): Path<String>,
    Query(q): Query<TxPageQuery>,
) -> Result<Json<TxPage>, StatusCode> {
    let addr  = address.to_lowercase();
    if !valid_eth_address(&addr) { return Err(StatusCode::BAD_REQUEST); }
    let limit  = q.limit.unwrap_or(25).clamp(1, 100) as u64;
    let page   = q.page.unwrap_or(1).max(1) as u64;
    let offset = (page - 1) * limit;

    let rows = state.ch.query(
        "SELECT
           w.block_number,
           toString(w.block_timestamp)   AS block_timestamp,
           w.tx_hash,
           w.from_address,
           w.to_address,
           w.value,
           w.tx_type,
           w.rollup,
           if(r.success IS NULL, 1, toUInt8(r.success))                AS success,
           if(r.gas_used IS NULL, 0, r.gas_used)                       AS gas_used,
           if(r.effective_gas_price IS NULL, 0, r.effective_gas_price) AS effective_gas_price
         FROM blob_lens.wallet_txs_by_addr w FINAL
         LEFT JOIN ethereum.receipts r FINAL ON w.tx_hash = r.tx_hash AND r.is_deleted = 0
         WHERE w.addr = {addr:String} AND w.is_deleted = 0
         ORDER BY w.block_number DESC
         LIMIT {limit:UInt64} OFFSET {offset:UInt64}"
    )
    .param("addr",   addr.as_str())
    .param("limit",  limit)
    .param("offset", offset)
    .fetch_all::<TxRow>()
    .await
    .map_err(|e| { error!("wallet txs query: {e}"); StatusCode::INTERNAL_SERVER_ERROR })?;

    let txs = rows.into_iter().map(|r| TxEntry {
        direction: if r.from_address == addr { "out" } else { "in" },
        block_number:        r.block_number,
        block_timestamp:     r.block_timestamp,
        tx_hash:             r.tx_hash,
        from_address:        r.from_address,
        to_address:          r.to_address,
        value:               r.value,
        tx_type:             r.tx_type,
        rollup:              r.rollup,
        success:             r.success != 0,
        gas_used:            r.gas_used,
        effective_gas_price: r.effective_gas_price,
    }).collect();

    Ok(Json(TxPage { address: addr, page: page as u32, limit: limit as u32, txs }))
}

// ── GET /api/wallet/:address/tokens ──────────────────────────────────────────

#[derive(Serialize)]
pub struct TokenFlow {
    token_address:   String,
    transfers_in:    u64,
    transfers_out:   u64,
    total_transfers: u64,
    last_transfer:   String,
}

async fn wallet_tokens(
    State(state): State<Arc<WalletState>>,
    Path(address): Path<String>,
) -> Result<Json<Vec<TokenFlow>>, StatusCode> {
    let addr = address.to_lowercase();
    if !valid_eth_address(&addr) { return Err(StatusCode::BAD_REQUEST); }

    let rows = state.ch.query(
        "SELECT
           token_address,
           countIf(to_address   = {addr:String}) AS transfers_in,
           countIf(from_address = {addr:String}) AS transfers_out,
           count()                               AS total_transfers,
           toString(max(block_timestamp))        AS last_transfer
         FROM ethereum.erc20_transfers
         WHERE from_address = {addr:String} OR to_address = {addr:String}
         GROUP BY token_address
         ORDER BY total_transfers DESC
         LIMIT 50"
    )
    .param("addr", addr.as_str())
    .fetch_all::<TokenFlowRow>()
    .await
    .map_err(|e| { error!("wallet tokens query: {e}"); StatusCode::INTERNAL_SERVER_ERROR })?;

    Ok(Json(rows.into_iter().map(|r| TokenFlow {
        token_address:   r.token_address,
        transfers_in:    r.transfers_in,
        transfers_out:   r.transfers_out,
        total_transfers: r.total_transfers,
        last_transfer:   r.last_transfer,
    }).collect()))
}

// ── GET /api/wallet/:address/rollups ─────────────────────────────────────────

#[derive(Serialize)]
pub struct RollupActivity {
    rollup:      String,
    tx_count:    u64,
    total_blobs: u64,
    first_seen:  String,
    last_seen:   String,
}

async fn wallet_rollups(
    State(state): State<Arc<WalletState>>,
    Path(address): Path<String>,
) -> Result<Json<Vec<RollupActivity>>, StatusCode> {
    let addr = address.to_lowercase();
    if !valid_eth_address(&addr) { return Err(StatusCode::BAD_REQUEST); }

    let rows = state.ch.query(
        "SELECT
           rollup,
           count()                        AS tx_count,
           sum(num_blobs)                 AS total_blobs,
           toString(min(block_timestamp)) AS first_seen,
           toString(max(block_timestamp)) AS last_seen
         FROM blob_lens.blob_transactions FINAL
         WHERE is_canonical = 1 AND from_address = {addr:String}
         GROUP BY 1
         ORDER BY tx_count DESC"
    )
    .param("addr", addr.as_str())
    .fetch_all::<RollupRow>()
    .await
    .map_err(|e| { error!("wallet rollups query: {e}"); StatusCode::INTERNAL_SERVER_ERROR })?;

    Ok(Json(rows.into_iter().map(|r| RollupActivity {
        rollup:      r.rollup,
        tx_count:    r.tx_count,
        total_blobs: r.total_blobs,
        first_seen:  r.first_seen,
        last_seen:   r.last_seen,
    }).collect()))
}

// ── Admin: POST /api/wallet/admin/new-key ────────────────────────────────────

#[derive(serde::Deserialize)]
pub struct NewKeyRequest {
    pub tier:        Option<String>,
    pub daily_limit: Option<i32>,
    pub owner_email: Option<String>,
}

async fn admin_new_key(
    State(state): State<Arc<WalletState>>,
    headers: HeaderMap,
    Json(body): Json<NewKeyRequest>,
) -> Result<Json<serde_json::Value>, StatusCode> {
    let secret = headers
        .get("X-Admin-Secret")
        .and_then(|v| v.to_str().ok())
        .unwrap_or("");
    if !crate::api_auth::check_admin_secret(secret) {
        return Err(StatusCode::FORBIDDEN);
    }

    let tier        = body.tier.as_deref().unwrap_or("free");
    let daily_limit = body.daily_limit.unwrap_or(100);
    let email       = body.owner_email.as_deref();

    let result = crate::api_auth::create_key(&state.pool, tier, daily_limit, email)
        .await
        .map_err(|e| { error!("create_key error: {e}"); StatusCode::INTERNAL_SERVER_ERROR })?;

    Ok(Json(serde_json::json!({
        "raw_key":     result.raw_key,
        "key_prefix":  result.key_prefix,
        "tier":        result.tier,
        "daily_limit": result.daily_limit,
        "note": "Store raw_key now — it cannot be recovered after this response."
    })))
}

// ── Router ────────────────────────────────────────────────────────────────────

async fn wallet_ping() -> Json<serde_json::Value> {
    Json(serde_json::json!({ "status": "ok", "service": "wallet-api" }))
}

/// Public routes — no API key needed.
pub fn wallet_public_router(state: Arc<WalletState>) -> Router {
    Router::new()
        .route("/api/wallet/ping",          get(wallet_ping))
        .route("/api/wallet/admin/new-key", post(admin_new_key))
        .with_state(state)
}

/// Protected routes — API key required (middleware applied in main.rs).
pub fn wallet_protected_router(state: Arc<WalletState>) -> Router {
    Router::new()
        .route("/api/wallet/:address",         get(wallet_summary))
        .route("/api/wallet/:address/txs",     get(wallet_txs))
        .route("/api/wallet/:address/tokens",  get(wallet_tokens))
        .route("/api/wallet/:address/rollups", get(wallet_rollups))
        .with_state(state)
}
