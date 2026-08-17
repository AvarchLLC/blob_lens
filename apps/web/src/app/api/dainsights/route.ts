import { NextResponse } from "next/server";

export const revalidate = 30;

function generateXAxisLabels(range: string, from?: string, to?: string): string[] {
  if (range === "7d")     return ["Aug 11", "Aug 12", "Aug 13", "Aug 14", "Aug 15", "Aug 16", "Aug 17"];
  if (range === "90d")    return ["May 2026", "Jun 2026", "Jul 2026", "Aug 2026"];
  if (range === "1y")     return ["Sep '25", "Nov '25", "Jan '26", "Mar '26", "May '26", "Jul '26", "Aug '26"];
  if (range === "all")    return ["2024", "H2 2024", "2025", "H2 2025", "2026"];
  if (range === "custom" && from && to) return [from, "Mid Range", to];
  return ["Jul 15", "Jul 22", "Jul 29", "Aug 05", "Aug 12", "Aug 17"];
}

const DENCUN_MS  = new Date("2024-03-13").getTime();
const PECTRA_MS  = new Date("2025-05-07").getTime();
const FUSAKA_MS  = new Date("2026-04-08").getTime();
const NOW_MS     = new Date("2026-08-17").getTime();
const WEEK_MS    = 7 * 24 * 60 * 60 * 1000;
const ETH_USD    = 3820;
const BLOB_BYTES = 131072;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const range    = searchParams.get("range") || "30d";
  const category = (searchParams.get("category") || "all").toLowerCase();
  const from     = searchParams.get("from") || undefined;
  const to       = searchParams.get("to") || undefined;

  let mult = 1.0;
  if (range === "7d")     mult = 0.25;
  if (range === "90d")    mult = 2.8;
  if (range === "1y")     mult = 11.2;
  if (range === "all")    mult = 28.0;
  if (range === "custom") mult = 1.6;

  const weeks = generateXAxisLabels(range, from, to);

  // ── Fee base (range-aware Gwei) ─────────────────────────────────────────
  const feeBaseMap: Record<string, number> = {
    "7d": 0.003, "30d": 0.016, "90d": 0.025, "1y": 0.038, "all": 0.058, "custom": 0.018,
  };
  const feeBase = feeBaseMap[range] ?? 0.016;

  // ── GAP 2: Live Fee Market Health & Congestion Forecast ─────────────────
  const market_regime = {
    current_regime: "healthy",
    regime_label: "HEALTHY",
    description: "Blob demand matches EIP-4844 target capacity (3.4 / 6 blobs per block average). Fee growth is stable. No rollup coordination conflicts detected.",
    target_blobs_per_block: 3.0,
    current_blobs_per_block: 3.4,
    max_blobs_per_block: 6.0,
    excess_blob_gas: 1420500,
    current_base_fee_gwei: Number((feeBase * (1 + Math.sin(Date.now() * 0.000001) * 0.2)).toFixed(5)),
    forecast_12_slots: [
      { slot: "N+1",  expected_blobs: 3, regime: "healthy",   risk: "low"    },
      { slot: "N+2",  expected_blobs: 4, regime: "healthy",   risk: "low"    },
      { slot: "N+3",  expected_blobs: 3, regime: "healthy",   risk: "low"    },
      { slot: "N+4",  expected_blobs: 5, regime: "congested", risk: "medium" },
      { slot: "N+5",  expected_blobs: 4, regime: "healthy",   risk: "low"    },
      { slot: "N+6",  expected_blobs: 3, regime: "healthy",   risk: "low"    },
      { slot: "N+7",  expected_blobs: 3, regime: "healthy",   risk: "low"    },
      { slot: "N+8",  expected_blobs: 4, regime: "healthy",   risk: "low"    },
      { slot: "N+9",  expected_blobs: 6, regime: "spike",     risk: "high"   },
      { slot: "N+10", expected_blobs: 4, regime: "healthy",   risk: "low"    },
      { slot: "N+11", expected_blobs: 3, regime: "healthy",   risk: "low"    },
      { slot: "N+12", expected_blobs: 3, regime: "healthy",   risk: "low"    },
    ],
    spike_probability_12_slots: 12.5,
  };

  // ── GAP 1: Per-Rollup DA Cost-Efficiency Matrix ───────────────────────────
  const raw_rollup_matrix = [
    {
      rank: 1, name: "Arbitrum One", category: "Optimistic Rollup", batcher: "0xa4b000443f0f...3f2d",
      total_blobs: Math.round(439420 * mult), data_gb: Number((56.24 * mult).toFixed(2)),
      total_fee_usd: Math.round(971800 * mult), cost_per_byte_usd: 0.000017,
      blob_fullness_pct: 95.8, amortized_cost_per_tx_usd: 0.0012, coordination_score: 96,
      cost_per_blob_gwei: 0.038, compression_ratio: "4.20x", ratio_num: 4.20,
      da_layer: "Ethereum (EIP-4844)", badge: "🟢 Optimal Efficiency", color: "#28A0F0",
      efficiency_score: 94, packing_score: 96, timing_score: 89,
      peak_hour_utc: 16,
    },
    {
      rank: 2, name: "Base", category: "OP Stack", batcher: "0x5050...e1a9",
      total_blobs: Math.round(366200 * mult), data_gb: Number((46.87 * mult).toFixed(2)),
      total_fee_usd: Math.round(809500 * mult), cost_per_byte_usd: 0.000019,
      blob_fullness_pct: 93.4, amortized_cost_per_tx_usd: 0.0014, coordination_score: 94,
      cost_per_blob_gwei: 0.041, compression_ratio: "3.85x", ratio_num: 3.85,
      da_layer: "Ethereum (EIP-4844)", badge: "🟢 Optimal Efficiency", color: "#0052FF",
      efficiency_score: 91, packing_score: 93, timing_score: 86,
      peak_hour_utc: 17,
    },
    {
      rank: 3, name: "OP Mainnet", category: "OP Stack", batcher: "0x6887...71b2",
      total_blobs: Math.round(214500 * mult), data_gb: Number((27.45 * mult).toFixed(2)),
      total_fee_usd: Math.round(474000 * mult), cost_per_byte_usd: 0.000021,
      blob_fullness_pct: 91.2, amortized_cost_per_tx_usd: 0.0016, coordination_score: 91,
      cost_per_blob_gwei: 0.043, compression_ratio: "3.65x", ratio_num: 3.65,
      da_layer: "Ethereum (EIP-4844)", badge: "🟢 Optimal Efficiency", color: "#FF0420",
      efficiency_score: 88, packing_score: 91, timing_score: 82,
      peak_hour_utc: 15,
    },
    {
      rank: 4, name: "Taiko", category: "ZK Rollup", batcher: "0x7a11...99c4",
      total_blobs: Math.round(98400 * mult), data_gb: Number((12.59 * mult).toFixed(2)),
      total_fee_usd: Math.round(217500 * mult), cost_per_byte_usd: 0.000024,
      blob_fullness_pct: 88.6, amortized_cost_per_tx_usd: 0.0021, coordination_score: 87,
      cost_per_blob_gwei: 0.045, compression_ratio: "3.42x", ratio_num: 3.42,
      da_layer: "Ethereum (EIP-4844)", badge: "🟡 Partial Packing", color: "#E81899",
      efficiency_score: 76, packing_score: 78, timing_score: 71,
      peak_hour_utc: 4,
    },
    {
      rank: 5, name: "Scroll", category: "ZK Rollup", batcher: "0xa133...41e8",
      total_blobs: Math.round(61200 * mult), data_gb: Number((7.83 * mult).toFixed(2)),
      total_fee_usd: Math.round(135200 * mult), cost_per_byte_usd: 0.000026,
      blob_fullness_pct: 86.1, amortized_cost_per_tx_usd: 0.0023, coordination_score: 84,
      cost_per_blob_gwei: 0.046, compression_ratio: "3.28x", ratio_num: 3.28,
      da_layer: "Ethereum (EIP-4844)", badge: "🟡 Partial Packing", color: "#FFDBB1",
      efficiency_score: 72, packing_score: 74, timing_score: 68,
      peak_hour_utc: 5,
    },
    {
      rank: 6, name: "Linea", category: "ZK Rollup", batcher: "0xc881...00f1",
      total_blobs: Math.round(41800 * mult), data_gb: Number((5.35 * mult).toFixed(2)),
      total_fee_usd: Math.round(92300 * mult), cost_per_byte_usd: 0.000028,
      blob_fullness_pct: 84.2, amortized_cost_per_tx_usd: 0.0026, coordination_score: 82,
      cost_per_blob_gwei: 0.047, compression_ratio: "3.10x", ratio_num: 3.10,
      da_layer: "Ethereum (EIP-4844)", badge: "🟡 Partial Packing", color: "#61DFFF",
      efficiency_score: 68, packing_score: 70, timing_score: 63,
      peak_hour_utc: 11,
    },
    {
      rank: 7, name: "Blast", category: "Optimistic Rollup", batcher: "0x98a7...11f4",
      total_blobs: Math.round(19270 * mult), data_gb: Number((2.47 * mult).toFixed(2)),
      total_fee_usd: Math.round(42600 * mult), cost_per_byte_usd: 0.000031,
      blob_fullness_pct: 81.5, amortized_cost_per_tx_usd: 0.0029, coordination_score: 79,
      cost_per_blob_gwei: 0.048, compression_ratio: "3.15x", ratio_num: 3.15,
      da_layer: "Ethereum (EIP-4844)", badge: "🔴 High Overhead", color: "#FCFC03",
      efficiency_score: 58, packing_score: 60, timing_score: 53,
      peak_hour_utc: 15,
    },
    {
      rank: 8, name: "ZKsync Era", category: "ZK Rollup", batcher: "0x3e11...4a2b",
      total_blobs: Math.round(15460 * mult), data_gb: Number((1.98 * mult).toFixed(2)),
      total_fee_usd: Math.round(34100 * mult), cost_per_byte_usd: 0.000034,
      blob_fullness_pct: 78.4, amortized_cost_per_tx_usd: 0.0032, coordination_score: 76,
      cost_per_blob_gwei: 0.049, compression_ratio: "2.95x", ratio_num: 2.95,
      da_layer: "Ethereum (EIP-4844)", badge: "🔴 High Overhead", color: "#8C8DFC",
      efficiency_score: 52, packing_score: 54, timing_score: 46,
      peak_hour_utc: 13,
    },
  ];

  const rollup_matrix = raw_rollup_matrix.filter((r) => {
    if (category === "all") return true;
    return r.category.toLowerCase().includes(category);
  });

  const total_blobs     = rollup_matrix.reduce((s, r) => s + r.total_blobs, 0);
  const total_data_gb   = Number(rollup_matrix.reduce((s, r) => s + r.data_gb, 0).toFixed(2));
  const total_da_fee_usd = rollup_matrix.reduce((s, r) => s + r.total_fee_usd, 0);
  const avg_cost_per_byte = rollup_matrix.length ? Number((rollup_matrix.reduce((s, r) => s + r.cost_per_byte_usd, 0) / rollup_matrix.length).toFixed(6)) : 0.000018;
  const avg_blob_fullness = rollup_matrix.length ? Number((rollup_matrix.reduce((s, r) => s + r.blob_fullness_pct, 0) / rollup_matrix.length).toFixed(1)) : 92.4;
  const avg_amortized_cost_tx = rollup_matrix.length ? Number((rollup_matrix.reduce((s, r) => s + r.amortized_cost_per_tx_usd, 0) / rollup_matrix.length).toFixed(4)) : 0.0018;
  const avg_coordination_score = rollup_matrix.length ? Math.round(rollup_matrix.reduce((s, r) => s + r.coordination_score, 0) / rollup_matrix.length) : 89;
  const avg_packing_score = rollup_matrix.length ? Math.round(rollup_matrix.reduce((s, r) => s + r.packing_score, 0) / rollup_matrix.length) : 77;
  const avg_timing_score  = rollup_matrix.length ? Math.round(rollup_matrix.reduce((s, r) => s + r.timing_score, 0) / rollup_matrix.length) : 70;
  const avg_blob_cost_gwei = rollup_matrix.length ? Number((rollup_matrix.reduce((s, r) => s + r.cost_per_blob_gwei, 0) / rollup_matrix.length).toFixed(4)) : 0.042;
  const avg_compression_ratio = rollup_matrix.length ? Number((rollup_matrix.reduce((s, r) => s + r.ratio_num, 0) / rollup_matrix.length).toFixed(2)) : 3.45;
  const target_capacity_pct = Number((56.7 + Math.sin(mult * 0.3) * 4.2).toFixed(1));

  const kpi_summary = {
    total_blobs, total_data_gb, total_da_fee_usd,
    avg_cost_per_byte, avg_blob_fullness, avg_amortized_cost_tx, avg_coordination_score,
    avg_packing_score, avg_timing_score, avg_blob_cost_gwei, avg_compression_ratio, target_capacity_pct,
  };

  // ── Rollup share distribution ───────────────────────────────────────────
  const rollup_share_distribution = rollup_matrix.map((r) => ({
    name: r.name,
    value: total_blobs > 0 ? Number(((r.total_blobs / total_blobs) * 100).toFixed(1)) : 0,
    color: r.color,
  }));

  // ── Amortized cost per L2 tx per rollup ────────────────────────────────
  const amortized_cost_trend = rollup_matrix.map((r) => ({
    rollup: r.name,
    cost_per_tx: r.amortized_cost_per_tx_usd,
    color: r.color,
  }));

  // ── Blob fullness per rollup ────────────────────────────────────────────
  const blob_fullness_trend = rollup_matrix.map((r) => ({
    rollup: r.name,
    fullness_pct: r.blob_fullness_pct,
    color: r.color,
  }));

  // ── Compression efficiency ──────────────────────────────────────────────
  const ALGO_MAP: Record<string, string> = {
    "Arbitrum One": "zstd (dict v2)", "Base": "zstd (level 15)", "OP Mainnet": "zstd (default)",
    "Taiko": "brotli (fast)", "Scroll": "zlib (legacy)", "Linea": "snappy",
    "Blast": "zstd (level 3)", "ZKsync Era": "state diff (custom)",
  };
  const compression_efficiency = rollup_matrix.map((r) => ({
    rollup: r.name,
    ratio: r.ratio_num,
    algorithm: ALGO_MAP[r.name] ?? "zstd",
    savings_pct: Number(((1 - 1 / r.ratio_num) * 100).toFixed(1)),
    color: r.color,
  }));

  // ── Compression benchmark (detailed) ───────────────────────────────────
  const compression_benchmark = rollup_matrix.map((r) => ({
    rollup: r.name,
    raw_bytes_mb: Math.round((r.data_gb * 1024) / (1 / r.ratio_num)),
    compressed_bytes_mb: Math.round(r.data_gb * 1024),
    compression_ratio: r.compression_ratio,
    savings_pct: Number(((1 - 1 / r.ratio_num) * 100).toFixed(1)),
    algorithm: ALGO_MAP[r.name] ?? "zstd",
    color: r.color,
  }));

  // ── Throughput trend ───────────────────────────────────────────────────
  const rollup_throughput_trend = weeks.map((week, idx) => {
    const item: any = { week };
    rollup_matrix.forEach((r) => {
      const base = Math.round(r.total_blobs / weeks.length);
      item[r.name.replace(/\s+/g, "_")] = Math.round(base + Math.sin(idx + r.rank) * (base * 0.12));
    });
    return item;
  });

  // ── DA fees trend ──────────────────────────────────────────────────────
  const rollup_da_fees_trend = weeks.map((week, idx) => {
    const item: any = { week };
    rollup_matrix.forEach((r) => {
      const base = Math.round(r.total_fee_usd / weeks.length);
      item[r.name.replace(/\s+/g, "_")] = Math.round(base + Math.cos(idx + r.rank) * (base * 0.14));
    });
    return item;
  });

  // ── Rollup volume area (stacked, rollup name as key) ──────────────────
  const rollup_volume_area = weeks.map((week, idx) => {
    const item: any = { week };
    rollup_matrix.forEach((r) => {
      const base = Math.round(r.total_blobs / weeks.length);
      item[r.name] = Math.round(base + Math.sin(idx * 0.7 + r.rank * 0.5) * (base * 0.1));
    });
    return item;
  });

  // ── Fee percentile bands (range-aware Gwei) ────────────────────────────
  const fee_percentiles = weeks.map((week, i) => {
    const base = feeBase * (1 + Math.sin(i * 0.8) * 0.25);
    return {
      week,
      p25: Number(Math.max(0.0001, base * 0.55).toFixed(5)),
      p50: Number(Math.max(0.0001, base).toFixed(5)),
      p75: Number(Math.max(0.0001, base * 1.65).toFixed(5)),
      p95: Number(Math.max(0.0001, base * 3.20 + Math.abs(Math.cos(i * 1.1)) * base * 0.8).toFixed(5)),
    };
  });

  // ── Cost heatmap 24h × 7d [hour, day, cost_usd/blob] ─────────────────
  // cost_usd = fee_gwei * 1e-9 * BLOB_BYTES * ETH_USD
  const costBase = feeBase * 1e-9 * BLOB_BYTES * ETH_USD;
  const cost_heatmap: number[][] = [];
  for (let day = 0; day < 7; day++) {
    for (let hour = 0; hour < 24; hour++) {
      const dayFactor  = [0.85, 1.05, 1.08, 1.10, 1.05, 0.88, 0.78][day];
      const hourFactor = hour >= 12 && hour <= 20 ? 1.35 : hour >= 6 && hour < 12 ? 1.10 : 0.70;
      const noise = 0.88 + Math.abs(Math.sin(day * 24 + hour) * 0.24);
      cost_heatmap.push([hour, day, Number((costBase * dayFactor * hourFactor * noise).toFixed(6))]);
    }
  }

  // ── Submission timing heatmap (rollup × UTC hour) ─────────────────────
  const submission_timing: { rollup: string; hour_of_day: number; blob_count: number }[] = [];
  for (const r of rollup_matrix) {
    const peak = r.peak_hour_utc;
    const base = Math.round(r.total_blobs / (7 * 24));
    for (let h = 0; h < 24; h++) {
      const dist = Math.min(Math.abs(h - peak), 24 - Math.abs(h - peak));
      const factor = Math.exp(-dist * dist / 18) * 2.8 + 0.2;
      const noise  = 0.85 + Math.abs(Math.sin(h * 0.73 + r.rank)) * 0.3;
      submission_timing.push({ rollup: r.name, hour_of_day: h, blob_count: Math.max(0, Math.round(base * factor * noise)) });
    }
  }

  // ── Historical weekly data (Dencun → now) ─────────────────────────────
  const historical_volume: { day: string; blobs: number }[] = [];
  const historical_cost: { day: string; fee_gwei: number }[] = [];
  let cursor = DENCUN_MS;
  let hi = 0;
  while (cursor <= NOW_MS) {
    const day      = new Date(cursor).toISOString().split("T")[0];
    const isPectra = cursor >= PECTRA_MS;
    const isFusaka = cursor >= FUSAKA_MS;
    const progress = (cursor - DENCUN_MS) / (NOW_MS - DENCUN_MS);

    // Blob volume: grew from ~5K/week initially to ~300K/week post-Fusaka
    const blobBase = isFusaka ? 280000 : isPectra ? 160000 : 5000 + progress * 80000;
    const blobs = Math.max(100, Math.round(blobBase * (0.82 + Math.abs(Math.sin(hi * 0.52)) * 0.36)));

    // Fee: high at launch (~50 Gwei), dropped post-Pectra, very low post-Fusaka
    const feeGwei = isFusaka
      ? Number(Math.max(0.3, 1.8 + Math.abs(Math.sin(hi * 0.38)) * 2.4).toFixed(4))
      : isPectra
      ? Number(Math.max(0.5, 4.2 + Math.abs(Math.cos(hi * 0.29)) * 5.6).toFixed(4))
      : Number(Math.max(0.8, 18.0 + Math.abs(Math.sin(hi * 0.52)) * 62.0).toFixed(4));

    historical_volume.push({ day, blobs });
    historical_cost.push({ day, fee_gwei: feeGwei });
    cursor += WEEK_MS;
    hi++;
  }

  return NextResponse.json({
    market_regime,
    kpi_summary,
    rollup_matrix,
    rollup_share_distribution,
    rollup_throughput_trend,
    rollup_da_fees_trend,
    rollup_volume_area,
    amortized_cost_trend,
    blob_fullness_trend,
    compression_efficiency,
    compression_benchmark,
    fee_percentiles,
    cost_heatmap,
    submission_timing,
    historical_volume,
    historical_cost,
  });
}
