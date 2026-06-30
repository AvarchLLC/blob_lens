import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const CH_URL  = process.env.CLICKHOUSE_URL  ?? "";
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

/* ── USD helpers ───────────────────────────────────────────────────────────── */
// UInt256 values from v3 int256 amounts: >= 2^255 = negative (token flows OUT)
// For v2: victim_data0/1 are always non-negative uint256 (amount0In / amount1In)
const HALF_U256 = "57896044618658097711785492504343953926634992332820282019728792003956564819968";

// Addresses lowercase
const USDC = "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48";
const USDT = "0xdac17f958d2ee523a2206206994597c13d831ec7";
const DAI  = "0x6b175474e89094c44da98b954eedeac495271d0f";
const WETH = "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2";

// SQL expression for victim USD. Requires:
//   s = alias for mev_sandwiches
//   p = alias for eth_daily_price joined ON toDate(s.block_timestamp) = p.date
function victimUsdSql(s = "s", p = "p"): string {
  return `multiIf(
    lower(${s}.token0) IN ('${USDC}','${USDT}') AND ${s}.victim_data0 > 0 AND ${s}.victim_data0 < toUInt256(${HALF_U256}),
      toFloat64(${s}.victim_data0) / 1000000.0,
    lower(${s}.token0) = '${DAI}' AND ${s}.victim_data0 > 0 AND ${s}.victim_data0 < toUInt256(${HALF_U256}),
      toFloat64(${s}.victim_data0) / 1e18,
    lower(${s}.token0) = '${WETH}' AND ${s}.victim_data0 > 0 AND ${s}.victim_data0 < toUInt256(${HALF_U256}),
      toFloat64(${s}.victim_data0) / 1e18 * coalesce(${p}.price_usd, 2000.0),
    lower(${s}.token1) IN ('${USDC}','${USDT}') AND ${s}.victim_data1 > 0 AND ${s}.victim_data1 < toUInt256(${HALF_U256}),
      toFloat64(${s}.victim_data1) / 1000000.0,
    lower(${s}.token1) = '${DAI}' AND ${s}.victim_data1 > 0 AND ${s}.victim_data1 < toUInt256(${HALF_U256}),
      toFloat64(${s}.victim_data1) / 1e18,
    lower(${s}.token1) = '${WETH}' AND ${s}.victim_data1 > 0 AND ${s}.victim_data1 < toUInt256(${HALF_U256}),
      toFloat64(${s}.victim_data1) / 1e18 * coalesce(${p}.price_usd, 2000.0),
    0.0
  )`;
}

// SQL expression for bot gas cost in USD (frontrun + backrun receipts)
function gasCostUsdSql(s = "s", p = "p"): string {
  return `(toFloat64(${s}.frontrun_gas_used) * toFloat64(${s}.frontrun_eff_gas_px) +
           toFloat64(${s}.backrun_gas_used)  * toFloat64(${s}.backrun_eff_gas_px)) / 1e18
          * coalesce(${p}.price_usd, 2000.0)`;
}

