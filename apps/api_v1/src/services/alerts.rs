use sqlx::{Pool, Postgres};
use serde::Serialize;
use std::time::Duration;
use chrono::Utc;
use reqwest::Client;

#[derive(Debug, Serialize, Clone, Copy, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum MarketRegime {
    Undersaturated,
    Healthy,
    Congested,
    Spike,
}

impl MarketRegime {
    pub fn from_count(count: i32) -> Self {
        let util = count as f64 / 9.0;
        if util < 0.2 {
            Self::Undersaturated
        } else if util < 0.8 {
            Self::Healthy
        } else if util < 0.95 {
            Self::Congested
        } else {
            Self::Spike
        }
    }

    pub fn severity(&self) -> i32 {
        match self {
            Self::Undersaturated => 0,
            Self::Healthy => 1,
            Self::Congested => 2,
            Self::Spike => 3,
        }
    }

    pub fn from_str(s: &str) -> Self {
        match s {
            "undersaturated" => Self::Undersaturated,
            "healthy" => Self::Healthy,
            "congested" => Self::Congested,
            "spike" => Self::Spike,
            _ => Self::Undersaturated,
        }
    }

    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Undersaturated => "undersaturated",
            Self::Healthy => "healthy",
            Self::Congested => "congested",
            Self::Spike => "spike",
        }
    }
}

#[derive(sqlx::FromRow)]
struct AlertRow {
    id: i32,
    webhook_url: String,
    label: String,
    min_regime: String,
    last_fired_regime: Option<String>,
}

#[derive(Serialize)]
struct WebhookPayload {
    event: String,
    regime: MarketRegime,
    fee_gwei: f64,
    avg_blobs_per_block: f64,
    timestamp: String,
    source: String,
    alert_label: String,
}

pub async fn run_alert_worker(pool: Pool<Postgres>) {
    let client = Client::new();
    tracing::info!("🔔 Alert worker started");

    loop {
        if let Err(e) = check_and_fire_alerts(&pool, &client).await {
            tracing::error!("Error checking alerts: {}", e);
        }
        tokio::time::sleep(Duration::from_secs(60)).await;
    }
}

async fn check_and_fire_alerts(pool: &Pool<Postgres>, client: &Client) -> eyre::Result<()> {
    // 1. Get latest block stats
    let latest = sqlx::query!(
        "SELECT blob_count, blob_base_fee, blob_gas_used FROM block_blob_stats ORDER BY block_number DESC LIMIT 1"
    )
    .fetch_optional(pool)
    .await?;

    let Some(row) = latest else { return Ok(()); };

    let current_regime = MarketRegime::from_count(row.blob_count);
    let current_severity = current_regime.severity();
    let fee_gwei = row.blob_base_fee as f64 / 1e9;
    let avg_blobs = row.blob_gas_used as f64 / 131072.0;

    // 2. Fetch enabled alerts
    // Using query_as instead of query_as! to avoid complex type mapping with optional strings
    let alerts = sqlx::query_as::<_, AlertRow>(
        r#"
        SELECT id, webhook_url, label, min_regime, last_fired_regime
        FROM regime_alerts
        WHERE enabled = TRUE
          AND (last_fired_at IS NULL OR last_fired_at < NOW() - INTERVAL '1 minute')
        "#
    )
    .fetch_all(pool)
    .await?;

    for alert in alerts {
        let min_regime = MarketRegime::from_str(&alert.min_regime);
        let min_severity = min_regime.severity();

        // Fire only if current regime >= threshold AND regime changed since last fire
        let last_regime_str = alert.last_fired_regime.as_deref().unwrap_or("");
        let current_regime_str = current_regime.as_str();

        if current_severity >= min_severity && last_regime_str != current_regime_str {
            let payload = WebhookPayload {
                event: "regime_change".to_string(),
                regime: current_regime,
                fee_gwei,
                avg_blobs_per_block: (avg_blobs * 100.0).round() / 100.0,
                timestamp: Utc::now().to_rfc3339(),
                source: "BlobLens".to_string(),
                alert_label: alert.label,
            };

            tracing::info!("Firing alert '{}' for regime {:?}", payload.alert_label, current_regime);

            match client.post(&alert.webhook_url)
                .json(&payload)
                .timeout(Duration::from_secs(5))
                .send()
                .await {
                Ok(resp) if resp.status().is_success() => {
                    sqlx::query!(
                        "UPDATE regime_alerts SET last_fired_regime = $1, last_fired_at = NOW() WHERE id = $2",
                        current_regime_str,
                        alert.id
                    )
                    .execute(pool)
                    .await?;
                }
                Ok(resp) => tracing::warn!("Webhook for alert {} failed with status {}", alert.id, resp.status()),
                Err(e) => tracing::warn!("Webhook for alert {} failed: {}", alert.id, e),
            }
        }
    }

    Ok(())
}
