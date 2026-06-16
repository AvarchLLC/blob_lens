use axum::{routing::get, Json, Router};

// GET /health
async fn health_handler() -> Json<serde_json::Value> {
    Json(serde_json::json!({ "status": "ok" }))
}

pub fn api_router() -> Router {
    Router::new().route("/health", get(health_handler))
}
