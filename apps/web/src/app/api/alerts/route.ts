import { ensureAlertsTable, isValidWebhookUrl } from "@/lib/alertsDb";
import sql from "@/lib/db";
import type { RegimeAlert } from "@/types";
import type { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

const VALID_REGIMES = new Set(["healthy", "congested", "spike"]);

export async function GET() {
  try {
    await ensureAlertsTable();
    const rows = await sql<RegimeAlert[]>`
      SELECT id, webhook_url, label, min_regime,
             last_fired_regime, last_fired_at::text, enabled, created_at::text
      FROM regime_alerts
      ORDER BY created_at DESC
    `;
    return Response.json({ data: rows });
  } catch {
    return Response.json({ error: "DB error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { webhook_url, label = "", min_regime = "congested" } = body ?? {};

    if (!webhook_url || typeof webhook_url !== "string") {
      return Response.json({ error: "webhook_url is required" }, { status: 400 });
    }
    if (!isValidWebhookUrl(webhook_url)) {
      return Response.json({ error: "Invalid or disallowed webhook URL" }, { status: 400 });
    }
    if (!VALID_REGIMES.has(min_regime)) {
      return Response.json({ error: "min_regime must be healthy | congested | spike" }, { status: 400 });
    }

    await ensureAlertsTable();
    const [row] = await sql<RegimeAlert[]>`
      INSERT INTO regime_alerts (webhook_url, label, min_regime)
      VALUES (${webhook_url}, ${String(label).slice(0, 80)}, ${min_regime})
      RETURNING id, webhook_url, label, min_regime,
                last_fired_regime, last_fired_at::text, enabled, created_at::text
    `;
    return Response.json({ data: row }, { status: 201 });
  } catch {
    return Response.json({ error: "DB error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const id = Number(req.nextUrl.searchParams.get("id"));
  if (!id || isNaN(id)) {
    return Response.json({ error: "id param required" }, { status: 400 });
  }
  try {
    await ensureAlertsTable();
    await sql`DELETE FROM regime_alerts WHERE id = ${id}`;
    return Response.json({ ok: true });
  } catch {
    return Response.json({ error: "DB error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const id = Number(req.nextUrl.searchParams.get("id"));
  if (!id || isNaN(id)) {
    return Response.json({ error: "id param required" }, { status: 400 });
  }
  try {
    const { enabled } = await req.json();
    await ensureAlertsTable();
    await sql`UPDATE regime_alerts SET enabled = ${Boolean(enabled)} WHERE id = ${id}`;
    return Response.json({ ok: true });
  } catch {
    return Response.json({ error: "DB error" }, { status: 500 });
  }
}
