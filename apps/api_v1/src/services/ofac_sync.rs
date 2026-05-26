use sqlx::{Pool, Postgres};
use std::time::Duration;

pub async fn run_ofac_sync(pool: Pool<Postgres>) {
    tracing::info!("🛡️ OFAC sanctions sync started");

    // Seed initial sanctioned addresses
    if let Err(e) = seed_ofac_list(&pool).await {
        tracing::error!("Error seeding OFAC list: {}", e);
    }

    loop {
        // In a real implementation, this would fetch from an official API or CSV
        // For now, we'll keep our seeded list and allow for future expansion
        tokio::time::sleep(Duration::from_secs(86400)).await; // Daily refresh
    }
}

async fn seed_ofac_list(pool: &Pool<Postgres>) -> eyre::Result<()> {
    let count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM ofac_sanctions_list")
        .fetch_one(pool)
        .await?;

    if count > 0 {
        return Ok(());
    }

    tracing::info!("Seeding initial sanctioned addresses (Tornado Cash, Lazarus, etc.)...");

    let sanctioned = vec![
        ("0xd90e2f925DA726b50C4Ed8D0Fb90Ad053324F31b", "Tornado.Cash: Router", "official_ofac", "high", vec!["mixer", "sanctioned"]),
        ("0x722122dF12D4e14e13Ac3b6895a86e84145b6967", "Tornado.Cash: 1 ETH", "official_ofac", "high", vec!["mixer", "sanctioned"]),
        ("0x47CE0C6eA5D0Bc3164BB5d44a562df8477aAa3c1", "Tornado.Cash: 10 ETH", "official_ofac", "high", vec!["mixer", "sanctioned"]),
        ("0x910CdB5CB3023d83371059f27f3c0C306a419AA7", "Tornado.Cash: 100 ETH", "official_ofac", "high", vec!["mixer", "sanctioned"]),
        ("0x095eA79873552C9916F3fD4CD1bC93BA736c07B0", "Lazarus Group Wallet", "official_ofac", "high", vec!["hacker", "sanctioned", "north_korea"]),
        ("0x413390669136B2d02c9302674e62232938B9d8f6", "Lazarus Group Wallet 2", "official_ofac", "high", vec!["hacker", "sanctioned", "north_korea"]),
    ];

    for (address, label, source, severity, tags) in sanctioned {
        sqlx::query(
            "INSERT INTO ofac_sanctions_list (address, label, source, severity, risk_tags) 
             VALUES ($1, $2, $3, $4, $5) 
             ON CONFLICT (address) DO NOTHING"
        )
        .bind(address)
        .bind(label)
        .bind(source)
        .bind(severity)
        .bind(&tags)
        .execute(pool)
        .await?;

        sqlx::query(
            "INSERT INTO ofac_sanctions_history (address, action) VALUES ($1, 'added')"
        )
        .bind(address)
        .execute(pool)
        .await?;
    }

    Ok(())
}
