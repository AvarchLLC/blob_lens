import { ensureAlertsTable, REGIME_SEVERITY } from "@/lib/alertsDb";
import sql from "@/lib/db";
import type { MarketRegime, RegimeAlert } from "@/types";

export const dynamic = "force-dynamic";

// Called by Vercel Cron every minute — fires webhooks server-side regardless of
// whether any browser session has the RegimeAlertPanel open.
// Vercel automatically sets Authorization: Bearer <CRON_SECRET> on cron invocations.
export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${cronSecret}`) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    await ensureAlertsTable();

    const [latest] = await sql<{ blob_count: number; blob_base_fee: string; blob_gas_used: number }[]>`
      SELECT blob_count, blob_base_fee::text, blob_gas_used
      FROM block_blob_stats
      ORDER BY block_number DESC
      LIMIT 1
    `;

    if (!latest) {
      return Response.json({ regime: "undersaturated", fired: 0, skipped: 0, errors: 0 });
    }

    const currentRegime = classifyRegime(Number(latest.blob_count));
    const currentSeverity = REGIME_SEVERITY[currentRegime];
    const feeGwei = Number(latest.blob_base_fee) / 1e9;
    const avgBlobs = Number(latest.blob_gas_used) / 131_072;

    const alerts = await sql<RegimeAlert[]>`
      SELECT id, webhook_url, label, min_regime, last_fired_regime, last_fired_at, enabled
      FROM regime_alerts
      WHERE enabled = TRUE
        AND COALESCE(last_fired_at, '1970-01-01') < NOW() - INTERVAL '1 minute'
    `;

    const payload = {
      event: "regime_change",
      regime: currentRegime,
      fee_gwei: feeGwei,
      avg_blobs_per_block: Number(avgBlobs.toFixed(2)),
      timestamp: new Date().toISOString(),
      source: "BlobLens/cron",
    };

    let fired = 0, skipped = 0, errors = 0;

    await Promise.all(
      alerts.map(async (alert) => {
        const minSeverity = REGIME_SEVERITY[alert.min_regime] ?? 1;
        if (currentSeverity < minSeverity || alert.last_fired_regime === currentRegime) {
          skipped++;
          return;
        }
        try {
          const res = await fetch(alert.webhook_url, {
            method: "POST",
            headers: { "Content-Type": "application/json", "User-Agent": "BlobLens/1.0" },
            body: JSON.stringify({ ...payload, alert_label: alert.label }),
            signal: AbortSignal.timeout(5000),
          });
          if (res.ok) {
            await sql`
              UPDATE regime_alerts
              SET last_fired_regime = ${currentRegime}, last_fired_at = NOW()
              WHERE id = ${alert.id}
            `;
            fired++;
          } else {
            errors++;
          }
        } catch {
          errors++;
        }
      })
    );

    return Response.json({ regime: currentRegime, fired, skipped, errors });
  } catch {
    return Response.json({ error: "DB error" }, { status: 500 });
  }
}

function classifyRegime(maxBlobsInBlock: number): MarketRegime {
  const util = maxBlobsInBlock / 9;
  if (util < 0.2)  return "undersaturated";
  if (util < 0.8)  return "healthy";
  if (util < 0.95) return "congested";
  return "spike";
}
