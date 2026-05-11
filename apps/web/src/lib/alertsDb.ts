import sql from "./db";

// Ensure the regime_alerts table exists (idempotent)
export async function ensureAlertsTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS regime_alerts (
      id          SERIAL PRIMARY KEY,
      webhook_url TEXT NOT NULL,
      label       TEXT NOT NULL DEFAULT '',
      min_regime  TEXT NOT NULL DEFAULT 'congested',
      last_fired_regime TEXT,
      last_fired_at     TIMESTAMPTZ,
      enabled     BOOLEAN NOT NULL DEFAULT TRUE,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
}

// Regime severity ordering for comparison
export const REGIME_SEVERITY: Record<string, number> = {
  undersaturated: 0,
  healthy: 1,
  congested: 2,
  spike: 3,
};

// Validate webhook URL — blocks localhost and private ranges (SSRF mitigation)
export function isValidWebhookUrl(raw: string): boolean {
  try {
    const u = new URL(raw);
    if (!["http:", "https:"].includes(u.protocol)) return false;
    const h = u.hostname;
    if (
      /^(localhost|127\.|10\.|192\.168\.|::1|0\.0\.0\.0)/.test(h) ||
      /^172\.(1[6-9]|2\d|3[01])\./.test(h)
    ) return false;
    return true;
  } catch {
    return false;
  }
}
