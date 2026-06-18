use axum::{
    extract::{Path, Query, State},
    http::{HeaderMap, StatusCode},
    routing::{get, post},
    Json, Router,
};
use clickhouse::Client as ChClient;
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use std::sync::{Arc, OnceLock};
use std::time::{Duration, Instant};
use tokio::sync::Mutex;
use tracing::error;

// ── ETH price in-process cache (60s TTL, avoids hammering CoinGecko) ─────────

struct PriceCache {
    usd: f64,
    btc: f64,
    fetched_at: Option<Instant>,
}

static PRICE_CACHE: OnceLock<Mutex<PriceCache>> = OnceLock::new();

fn price_cache() -> &'static Mutex<PriceCache> {
    PRICE_CACHE.get_or_init(|| Mutex::new(PriceCache { usd: 0.0, btc: 0.0, fetched_at: None }))
}

async fn get_cached_eth_price() -> (f64, f64) {
    let mut cache = price_cache().lock().await;
    let stale = cache.fetched_at.map_or(true, |t| t.elapsed() > Duration::from_secs(60));
    if stale {
        let url = "https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd,btc";
        if let Ok(r) = reqwest::Client::new().get(url).header("User-Agent", "BlobLens/1.0").send().await {
            if let Ok(v) = r.json::<serde_json::Value>().await {
                cache.usd = v["ethereum"]["usd"].as_f64().unwrap_or(cache.usd);
                cache.btc = v["ethereum"]["btc"].as_f64().unwrap_or(cache.btc);
                cache.fetched_at = Some(Instant::now());
            }
        }
    }
    (cache.usd, cache.btc)
}

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

// Strip 0x — erc20_by_addr stores addresses without it
fn strip_0x(addr: &str) -> &str { addr.strip_prefix("0x").unwrap_or(addr) }

