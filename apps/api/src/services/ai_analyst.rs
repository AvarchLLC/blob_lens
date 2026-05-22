use sqlx::{Pool, Postgres};
use std::time::Duration;
use reqwest::Client;
use std::env;
use serde_json::json;

pub async fn run_ai_analyst(pool: Pool<Postgres>) {
    tracing::info!("🤖 AI Analyst started");

    loop {
        if let Err(e) = generate_ai_insights(&pool).await {
            tracing::error!("Error generating AI insights: {}", e);
        }
        // Generate weekly reports (every 7 days)
        tokio::time::sleep(Duration::from_secs(604800)).await;
    }
}

async fn generate_ai_insights(pool: &Pool<Postgres>) -> eyre::Result<()> {
    let api_key = env::var("CLAUDE_API_KEY").unwrap_or_default();
    
    if api_key.is_empty() {
        tracing::warn!("CLAUDE_API_KEY not set. Using fallback mock insights.");
        return seed_mock_insights(pool).await;
    }

    // In a real implementation, we would query metrics from the last 7 days:
    // 1. Top rollups by volume
    // 2. Average fee trends
    // 3. Efficiency score distribution
    // 4. Any detected anomalies
    
    let client = Client::new();
    
    // Construct prompt (Simplified)
    let prompt = "You are a blockchain analyst. Based on recent EIP-4844 data, generate a weekly summary report for the Ethereum blob market.";

    let resp = client.post("https://api.anthropic.com/v1/messages")
        .header("x-api-key", &api_key)
        .header("anthropic-version", "2023-06-01")
        .json(&json!({
            "model": "claude-3-5-sonnet-20240620",
            "max_tokens": 1024,
            "messages": [{
                "role": "user",
                "content": prompt
            }]
        }))
        .send().await?;

    if resp.status().is_success() {
        let data: serde_json::Value = resp.json().await?;
        let body = data["content"][0]["text"].as_str().unwrap_or("No content generated.");
        
        sqlx::query(
            "INSERT INTO ai_insights (insight_type, title, body, confidence_score) 
             VALUES ('weekly_report', 'Weekly Blob Market Synthesis', $1, 0.95)"
        )
        .bind(body)
        .execute(pool)
        .await?;
    } else {
        tracing::error!("Claude API error: {}", resp.status());
        seed_mock_insights(pool).await?;
    }

    Ok(())
}

async fn seed_mock_insights(pool: &Pool<Postgres>) -> eyre::Result<()> {
    let count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM ai_insights")
        .fetch_one(pool)
        .await?;

    if count > 0 {
        return Ok(());
    }

    let mock_body = r#"
## Market Regime Synthesis
The past 7 days have shown a **Sustained Healthy** regime. Average blob utilization remains at 48%, slightly below the target threshold of 4.5 blobs per block. This has resulted in stable base fees hovering around 1 wei.

## Top Rollup Performance
- **Base** continues to dominate volume, accounting for 34% of all blobs.
- **Arbitrum** has improved its packing efficiency by 12% following a sequencer optimization.
- **ZKSync** remains the most cost-efficient rollup in terms of USD per user transaction.

## Forecast
Expect a minor fee spike in the coming 48 hours as several high-volume protocols launch new mainnet campaigns.
    "#;

    sqlx::query(
        "INSERT INTO ai_insights (insight_type, title, body, confidence_score) 
         VALUES ('weekly_report', 'Weekly Blob Market Synthesis (Mock)', $1, 0.88)"
    )
    .bind(mock_body)
    .execute(pool)
    .await?;

    Ok(())
}
