import { NextRequest, NextResponse } from "next/server";

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
  return text
    .trim()
    .split("\n")
    .map((l) => JSON.parse(l));
}

export async function GET(req: NextRequest) {
  const type = req.nextUrl.searchParams.get("type") ?? "stats";

  try {
    if (type === "stats") {
      const rows = await ch(`
        SELECT
          count()                          AS total_sandwiches,
          countDistinct(victim_tx)         AS unique_victims,
          countDistinct(sandwicher)        AS unique_bots,
          countDistinct(pool)              AS unique_pools,
          min(block_number)                AS first_block,
          max(block_number)                AS last_block
        FROM blob_lens.mev_sandwiches FINAL
      `);
      return NextResponse.json(rows[0] ?? {});
    }

    if (type === "daily") {
      const days = Number(req.nextUrl.searchParams.get("days") ?? "30");
      const rows = await ch(`
        SELECT
          toDate(block_timestamp)          AS day,
          count()                          AS sandwiches,
          countDistinct(victim_tx)         AS victims,
          countDistinct(sandwicher)        AS bots,
          protocol
        FROM blob_lens.mev_sandwiches FINAL
        WHERE block_timestamp >= now() - INTERVAL ${days} DAY
        GROUP BY day, protocol
        ORDER BY day ASC, protocol ASC
      `);
      return NextResponse.json(rows);
    }

    if (type === "top-bots") {
      const limit = Number(req.nextUrl.searchParams.get("limit") ?? "20");
      const rows = await ch(`
        SELECT
          sandwicher,
          count()                          AS sandwiches,
          countDistinct(victim_tx)         AS unique_victims,
          countDistinct(pool)              AS unique_pools,
          min(block_number)                AS first_seen_block,
          max(block_number)                AS last_seen_block
        FROM blob_lens.mev_sandwiches FINAL
        GROUP BY sandwicher
        ORDER BY sandwiches DESC
        LIMIT ${limit}
      `);
      return NextResponse.json(rows);
    }

    if (type === "top-pools") {
      const limit = Number(req.nextUrl.searchParams.get("limit") ?? "20");
      const rows = await ch(`
        SELECT
          pool,
          any(protocol)                    AS protocol,
          count()                          AS sandwiches,
          countDistinct(victim_tx)         AS unique_victims,
          countDistinct(sandwicher)        AS unique_bots
        FROM blob_lens.mev_sandwiches FINAL
        GROUP BY pool
        ORDER BY sandwiches DESC
        LIMIT ${limit}
      `);
      return NextResponse.json(rows);
    }

    if (type === "recent") {
      const limit = Number(req.nextUrl.searchParams.get("limit") ?? "50");
      const rows = await ch(`
        SELECT
          block_number, block_timestamp, sandwicher, pool, protocol,
          frontrun_tx, frontrun_idx, victim_tx, victim_idx, backrun_tx, backrun_idx
        FROM blob_lens.mev_sandwiches FINAL
        ORDER BY block_number DESC
        LIMIT ${limit}
      `);
      return NextResponse.json(rows);
    }

    if (type === "weekly-trend") {
      const weeks = Number(req.nextUrl.searchParams.get("weeks") ?? "12");
      const rows = await ch(`
        SELECT
          toStartOfWeek(block_timestamp)   AS week,
          count()                          AS sandwiches,
          countDistinct(victim_tx)         AS victims,
          countDistinct(sandwicher)        AS bots,
          countIf(protocol='uniswap_v3')   AS v3_count,
          countIf(protocol='uniswap_v2')   AS v2_count
        FROM blob_lens.mev_sandwiches FINAL
        WHERE block_timestamp >= now() - INTERVAL ${weeks} WEEK
        GROUP BY week
        ORDER BY week ASC
      `);
      return NextResponse.json(rows);
    }

    if (type === "backfill-progress") {
      const rows = await ch(`
        SELECT source, last_block, updated_at
        FROM blob_lens.mev_backfill_progress FINAL
        WHERE source = 'mev_sandwich'
      `);
      const totalRows = await ch(
        `SELECT count() AS c FROM blob_lens.mev_sandwiches FINAL`
      );
      return NextResponse.json({
        ...rows[0],
        total_sandwiches: totalRows[0]?.c ?? "0",
        dencun_start: 19426587,
      });
    }

    return NextResponse.json({ error: "unknown type" }, { status: 400 });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
