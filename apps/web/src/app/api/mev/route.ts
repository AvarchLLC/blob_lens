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
    .filter(Boolean)
    .map((l) => JSON.parse(l));
}

export async function GET(req: NextRequest) {
  const type = req.nextUrl.searchParams.get("type") ?? "stats";

  try {
    if (type === "stats") {
      const [main, pct] = await Promise.all([
        ch(`
          SELECT
            count()                          AS total_sandwiches,
            countDistinct(victim_tx)         AS unique_victims,
            countDistinct(sandwicher)        AS unique_bots,
            countDistinct(pool)              AS unique_pools,
            min(block_number)                AS first_block,
            max(block_number)                AS last_block
          FROM blob_lens.mev_sandwiches FINAL
        `),
        ch(`
          SELECT
            countDistinct(s.block_number) AS sandwich_blocks,
            (SELECT count() FROM ethereum.blocks WHERE timestamp >= now() - INTERVAL 30 DAY AND is_deleted=0) AS total_blocks
          FROM blob_lens.mev_sandwiches s FINAL
          WHERE block_timestamp >= now() - INTERVAL 30 DAY
        `),
      ]);
      return NextResponse.json({
        ...(main[0] ?? {}),
        sandwich_blocks: pct[0]?.sandwich_blocks ?? "0",
        total_blocks: pct[0]?.total_blocks ?? "0",
      });
    }

    if (type === "weekly-trend") {
      const weeks = Number(req.nextUrl.searchParams.get("weeks") ?? "16");
      const rows = await ch(`
        SELECT
          toStartOfWeek(block_timestamp)   AS week,
          count()                          AS sandwiches,
          countDistinct(sandwicher)        AS active_bots,
          countDistinct(block_number)      AS blocks_sandwiched,
          countIf(protocol='uniswap_v3')   AS v3_count,
          countIf(protocol='uniswap_v2')   AS v2_count
        FROM blob_lens.mev_sandwiches FINAL
        WHERE block_timestamp >= now() - INTERVAL ${weeks} WEEK
        GROUP BY week
        ORDER BY week ASC
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
          s.pool,
          any(p.token0)                    AS token0,
          any(p.token1)                    AS token1,
          any(s.protocol)                  AS protocol,
          count()                          AS sandwiches,
          countDistinct(s.victim_tx)       AS unique_victims,
          countDistinct(s.sandwicher)      AS unique_bots
        FROM blob_lens.mev_sandwiches s FINAL
        LEFT JOIN blob_lens.pool_tokens p FINAL ON s.pool = p.pool
        GROUP BY s.pool
        ORDER BY sandwiches DESC
        LIMIT ${limit}
      `);
      return NextResponse.json(rows);
    }

    if (type === "top-token-pairs") {
      const limit = Number(req.nextUrl.searchParams.get("limit") ?? "20");
      const rows = await ch(`
        SELECT
          p.token0,
          p.token1,
          p.protocol,
          count()                          AS sandwiches,
          countDistinct(s.victim_tx)       AS unique_victims,
          countDistinct(s.sandwicher)      AS unique_bots,
          countDistinct(s.pool)            AS unique_pools
        FROM blob_lens.mev_sandwiches s FINAL
        JOIN blob_lens.pool_tokens p FINAL ON s.pool = p.pool
        GROUP BY p.token0, p.token1, p.protocol
        ORDER BY sandwiches DESC
        LIMIT ${limit}
      `);
      return NextResponse.json(rows);
    }

    if (type === "recent") {
      const limit = Number(req.nextUrl.searchParams.get("limit") ?? "50");
      const rows = await ch(`
        SELECT
          s.block_number, s.block_timestamp, s.sandwicher, s.pool, s.protocol,
          s.frontrun_tx, s.frontrun_idx, s.victim_tx, s.victim_idx, s.backrun_tx, s.backrun_idx,
          coalesce(p.token0, '') AS token0,
          coalesce(p.token1, '') AS token1
        FROM blob_lens.mev_sandwiches s FINAL
        LEFT JOIN blob_lens.pool_tokens p FINAL ON s.pool = p.pool
        ORDER BY s.block_number DESC
        LIMIT ${limit}
      `);
      return NextResponse.json(rows);
    }

    if (type === "backfill-progress") {
      const [prog, total] = await Promise.all([
        ch(`SELECT source, last_block, updated_at FROM blob_lens.mev_backfill_progress FINAL WHERE source = 'mev_sandwich'`),
        ch(`SELECT count() AS c FROM blob_lens.mev_sandwiches FINAL`),
      ]);
      return NextResponse.json({
        ...(prog[0] ?? {}),
        total_sandwiches: total[0]?.c ?? "0",
        dencun_start: 19426587,
      });
    }

    return NextResponse.json({ error: "unknown type" }, { status: 400 });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