// Get latest block number for default range bounds
async fn latest_block_number(ch: &ChClient) -> u64 {
    #[derive(clickhouse::Row, Deserialize)]
    struct N { n: u64 }
    ch.query("SELECT max(block_number) AS n FROM ethereum.blocks")
        .fetch_one::<N>().await.map(|r| r.n).unwrap_or(25_000_000)
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
             FROM blob_lens.erc20_by_addr
             WHERE addr = {addr:String}"
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
         FROM blob_lens.erc20_by_addr
         WHERE addr = {addr:String}
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

// ── Etherscan-compatible query params ────────────────────────────────────────

#[derive(Deserialize)]
pub struct EsQuery {
    pub startblock: Option<u64>,
    pub endblock:   Option<u64>,
    pub page:       Option<u64>,
    pub offset:     Option<u64>,
    pub sort:       Option<String>,
}

impl EsQuery {
    fn start(&self)  -> u64 { self.startblock.unwrap_or(0) }
    fn end(&self)    -> u64 { self.endblock.unwrap_or(u64::MAX) }
    fn limit(&self)  -> u64 { self.offset.unwrap_or(10).clamp(1, 1000) }
    fn page(&self)   -> u64 { self.page.unwrap_or(1).max(1) }
    fn offset(&self) -> u64 { (self.page() - 1) * self.limit() }
    fn order(&self)  -> &str {
        if self.sort.as_deref() == Some("asc") { "ASC" } else { "DESC" }
    }
}

fn es_ok(result: serde_json::Value) -> Json<serde_json::Value> {
    Json(serde_json::json!({ "status": "1", "message": "OK", "result": result }))
}

fn es_empty() -> Json<serde_json::Value> {
    Json(serde_json::json!({ "status": "0", "message": "No transactions found", "result": [] }))
}

// ── GET /api/wallet/:address/normal-txs (Etherscan-compatible) ───────────────

#[derive(clickhouse::Row, Deserialize)]
struct NormalTxRow {
    block_number:    u64,
    block_timestamp: u64,
    tx_hash:         String,
    from_address:    String,
    to_address:      String,
    value:           String,
    tx_type:         u8,
    rollup:          String,
}

async fn wallet_normal_txs(
    State(state): State<Arc<WalletState>>,
    Path(address): Path<String>,
    Query(q): Query<EsQuery>,
) -> Result<Json<serde_json::Value>, StatusCode> {
    let addr = address.to_lowercase();
    if !valid_eth_address(&addr) { return Err(StatusCode::BAD_REQUEST); }

    let order  = q.order().to_string();
    let limit  = q.limit();
    let offset = q.offset();
    let start  = q.start();
    let end    = q.end();

    // No JOIN with ethereum.receipts — that table is ~55GB and causes OOM for active addresses.
    let sql = format!(
        "SELECT
           block_number,
           toUInt64(toUnixTimestamp(block_timestamp)) AS block_timestamp,
           tx_hash,
           from_address,
           to_address,
           value,
           tx_type,
           rollup
         FROM blob_lens.wallet_txs_by_addr FINAL
         WHERE addr = {{addr:String}} AND is_deleted = 0
           AND block_number >= {{start:UInt64}} AND block_number <= {{end:UInt64}}
         ORDER BY block_number {order}
         LIMIT {{limit:UInt64}} OFFSET {{offset:UInt64}}",
    );

    let rows = state.ch.query(&sql)
        .param("addr",   addr.as_str())
        .param("start",  start)
        .param("end",    end)
        .param("limit",  limit)
        .param("offset", offset)
        .fetch_all::<NormalTxRow>()
        .await
        .map_err(|e| { error!("normal-txs: {e}"); StatusCode::INTERNAL_SERVER_ERROR })?;

    if rows.is_empty() { return Ok(es_empty()); }

    let result: Vec<_> = rows.into_iter().map(|r| serde_json::json!({
        "blockNumber":      r.block_number.to_string(),
        "timeStamp":        r.block_timestamp.to_string(),
        "hash":             r.tx_hash,
        "from":             r.from_address,
        "to":               r.to_address,
        "value":            r.value,
        "gas":              "0",
        "gasPrice":         "0",
        "gasUsed":          "0",
        "isError":          "0",
        "txreceipt_status": "1",
        "txType":           r.tx_type.to_string(),
        "rollup":           r.rollup,
    })).collect();

    Ok(es_ok(serde_json::json!(result)))
}

// ── GET /api/wallet/:address/erc20-txs (Etherscan-compatible) ────────────────

#[derive(clickhouse::Row, Deserialize)]
struct Erc20TxRow {
    block_number:    u64,
    block_timestamp: u64,
    tx_hash:         String,
    from_address:    String,
    to_address:      String,
    token_address:   String,
    amount_raw:      String,
    log_index:       u32,
}

async fn wallet_erc20_txs(
    State(state): State<Arc<WalletState>>,
    Path(address): Path<String>,
    Query(q): Query<EsQuery>,
) -> Result<Json<serde_json::Value>, StatusCode> {
    let addr = address.to_lowercase();
    if !valid_eth_address(&addr) { return Err(StatusCode::BAD_REQUEST); }

    let order  = q.order().to_string();
    let limit  = q.limit();
    let offset = q.offset();
    let start  = q.start();
    let end    = q.end();

    let sql = format!(
        "SELECT
           block_number,
           toUInt64(toUnixTimestamp(block_timestamp)) AS block_timestamp,
           tx_hash,
           from_address,
           to_address,
           token_address,
           amount_raw,
           log_index
         FROM blob_lens.erc20_by_addr
         WHERE addr = {{addr:String}}
           AND block_number >= {{start:UInt64}} AND block_number <= {{end:UInt64}}
         ORDER BY block_number {order}, log_index {order}
         LIMIT {{limit:UInt64}} OFFSET {{offset:UInt64}}",
    );

    // erc20_by_addr stores addresses without 0x prefix
    let addr_bare = strip_0x(&addr).to_string();

    let rows = state.ch.query(&sql)
        .param("addr",   addr_bare.as_str())
        .param("start",  start)
        .param("end",    end)
        .param("limit",  limit)
        .param("offset", offset)
        .fetch_all::<Erc20TxRow>()
        .await
        .map_err(|e| { error!("erc20-txs: {e}"); StatusCode::INTERNAL_SERVER_ERROR })?;

    if rows.is_empty() { return Ok(es_empty()); }

    let result: Vec<_> = rows.into_iter().map(|r| serde_json::json!({
        "blockNumber":    r.block_number.to_string(),
        "timeStamp":      r.block_timestamp.to_string(),
        "hash":           r.tx_hash,
        "from":           r.from_address,
        "to":             r.to_address,
        "contractAddress": r.token_address,
        "tokenName":      "",
        "tokenSymbol":    "",
        "tokenDecimal":   "18",
        "value":          r.amount_raw,
        "logIndex":       r.log_index.to_string(),
    })).collect();

    Ok(es_ok(serde_json::json!(result)))
}

// ── GET /api/wallet/:address/nft-txs (Etherscan-compatible) ──────────────────
// ERC-721 Transfer = topic0 matches Transfer sig AND topic3 IS NOT NULL (tokenId)

#[derive(clickhouse::Row, Deserialize)]
struct NftTxRow {
    block_number:    u64,
    block_timestamp: u64,
    tx_hash:         String,
    contract_address: String,
    topic1:          String,
    topic2:          String,
    topic3:          String,
    log_index:       u32,
}

async fn wallet_nft_txs(
    State(state): State<Arc<WalletState>>,
    Path(address): Path<String>,
    Query(q): Query<EsQuery>,
) -> Result<Json<serde_json::Value>, StatusCode> {
    let addr = address.to_lowercase();
    if !valid_eth_address(&addr) { return Err(StatusCode::BAD_REQUEST); }

    // ERC-721 Transfer(address,address,uint256) topic0
    let transfer_sig = "ddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
    // Address padded to 32 bytes in topic: 24 zeros + 40 hex chars (without 0x)
    let padded = format!("000000000000000000000000{}", &addr[2..]);

    let order  = q.order().to_string();
    let limit  = q.limit();
    let offset = q.offset();

    // Default to last 200k blocks when no range given — a full-table scan on ethereum.logs
    // (billions of rows) causes OOM. Users who need full history must pass startblock.
    let (start, end) = if q.startblock.is_none() && q.endblock.is_none() {
        let head = latest_block_number(&state.ch).await;
        (head.saturating_sub(200_000), head)
    } else {
        (q.start(), q.end())
    };

    let sql = format!(
        "SELECT
           block_number,
           toUInt64(toUnixTimestamp(block_timestamp)) AS block_timestamp,
           tx_hash,
           address                          AS contract_address,
           coalesce(topic1, '')             AS topic1,
           coalesce(topic2, '')             AS topic2,
           coalesce(topic3, '')             AS topic3,
           log_index
         FROM ethereum.logs
         WHERE is_deleted = 0
           AND topic0 = {{sig:String}}
           AND topic3 IS NOT NULL
           AND (topic1 = {{padded:String}} OR topic2 = {{padded:String}})
           AND block_number >= {{start:UInt64}} AND block_number <= {{end:UInt64}}
         ORDER BY block_number {order}, log_index {order}
         LIMIT {{limit:UInt64}} OFFSET {{offset:UInt64}}",
    );

    let rows = state.ch.query(&sql)
        .param("sig",    transfer_sig)
        .param("padded", padded.as_str())
        .param("start",  start)
        .param("end",    end)
        .param("limit",  limit)
        .param("offset", offset)
        .fetch_all::<NftTxRow>()
        .await
        .map_err(|e| { error!("nft-txs: {e}"); StatusCode::INTERNAL_SERVER_ERROR })?;

    if rows.is_empty() { return Ok(es_empty()); }

    let result: Vec<_> = rows.into_iter().map(|r| {
        // Extract from/to from padded topics (last 40 chars = address without 0x)
        let from = if r.topic1.len() >= 40 { format!("0x{}", &r.topic1[r.topic1.len()-40..]) } else { r.topic1.clone() };
        let to   = if r.topic2.len() >= 40 { format!("0x{}", &r.topic2[r.topic2.len()-40..]) } else { r.topic2.clone() };
        let token_id = u128::from_str_radix(r.topic3.trim_start_matches("0x"), 16)
            .unwrap_or(0).to_string();
        serde_json::json!({
            "blockNumber":    r.block_number.to_string(),
            "timeStamp":      r.block_timestamp.to_string(),
            "hash":           r.tx_hash,
            "from":           from,
            "to":             to,
            "contractAddress": r.contract_address,
            "tokenName":      "",
            "tokenSymbol":    "",
            "tokenID":        token_id,
            "tokenValue":     "1",
            "logIndex":       r.log_index.to_string(),
        })
    }).collect();

    Ok(es_ok(serde_json::json!(result)))
}

// ── GET /api/wallet/:address/balance ─────────────────────────────────────────

async fn wallet_balance(
    State(state): State<Arc<WalletState>>,
    Path(address): Path<String>,
) -> Result<Json<serde_json::Value>, StatusCode> {
    let addr = address.to_lowercase();
    if !valid_eth_address(&addr) { return Err(StatusCode::BAD_REQUEST); }

    let body = serde_json::json!({
        "jsonrpc": "2.0", "method": "eth_getBalance",
        "params": [&addr, "latest"], "id": 1
    });
    let hex = match reqwest::Client::new().post(&state.reth_rpc).json(&body).send().await {
        Ok(r) => r.json::<serde_json::Value>().await
            .ok()
            .and_then(|v| v["result"].as_str().map(|s| s.to_string()))
            .unwrap_or_else(|| "0x0".into()),
        Err(_) => "0x0".into(),
    };
    let wei = u128::from_str_radix(hex.trim_start_matches("0x"), 16).unwrap_or(0);

    Ok(es_ok(serde_json::json!(wei.to_string())))
}

// ── GET /api/eth-price ────────────────────────────────────────────────────────

async fn eth_price_handler() -> Json<serde_json::Value> {
    let (usd, btc) = get_cached_eth_price().await;
    let ts = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs();
    es_ok(serde_json::json!({
        "ethusd":           usd.to_string(),
        "ethbtc":           btc.to_string(),
        "ethusd_timestamp": ts.to_string(),
        "ethbtc_timestamp": ts.to_string(),
    }))
}

// ── GET /api/block-by-timestamp?timestamp=N&closest=before|after ─────────────

#[derive(Deserialize)]
pub struct BlockByTsQuery {
    pub timestamp: u64,
    pub closest:   Option<String>,
}

#[derive(clickhouse::Row, Deserialize)]
struct BlockNumberRow {
    number: u64,
}

async fn block_by_timestamp(
    State(state): State<Arc<WalletState>>,
    Query(q): Query<BlockByTsQuery>,
) -> Result<Json<serde_json::Value>, StatusCode> {
    let before = q.closest.as_deref() != Some("after");
    let op     = if before { "<=" } else { ">=" };
    let ord    = if before { "DESC" } else { "ASC" };

    let sql = format!(
        "SELECT number FROM ethereum.blocks
         WHERE is_deleted = 0 AND toUnixTimestamp(timestamp) {op} {{ts:UInt64}}
         ORDER BY timestamp {ord} LIMIT 1"
    );

    let row = state.ch.query(&sql)
        .param("ts", q.timestamp)
        .fetch_optional::<BlockNumberRow>()
        .await
        .map_err(|e| { error!("block-by-timestamp: {e}"); StatusCode::INTERNAL_SERVER_ERROR })?;

    match row {
        Some(r) => Ok(es_ok(serde_json::json!(r.number.to_string()))),
        None    => Ok(Json(serde_json::json!({ "status": "0", "message": "No block found", "result": "" }))),
    }
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
        .route("/api/wallet/ping",              get(wallet_ping))
        .route("/api/wallet/admin/new-key",     post(admin_new_key))
        .route("/api/eth-price",                get(eth_price_handler))
        .route("/api/block-by-timestamp",       get(block_by_timestamp))
        .with_state(state)
}

/// Protected routes — API key required (middleware applied in main.rs).
pub fn wallet_protected_router(state: Arc<WalletState>) -> Router {
    Router::new()
        // Original endpoints
        .route("/api/wallet/:address",              get(wallet_summary))
        .route("/api/wallet/:address/txs",          get(wallet_txs))
        .route("/api/wallet/:address/tokens",       get(wallet_tokens))
        .route("/api/wallet/:address/rollups",      get(wallet_rollups))
        // Etherscan-compatible endpoints
        .route("/api/wallet/:address/balance",      get(wallet_balance))
        .route("/api/wallet/:address/normal-txs",   get(wallet_normal_txs))
        .route("/api/wallet/:address/erc20-txs",    get(wallet_erc20_txs))
        .route("/api/wallet/:address/nft-txs",      get(wallet_nft_txs))
        .with_state(state)
}
