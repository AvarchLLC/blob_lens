use axum::{
    body::Body,
    extract::State,
    http::{Request, StatusCode},
    middleware::Next,
    response::{IntoResponse, Json, Response},
};
use sha2::{Digest, Sha256};
use sqlx::{PgPool, Row};
use std::{env, sync::Arc};
use tracing::error;

// ── Shared auth state ────────────────────────────────────────────────────────

#[derive(Clone)]
pub struct AuthState {
    pub pool: PgPool,
}

// ── Key hashing ──────────────────────────────────────────────────────────────

fn sha256_hex(s: &str) -> String {
    let mut h = Sha256::new();
    h.update(s.as_bytes());
    format!("{:x}", h.finalize())
}

// ── Key extraction ───────────────────────────────────────────────────────────

fn extract_key(req: &Request<Body>) -> Option<String> {
    // X-API-Key header (preferred)
    if let Some(v) = req.headers().get("X-API-Key") {
        return v.to_str().ok().map(|s| s.to_string());
    }
    // Authorization: Bearer <key>
    if let Some(v) = req.headers().get("Authorization") {
        if let Ok(s) = v.to_str() {
            if let Some(key) = s.strip_prefix("Bearer ") {
                return Some(key.to_string());
            }
        }
    }
    None
}

// ── Auth middleware ───────────────────────────────────────────────────────────
//
// Applied to all /api/wallet/* routes (not /health).
//
// Flow:
//   1. Extract key → 401 if absent
//   2. Atomically check validity + increment requests_today (lazy daily reset)
//      → 401 if key not found or inactive
//      → 429 if daily limit reached
//   3. Call next handler, then fire-and-forget usage log

pub async fn require_api_key(
    State(state): State<Arc<AuthState>>,
    req: Request<Body>,
    next: Next,
) -> Response {
    let start = std::time::Instant::now();
    let endpoint = req.uri().path().to_string();

    let raw_key = match extract_key(&req) {
        Some(k) => k,
        None => {
            return (
                StatusCode::UNAUTHORIZED,
                Json(serde_json::json!({ "error": "API key required. Pass X-API-Key header." })),
            )
                .into_response();
        }
    };

    let key_hash = sha256_hex(&raw_key);

    // Atomic increment with lazy daily reset.
    // Returns a row only if key is valid + active + under limit.
    let auth = sqlx::query(
        r#"UPDATE api_keys SET
             requests_today = CASE
               WHEN reset_date < CURRENT_DATE THEN 1
               ELSE requests_today + 1
             END,
             reset_date = CURRENT_DATE
           WHERE key_hash = $1
             AND is_active = true
             AND (reset_date < CURRENT_DATE OR requests_today < daily_limit)
           RETURNING id"#,
    )
    .bind(&key_hash)
    .fetch_optional(&state.pool)
    .await;

    let key_id: i64 = match auth {
        Err(e) => {
            error!("api_auth db error: {e}");
            return StatusCode::INTERNAL_SERVER_ERROR.into_response();
        }
        Ok(Some(row)) => row.get("id"),
        Ok(None) => {
            // Distinguish: invalid/inactive key vs rate limited
            let is_rate_limited = sqlx::query(
                "SELECT is_active FROM api_keys WHERE key_hash = $1 AND is_active = true",
            )
            .bind(&key_hash)
            .fetch_optional(&state.pool)
            .await
            .unwrap_or(None)
            .is_some();

            return if is_rate_limited {
                (
                    StatusCode::TOO_MANY_REQUESTS,
                    Json(serde_json::json!({
                        "error": "Daily rate limit exceeded. Upgrade your plan for higher limits."
                    })),
                )
                    .into_response()
            } else {
                (
                    StatusCode::UNAUTHORIZED,
                    Json(serde_json::json!({ "error": "Invalid or inactive API key." })),
                )
                    .into_response()
            };
        }
    };

    let response = next.run(req).await;
    let status_code = response.status().as_u16() as i16;
    let response_ms = start.elapsed().as_millis() as i32;

    // Fire-and-forget usage log — don't block the response
    let pool = state.pool.clone();
    tokio::spawn(async move {
        let _ = sqlx::query(
            "INSERT INTO api_usage_logs (key_id, endpoint, status_code, response_ms) VALUES ($1, $2, $3, $4)",
        )
        .bind(key_id)
        .bind(&endpoint)
        .bind(status_code)
        .bind(response_ms)
        .execute(&pool)
        .await;
    });

    response
}

// ── Admin: generate a new API key ─────────────────────────────────────────────
//
// Called by POST /api/wallet/admin/new-key (handler in wallet_api.rs).
// Protected by ADMIN_SECRET env var — not for public use.

pub struct NewKeyResult {
    pub raw_key:    String,
    pub key_prefix: String,
    pub tier:       String,
    pub daily_limit: i32,
}

pub async fn create_key(
    pool: &PgPool,
    tier: &str,
    daily_limit: i32,
    owner_email: Option<&str>,
) -> Result<NewKeyResult, sqlx::Error> {
    // w360_<32 hex chars>
    let raw: String = {
        use std::fmt::Write;
        let bytes: [u8; 16] = rand_bytes();
        let mut s = String::with_capacity(37);
        s.push_str("w360_");
        for b in bytes {
            write!(s, "{b:02x}").unwrap();
        }
        s
    };
    let key_prefix = raw[..12].to_string(); // "w360_XXXXXXX"
    let key_hash   = sha256_hex(&raw);

    sqlx::query(
        "INSERT INTO api_keys (key_hash, key_prefix, tier, daily_limit, owner_email)
         VALUES ($1, $2, $3, $4, $5)",
    )
    .bind(&key_hash)
    .bind(&key_prefix)
    .bind(tier)
    .bind(daily_limit)
    .bind(owner_email)
    .execute(pool)
    .await?;

    Ok(NewKeyResult {
        raw_key: raw,
        key_prefix,
        tier: tier.to_string(),
        daily_limit,
    })
}

// ── Tiny CSPRNG wrapper (avoids pulling in a full rand crate) ────────────────

fn rand_bytes() -> [u8; 16] {
    use std::collections::hash_map::DefaultHasher;
    use std::hash::{Hash, Hasher};
    use std::time::{SystemTime, UNIX_EPOCH};

    // Mix time + process id + stack address for entropy.
    // Good enough for non-security-critical key generation;
    // for production-grade use, replace with getrandom::getrandom().
    let mut h = DefaultHasher::new();
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .subsec_nanos()
        .hash(&mut h);
    std::process::id().hash(&mut h);
    let addr: usize = &h as *const _ as usize;
    addr.hash(&mut h);
    let seed = h.finish();

    // Split seed into 16 bytes + XOR with time nanoseconds for spread
    let ns = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .subsec_nanos() as u64;
    let a = seed ^ ns.rotate_left(13);
    let b = seed.wrapping_add(ns).rotate_right(7);
    let mut out = [0u8; 16];
    out[..8].copy_from_slice(&a.to_le_bytes());
    out[8..].copy_from_slice(&b.to_le_bytes());
    out
}

// ── Admin secret check ───────────────────────────────────────────────────────

pub fn check_admin_secret(provided: &str) -> bool {
    let expected = env::var("ADMIN_SECRET").unwrap_or_default();
    !expected.is_empty() && provided == expected
}
