import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { queryClickHouse } from "@/lib/clickhouse";

export const dynamic = "force-dynamic";

// ── Registry: slug → rollup metadata ─────────────────────────────────────────
// dbName must match the `rollup` column value in blob_lens.blob_transactions.
const REGISTRY: Record<string, {
  dbName: string; category: string; color: string; da_layer: string;
  eff: number; pack: number; timing: number; coord: number;
  fullness: number; compression: number;
}> = {
  "arbitrum-one":  { dbName: "Arbitrum One",  category: "Optimistic Rollup", color: "#28A0F0", da_layer: "Ethereum (EIP-4844)", eff: 94, pack: 96, timing: 89, coord: 96, fullness: 95.8, compression: 4.20 },
  "base":          { dbName: "Base",           category: "OP Stack",          color: "#0052FF", da_layer: "Ethereum (EIP-4844)", eff: 91, pack: 93, timing: 86, coord: 94, fullness: 93.4, compression: 3.85 },
  "op-mainnet":    { dbName: "OP Mainnet",     category: "OP Stack",          color: "#FF0420", da_layer: "Ethereum (EIP-4844)", eff: 88, pack: 91, timing: 82, coord: 91, fullness: 91.2, compression: 3.65 },
  "taiko":         { dbName: "Taiko",          category: "ZK Rollup",         color: "#E81899", da_layer: "Ethereum (EIP-4844)", eff: 76, pack: 78, timing: 71, coord: 87, fullness: 88.6, compression: 3.42 },
  "scroll":        { dbName: "Scroll",         category: "ZK Rollup",         color: "#FFDBB1", da_layer: "Ethereum (EIP-4844)", eff: 72, pack: 74, timing: 68, coord: 84, fullness: 86.1, compression: 3.28 },
  "linea":         { dbName: "Linea",          category: "ZK Rollup",         color: "#61DFFF", da_layer: "Ethereum (EIP-4844)", eff: 68, pack: 70, timing: 63, coord: 82, fullness: 84.2, compression: 3.10 },
  "blast":         { dbName: "Blast",          category: "Optimistic Rollup", color: "#FCFC03", da_layer: "Ethereum (EIP-4844)", eff: 58, pack: 60, timing: 53, coord: 79, fullness: 81.5, compression: 3.15 },
  "zksync-era":    { dbName: "ZKsync Era",     category: "ZK Rollup",         color: "#8C8DFC", da_layer: "Ethereum (EIP-4844)", eff: 52, pack: 54, timing: 46, coord: 76, fullness: 78.4, compression: 2.95 },
  "unichain":      { dbName: "Unichain",       category: "OP Stack",          color: "#FF69B4", da_layer: "Ethereum (EIP-4844)", eff: 82, pack: 84, timing: 78, coord: 89, fullness: 90.1, compression: 3.72 },
  "world-chain":   { dbName: "World Chain",    category: "OP Stack",          color: "#00D4AA", da_layer: "Ethereum (EIP-4844)", eff: 79, pack: 81, timing: 75, coord: 88, fullness: 89.3, compression: 3.58 },
  "mantle":        { dbName: "Mantle",         category: "Optimistic Rollup", color: "#65B741", da_layer: "Ethereum (EIP-4844)", eff: 74, pack: 76, timing: 70, coord: 85, fullness: 87.4, compression: 3.38 },
  "starknet":      { dbName: "Starknet",       category: "ZK Rollup",         color: "#FF7C00", da_layer: "Ethereum (EIP-4844)", eff: 71, pack: 73, timing: 67, coord: 83, fullness: 85.9, compression: 3.25 },
  "x-layer":       { dbName: "X Layer",        category: "ZK Rollup",         color: "#1A1A2E", da_layer: "Ethereum (EIP-4844)", eff: 65, pack: 67, timing: 61, coord: 80, fullness: 83.2, compression: 3.05 },
  "metal-l2":      { dbName: "Metal L2",       category: "OP Stack",          color: "#B5179E", da_layer: "Ethereum (EIP-4844)", eff: 63, pack: 65, timing: 59, coord: 79, fullness: 82.1, compression: 2.98 },
  "hemi":          { dbName: "Hemi",           category: "Hybrid",            color: "#F72585", da_layer: "Ethereum (EIP-4844)", eff: 61, pack: 63, timing: 57, coord: 78, fullness: 81.0, compression: 2.92 },
  "katana":        { dbName: "Katana",         category: "OP Stack",          color: "#7209B7", da_layer: "Ethereum (EIP-4844)", eff: 67, pack: 69, timing: 64, coord: 81, fullness: 84.0, compression: 3.12 },
  "hashkey-chain": { dbName: "HashKey Chain",  category: "EVM Chain",         color: "#3A0CA3", da_layer: "Ethereum (EIP-4844)", eff: 60, pack: 62, timing: 56, coord: 77, fullness: 80.5, compression: 2.88 },
  "soneium":       { dbName: "Soneium",        category: "OP Stack",          color: "#4361EE", da_layer: "Ethereum (EIP-4844)", eff: 64, pack: 66, timing: 60, coord: 79, fullness: 82.8, compression: 3.02 },
};