// SQL expression for bot profit in USD (clamped to >= 0 per sandwich to account for multi-pool routing)
function botProfitUsdSql(s = "s", p = "p"): string {
  return `multiIf(
    -- V2-based: token0 is stable/WETH
    ${s}.protocol IN ('uniswap_v2', 'sushiswap_v2', 'other_v2') AND lower(${s}.token0) IN ('${USDC}','${USDT}','${DAI}','${WETH}') AND ${s}.fr_data0 > 0 AND ${s}.br_data2 > 0,
      multiIf(
        lower(${s}.token0) IN ('${USDC}','${USDT}'),
          (toFloat64(${s}.br_data2) - toFloat64(${s}.fr_data0)) / 1000000.0,
        lower(${s}.token0) = '${DAI}',
          (toFloat64(${s}.br_data2) - toFloat64(${s}.fr_data0)) / 1e18,
        lower(${s}.token0) = '${WETH}',
          (toFloat64(${s}.br_data2) - toFloat64(${s}.fr_data0)) / 1e18 * coalesce(${p}.price_usd, 2000.0),
        0.0
      ),
      
    -- V2-based: token1 is stable/WETH
    ${s}.protocol IN ('uniswap_v2', 'sushiswap_v2', 'other_v2') AND lower(${s}.token1) IN ('${USDC}','${USDT}','${DAI}','${WETH}') AND ${s}.fr_data1 > 0 AND ${s}.br_data3 > 0,
      multiIf(
        lower(${s}.token1) IN ('${USDC}','${USDT}'),
          (toFloat64(${s}.br_data3) - toFloat64(${s}.fr_data1)) / 1000000.0,
        lower(${s}.token1) = '${DAI}',
          (toFloat64(${s}.br_data3) - toFloat64(${s}.fr_data1)) / 1e18,
        lower(${s}.token1) = '${WETH}',
          (toFloat64(${s}.br_data3) - toFloat64(${s}.fr_data1)) / 1e18 * coalesce(${p}.price_usd, 2000.0),
        0.0
      ),

    -- V3-based: token0 is stable/WETH
    ${s}.protocol = 'uniswap_v3' AND lower(${s}.token0) IN ('${USDC}','${USDT}','${DAI}','${WETH}'),
      multiIf(
        lower(${s}.token0) IN ('${USDC}','${USDT}'),
          toFloat64(-(reinterpretAsInt256(${s}.fr_data0) + reinterpretAsInt256(${s}.br_data0))) / 1000000.0,
        lower(${s}.token0) = '${DAI}',
          toFloat64(-(reinterpretAsInt256(${s}.fr_data0) + reinterpretAsInt256(${s}.br_data0))) / 1e18,
        lower(${s}.token0) = '${WETH}',
          toFloat64(-(reinterpretAsInt256(${s}.fr_data0) + reinterpretAsInt256(${s}.br_data0))) / 1e18 * coalesce(${p}.price_usd, 2000.0),
        0.0
      ),

    -- V3-based: token1 is stable/WETH
    ${s}.protocol = 'uniswap_v3' AND lower(${s}.token1) IN ('${USDC}','${USDT}','${DAI}','${WETH}'),
      multiIf(
        lower(${s}.token1) IN ('${USDC}','${USDT}'),
          toFloat64(-(reinterpretAsInt256(${s}.fr_data1) + reinterpretAsInt256(${s}.br_data1))) / 1000000.0,
        lower(${s}.token1) = '${DAI}',
          toFloat64(-(reinterpretAsInt256(${s}.fr_data1) + reinterpretAsInt256(${s}.br_data1))) / 1e18,
        lower(${s}.token1) = '${WETH}',
          toFloat64(-(reinterpretAsInt256(${s}.fr_data1) + reinterpretAsInt256(${s}.br_data1))) / 1e18 * coalesce(${p}.price_usd, 2000.0),
        0.0
      ),
      
    0.0
  )`;
}

