import { NextRequest, NextResponse } from "next/server";

/**
 * ETM (Encrypted Mempool / EIP-8184 "Lucid") telemetry endpoint.
 *
 * EIP-8184 is not live on mainnet or any indexed devnet yet, so the "protocol"
 * metrics (key-reveal rate, PTC health, slashing, revert rate, cartelization)
 * have no source data — the /etm page renders those as awaiting-devnet panels.
 *
 * What we CAN measure today, from live chain data, is the baseline an encrypted
 * mempool is designed to erase (sandwich MEV extracted from public-mempool
 * order flow) and the block-space envelope EIP-8184 would carve out (the 1/8
 * sealed-gas cap against real execution-layer gas). Both are served here.
 */
export const dynamic = "force-dynamic";

const CH_URL = process.env.CLICKHOUSE_URL ?? "";
const CH_USER = process.env.CLICKHOUSE_USER ?? "";
const CH_PASS = process.env.CLICKHOUSE_PASSWORD ?? "";

async function ch(sql: string) {
  const url = `${CH_URL}/?user=${CH_USER}&password=${CH_PASS}`;
  const res = await fetch(url, {
    method: "POST",
    body: sql + " FORMAT JSONEachRow",
    headers: { "Content-Type": "text/plain" },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(await res.text());
  const text = await res.text();
  if (!text.trim()) return [];
  return text.trim().split("\n").filter(Boolean).map((l) => JSON.parse(l));
}

// EIP-8184: sealed (encrypted) transactions capped at 1/8 of the block gas limit,
// expandable up to 1/2 during congestion catch-up. (ETM #000/#001)
const SEALED_CAP_FRACTION = 1 / 8;

export async function GET(req: NextRequest) {
  const type = req.nextUrl.searchParams.get("type") ?? "baseline";

  try {
    // NOTE: the all-time baseline KPIs (attacks / victims / victim volume /
    // extracted value) are served by /api/mev?type=stats, which computes victim
    // volume directly from mev_sandwiches with decimal/sentinel guards. The
    // mev_daily_stats.victim_volume_usd column carries historical garbage that
    // sums to implausible totals, so we deliberately do NOT aggregate it here —
    // the ETM page reuses the vetted MEV stats endpoint to stay consistent.

    if (type === "trend") {
      const days = Math.min(365, Math.max(7, Number(req.nextUrl.searchParams.get("days") ?? 90)));
      // Subquery keeps the Date column for WHERE/GROUP/ORDER, then stringifies at
      // the outer level so the alias doesn't collide with the Date grouping key.
      const rows = await ch(`
        SELECT
          toString(date)  AS date,
          attacks,
          extracted_usd,
          victim_volume_usd
        FROM (
          SELECT
            date,
            toUInt64(sum(sandwiches))     AS attacks,
            round(sum(gross_profit_usd))  AS extracted_usd,
            round(sum(victim_volume_usd)) AS victim_volume_usd
          FROM blob_lens.mev_daily_stats
          WHERE date > today() - ${days}
          GROUP BY date
          ORDER BY date ASC
        )
      `);
      return NextResponse.json({ rows });
    }

    if (type === "sealed") {
      // Real execution-layer gas envelope over the last 7 days, used to model the
      // EIP-8184 sealed-capacity cap. This is a projection of the block-space
      // EIP-8184 reserves — not encrypted traffic itself (none exists yet).
      const [g] = await ch(`
        SELECT
          toUInt64(count())              AS blocks_sampled,
          toString(min(timestamp))       AS sample_start,
          toString(max(timestamp))       AS sample_end,
          round(avg(gas_used))           AS avg_gas_used,
          round(avg(gas_limit))          AS avg_gas_limit,
          round(avg(gas_used) / avg(gas_limit) * 100, 1) AS avg_util_pct
        FROM ethereum.blocks
        WHERE timestamp > now() - INTERVAL 7 DAY AND gas_limit > 0
      `);
      const avgLimit = Number(g?.avg_gas_limit ?? 0);
      const avgUsed = Number(g?.avg_gas_used ?? 0);
      const sealedCapGas = Math.round(avgLimit * SEALED_CAP_FRACTION);
      // Free (unused) gas in an average block today — the room a 1/8 sealed lane
      // would draw from before competing with plaintext demand.
      const freeGas = Math.max(0, avgLimit - avgUsed);
      const sealedFitsInHeadroom = freeGas >= sealedCapGas;
      return NextResponse.json({
        blocks_sampled: Number(g?.blocks_sampled ?? 0),
        sample_start: g?.sample_start ?? null,
        sample_end: g?.sample_end ?? null,
        avg_gas_used: avgUsed,
        avg_gas_limit: avgLimit,
        avg_util_pct: Number(g?.avg_util_pct ?? 0),
        sealed_cap_fraction: SEALED_CAP_FRACTION,
        sealed_cap_gas: sealedCapGas,
        free_gas: freeGas,
        sealed_fits_in_headroom: sealedFitsInHeadroom,
      });
    }

    return NextResponse.json({ error: `unknown type: ${type}` }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