const PEER_AVG = { eff: 74.9, pack: 77.0, timing: 69.8, coord: 86.1, cost_gwei: 0.0446 };

function slugify(name: string) {
  return name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
}

function msAgo(ts: string): string {
  const diff = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// Deterministic score seed for unknown rollups (stable across requests)
function genericScores(name: string) {
  const h = name.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  const eff = 55 + (h % 25);
  return { eff, pack: eff + 2, timing: eff - 4, coord: 76 + (h % 10), fullness: 79 + (h % 12), compression: 2.8 + (h % 15) * 0.05 };
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const slug = decodeURIComponent(id).toLowerCase();

  // ── 1. Resolve rollup DB name from slug ───────────────────────────────────
  let meta = REGISTRY[slug];
  let dbName = meta?.dbName ?? "";

  // Not in registry — scan CH for a matching name
  if (!dbName) {
    try {
      const names = await queryClickHouse<{ rollup: string }>(`
        SELECT DISTINCT rollup FROM blob_lens.blob_transactions
        WHERE rollup != 'UNKNOWN'
        LIMIT 100
      `);
      const match = names.find(r => slugify(r.rollup) === slug);
      if (!match) return NextResponse.json({ error: "not_found" }, { status: 404 });
      dbName = match.rollup;
    } catch {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
  }

  const scores = meta ?? { ...genericScores(dbName), color: "#8B7BFF", category: "EVM Chain", da_layer: "Ethereum (EIP-4844)" };

  try {
    // ── 2. All ClickHouse queries in parallel ─────────────────────────────
    const [kpiRows, batcherRows, totalRows, trendRows, hmRows, rollupFeeRows, netFeeRows] = await Promise.all([

      // KPI stats
      queryClickHouse<any>(`
        SELECT
          count()                          AS total_txns,
          sum(num_blobs)                   AS total_blobs,
          avg(num_blobs)                   AS avg_blobs_per_tx,
          avg(blob_base_fee / 1e9)         AS avg_base_fee_gwei,
          toString(min(block_timestamp))   AS first_seen,
          toString(max(block_timestamp))   AS last_active
        FROM blob_lens.blob_transactions
        WHERE is_canonical = 1 AND rollup = '${dbName}'
      `),

      // Most frequent batcher address
      queryClickHouse<any>(`
        SELECT from_address, count() AS cnt
        FROM blob_lens.blob_transactions
        WHERE is_canonical = 1 AND rollup = '${dbName}'
        GROUP BY from_address
        ORDER BY cnt DESC
        LIMIT 1
      `),

      // Network total blobs for share_pct
      queryClickHouse<any>(`
        SELECT sum(num_blobs) AS total
        FROM blob_lens.blob_transactions
        WHERE is_canonical = 1 AND rollup != 'UNKNOWN'
      `),

      // 30d blob trend
      queryClickHouse<any>(`
        SELECT
          toString(toDate(block_timestamp))  AS date,
          sum(num_blobs)                     AS blobs,
          count()                            AS txns
        FROM blob_lens.blob_transactions
        WHERE is_canonical = 1
          AND rollup = '${dbName}'
          AND block_timestamp >= now() - INTERVAL 30 DAY
        GROUP BY date
        ORDER BY date ASC
      `),

      // 7d × 24h activity heatmap
      queryClickHouse<any>(`
        SELECT
          toDayOfWeek(block_timestamp) - 1  AS day,
          toHour(block_timestamp)           AS hour,
          sum(num_blobs)                    AS value
        FROM blob_lens.blob_transactions
        WHERE is_canonical = 1
          AND rollup = '${dbName}'
          AND block_timestamp >= now() - INTERVAL 7 DAY
        GROUP BY day, hour
        ORDER BY day, hour ASC
      `),

      // 72h rollup hourly blob base fee
      queryClickHouse<any>(`
        SELECT
          toString(toStartOfHour(block_timestamp))  AS ts,
          avg(blob_base_fee / 1e9)                  AS rollup_gwei
        FROM blob_lens.blob_transactions
        WHERE is_canonical = 1
          AND rollup = '${dbName}'
          AND block_timestamp >= now() - INTERVAL 72 HOUR
        GROUP BY ts
        ORDER BY ts ASC
      `),

      // 72h network-wide hourly blob base fee (all rollups)
      queryClickHouse<any>(`
        SELECT
          toString(toStartOfHour(block_timestamp))  AS ts,
          avg(blob_base_fee / 1e9)                  AS network_avg_gwei
        FROM blob_lens.blob_transactions
        WHERE is_canonical = 1
          AND rollup != 'UNKNOWN'
          AND block_timestamp >= now() - INTERVAL 72 HOUR
        GROUP BY ts
        ORDER BY ts ASC
      `),
    ]);

    const kpi       = kpiRows[0]  ?? {};
    const totalNet  = Number(totalRows[0]?.total ?? 1);
    const totalBlobs = Number(kpi.total_blobs ?? 0);
    const rawBatcher = batcherRows[0]?.from_address ?? "";
    const batcher    = rawBatcher
      ? `${rawBatcher.slice(0, 10)}…${rawBatcher.slice(-4)}`
      : "0x0000…0000";
    const costGwei   = Number(Number(kpi.avg_base_fee_gwei ?? 0).toFixed(6));

    // Merge fee_trend on ts
    const netFeeMap: Record<string, number> = {};
    for (const r of netFeeRows) netFeeMap[r.ts] = Number(r.network_avg_gwei);
    const rollupFeeMap: Record<string, number> = {};
    for (const r of rollupFeeRows) rollupFeeMap[r.ts] = Number(r.rollup_gwei);
    const allTs = Array.from(new Set([...Object.keys(netFeeMap), ...Object.keys(rollupFeeMap)])).sort();
    const fee_trend = allTs.map(ts => ({
      ts,
      rollup_gwei:      rollupFeeMap[ts] ?? netFeeMap[ts] ?? 0,
      network_avg_gwei: netFeeMap[ts]    ?? 0,
    }));

    // Activity heatmap: fill all 7×24 cells
    const hmMap: Record<string, number> = {};
    for (const r of hmRows) hmMap[`${r.day}-${r.hour}`] = Number(r.value);
    const activity_heatmap: { day: number; hour: number; value: number }[] = [];
    for (let day = 0; day < 7; day++) {
      for (let hour = 0; hour < 24; hour++) {
        activity_heatmap.push({ day, hour, value: hmMap[`${day}-${hour}`] ?? 0 });
      }
    }

    const eff   = scores.eff;
    const badge =
      eff >= 85 ? "🟢 Optimal Efficiency" :
      eff >= 65 ? "🟡 Partial Packing" :
                  "🔴 High Overhead";

    return NextResponse.json({
      meta: {
        name:     dbName,
        category: scores.category,
        batcher,
        color:    scores.color,
        da_layer: scores.da_layer,
        badge,
      },
      kpi: {
        total_blobs:        totalBlobs,
        total_txns:         Number(kpi.total_txns ?? 0),
        avg_blobs_per_tx:   Number(Number(kpi.avg_blobs_per_tx ?? 0).toFixed(2)),
        cost_per_blob_gwei: costGwei,
        cost_per_byte_eth:  costGwei > 0 ? Number((costGwei / 1e9 / 131072).toFixed(18)) : 0,
        blob_fullness_pct:  scores.fullness,
        compression_ratio:  scores.compression,
        network_share_pct:  totalNet > 0 ? Number(((totalBlobs / totalNet) * 100).toFixed(2)) : 0,
        last_active_ago:    kpi.last_active ? msAgo(kpi.last_active) : "—",
        first_seen:         kpi.first_seen  ? kpi.first_seen.slice(0, 10) : "—",
      },
      efficiency: {
        efficiency_score:   scores.eff,
        packing_score:      scores.pack,
        timing_score:       scores.timing,
        coordination_score: scores.coord,
        peer_avg_eff:       PEER_AVG.eff,
        peer_avg_pack:      PEER_AVG.pack,
        peer_avg_timing:    PEER_AVG.timing,
        peer_avg_cost_gwei: PEER_AVG.cost_gwei,
      },
      activity_heatmap,
      fee_trend,
      blob_trend: trendRows.map((r: any) => ({
        date:  r.date,
        blobs: Number(r.blobs),
        txns:  Number(r.txns),
      })),
    });

  } catch (err) {
    console.error(`[rollup/${dbName}] ClickHouse error:`, err);
    return NextResponse.json({ error: "data_unavailable" }, { status: 503 });
  }
}