/* ── handler ───────────────────────────────────────────────────────────────── */
export async function GET(req: NextRequest) {
  const type = req.nextUrl.searchParams.get("type") ?? "stats";

  try {
    if (type === "stats") {
      const [main, pct] = await Promise.all([
        ch(`
          SELECT
            sum(s.sandwiches)                        AS total_sandwiches,
            uniqMerge(s.unique_victims)              AS unique_victims,
            uniqMerge(s.unique_bots)                 AS unique_bots,
            uniqMerge(s.unique_pools)                AS unique_pools,
            min(s.first_block)                       AS first_block,
            max(s.last_block)                        AS last_block,
            sumIf(s.sandwiches, s.protocol='uniswap_v3')   AS v3_count,
            sumIf(s.sandwiches, s.protocol='uniswap_v2')   AS v2_count,
            sumIf(s.sandwiches, s.protocol='sushiswap_v2') AS sushi_count,
            sumIf(s.sandwiches, s.protocol='curve')        AS curve_count,
            sumIf(s.sandwiches, s.protocol='dodo')         AS dodo_count,
            round(sum(s.gross_profit_usd) + sum(s.gross_profit_weth * coalesce(p.price_usd, 2000.0))) AS total_gross_profit_usd,
            round(sum(s.gas_cost_weth * coalesce(p.price_usd, 2000.0))) AS total_gas_cost_usd
          FROM blob_lens.mev_daily_stats s
          LEFT JOIN blob_lens.eth_daily_price p ON s.date = p.date
        `),
        ch(`
          SELECT
            uniqMerge(s.unique_blocks) AS sandwich_blocks,
            (SELECT count() FROM ethereum.blocks WHERE timestamp >= now() - INTERVAL 30 DAY AND is_deleted=0) AS total_blocks
          FROM blob_lens.mev_daily_stats s
          WHERE s.date >= toDate(now() - INTERVAL 30 DAY)
        `),
      ]);
      return NextResponse.json({
        ...(main[0] ?? {}),
        sandwich_blocks: pct[0]?.sandwich_blocks ?? "0",
        total_blocks:    pct[0]?.total_blocks    ?? "0",
      });
    }

    if (type === "weekly-trend") {
      const weeks = Number(req.nextUrl.searchParams.get("weeks") ?? "16");
      const rows = await ch(`
        SELECT
          toStartOfWeek(s.date)                    AS week,
          sum(s.sandwiches)                        AS sandwiches,
          uniqMerge(s.unique_bots)                 AS active_bots,
          uniqMerge(s.unique_blocks)               AS blocks_sandwiched,
          sumIf(s.sandwiches, s.protocol='uniswap_v3')   AS v3_count,
          sumIf(s.sandwiches, s.protocol='uniswap_v2')   AS v2_count,
          sumIf(s.sandwiches, s.protocol='sushiswap_v2') AS sushi_count,
          sumIf(s.sandwiches, s.protocol='curve')        AS curve_count,
          sumIf(s.sandwiches, s.protocol='dodo')         AS dodo_count,
          round(sum(s.victim_volume_usd) + sum(s.victim_volume_weth * coalesce(p.price_usd, 2000.0))) AS victim_usd_total,
          sum(s.victim_usd_count)                  AS usd_count,
          uniqMerge(s.unique_victims)              AS weekly_victims,
          round(sum(s.gross_profit_usd) + sum(s.gross_profit_weth * coalesce(p.price_usd, 2000.0))) AS bot_profit_usd,
          round(sum(s.gas_cost_weth * coalesce(p.price_usd, 2000.0))) AS bot_gas_usd
        FROM blob_lens.mev_daily_stats s
        LEFT JOIN blob_lens.eth_daily_price p ON s.date = p.date
        WHERE s.date >= toDate(now() - INTERVAL ${weeks} WEEK)
        GROUP BY week
        ORDER BY week ASC
      `);
      return NextResponse.json(rows);
    }

    if (type === "top-bots") {
      const limit = Number(req.nextUrl.searchParams.get("limit") ?? "20");
      const rows = await ch(`
        SELECT
          s.sandwicher,
          count()                             AS sandwiches,
          countDistinct(s.victim_tx)          AS unique_victims,
          countDistinct(s.pool)               AS unique_pools,
          min(s.block_number)                 AS first_seen_block,
          max(s.block_number)                 AS last_seen_block,
          round(sum(${gasCostUsdSql()}))      AS total_gas_cost_usd,
          round(sum(greatest(0.0, ${botProfitUsdSql()}))) AS total_profit_usd,
          round(sum(greatest(0.0, ${botProfitUsdSql()}) - ${gasCostUsdSql()})) AS net_profit_usd
        FROM blob_lens.mev_sandwiches s FINAL
        LEFT JOIN blob_lens.eth_daily_price p ON toDate(s.block_timestamp) = p.date
        GROUP BY s.sandwicher
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
          coalesce(nullIf(s.token0,''), any(pt.token0)) AS token0,
          coalesce(nullIf(s.token1,''), any(pt.token1)) AS token1,
          any(s.protocol)                               AS protocol,
          count()                                  AS sandwiches,
          countDistinct(s.victim_tx)               AS unique_victims,
          countDistinct(s.sandwicher)              AS unique_bots,
          round(sum(greatest(0.0, ${botProfitUsdSql()}))) AS bot_profit_usd
        FROM blob_lens.mev_sandwiches s FINAL
        LEFT JOIN blob_lens.pool_tokens pt FINAL ON s.pool = pt.pool
        LEFT JOIN blob_lens.eth_daily_price p ON toDate(s.block_timestamp) = p.date
        GROUP BY s.pool, s.token0, s.token1
        ORDER BY sandwiches DESC
        LIMIT ${limit}
      `);
      return NextResponse.json(rows);
    }

    if (type === "top-token-pairs") {
      const limit = Number(req.nextUrl.searchParams.get("limit") ?? "20");
      const rows = await ch(`
        SELECT
          s.token0,
          s.token1,
          any(s.protocol)                          AS protocol,
          count()                                  AS sandwiches,
          countDistinct(s.victim_tx)               AS unique_victims,
          countDistinct(s.sandwicher)              AS unique_bots,
          countDistinct(s.pool)                    AS unique_pools,
          round(sum(${victimUsdSql()}))            AS victim_usd_total,
          round(sum(greatest(0.0, ${botProfitUsdSql()}))) AS bot_profit_usd
        FROM blob_lens.mev_sandwiches s FINAL
        LEFT JOIN blob_lens.eth_daily_price p ON toDate(s.block_timestamp) = p.date
        WHERE s.token0 != '' AND s.token1 != ''
        GROUP BY s.token0, s.token1
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
          coalesce(nullIf(s.token0,''), pt.token0, '') AS token0,
          coalesce(nullIf(s.token1,''), pt.token1, '') AS token1,
          round(${victimUsdSql()})                     AS victim_usd,
          round(greatest(0.0, ${botProfitUsdSql()}))   AS bot_profit_usd,
          round(${gasCostUsdSql()})                    AS gas_cost_usd
        FROM blob_lens.mev_sandwiches s FINAL
        LEFT JOIN blob_lens.pool_tokens pt FINAL ON s.pool = pt.pool
        LEFT JOIN blob_lens.eth_daily_price p ON toDate(s.block_timestamp) = p.date
        ORDER BY s.block_number DESC
        LIMIT ${limit}
      `);
      return NextResponse.json(rows);
    }

    if (type === "blocks-pct") {
      const weeks = Number(req.nextUrl.searchParams.get("weeks") ?? "16");
      const rows = await ch(`
        WITH sw_weeks AS (
          SELECT toStartOfWeek(block_timestamp) AS week,
                 countDistinct(block_number)    AS sw_blocks
          FROM blob_lens.mev_sandwiches FINAL
          WHERE block_timestamp >= now() - INTERVAL ${weeks} WEEK
          GROUP BY week
        ),
        all_weeks AS (
          SELECT toStartOfWeek(timestamp) AS week, count() AS total_blocks
          FROM ethereum.blocks FINAL
          WHERE timestamp >= now() - INTERVAL ${weeks} WEEK AND is_deleted = 0
          GROUP BY week
        )
        SELECT a.week, a.total_blocks, coalesce(s.sw_blocks, 0) AS sandwich_blocks
        FROM all_weeks a
        LEFT JOIN sw_weeks s ON a.week = s.week
        ORDER BY a.week ASC
      `);
      return NextResponse.json(rows);
    }

    if (type === "top-tokens") {
      const limit = Number(req.nextUrl.searchParams.get("limit") ?? "30");
      const rows = await ch(`
        SELECT
          token,
          count()                    AS sandwiches,
          countDistinct(victim_tx)   AS unique_victims,
          countDistinct(sandwicher)  AS unique_bots
        FROM (
          SELECT token0 AS token, victim_tx, sandwicher
          FROM blob_lens.mev_sandwiches FINAL
          WHERE token0 != ''
          UNION ALL
          SELECT token1 AS token, victim_tx, sandwicher
          FROM blob_lens.mev_sandwiches FINAL
          WHERE token1 != ''
        )
        GROUP BY token
        ORDER BY sandwiches DESC
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
