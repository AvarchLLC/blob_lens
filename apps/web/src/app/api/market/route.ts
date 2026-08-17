import { NextResponse } from "next/server";
import { queryClickHouse } from "@/lib/clickhouse";

const ETH_USD_FALLBACK = 3_200;
const BLOB_BYTES = 131_072;

const FEE_BASE: Record<number, number> = {
  24: 0.0028,
  168: 0.0035,
  720: 0.016,
  2160: 0.025,
};


const ROLLUPS = ["Arbitrum One", "Base", "OP Mainnet", "Taiko", "Scroll"];
const ROLLUP_COLORS = ["#8B7BFF", "#00C7FF", "#FF6B6B", "#FFD166", "#06D6A0"];

function rng(n: number): number {
  const x = Math.sin(n * 9301 + 49297) * 233280;
  return x - Math.floor(x);
}

function getRegime(util: number): "congested" | "healthy" | "quiet" {
  if (util > 78) return "congested";
  if (util < 32) return "quiet";
  return "healthy";
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  // Live ETH/USD price — best effort
  let ETH_USD = ETH_USD_FALLBACK;
  try {
    const p = await queryClickHouse<any>(`SELECT price_usd FROM blob_lens.eth_daily_price ORDER BY date DESC LIMIT 1`);
    if (p?.[0]?.price_usd) ETH_USD = Number(p[0].price_usd);
  } catch { /* use fallback */ }

  const rawHours = Math.max(1, Math.min(8760, Number(searchParams.get("hours")) || 24));
  // Snap to nearest supported fee-base bucket
  const feeKey = rawHours <= 36 ? 24 : rawHours <= 400 ? 168 : rawHours <= 1000 ? 720 : 2160;
  const hours = rawHours;

  const feeBase = FEE_BASE[feeKey] ?? 0.003;
  // Derive granularity automatically from range
  const stepHours = hours <= 48 ? 1 : hours <= 336 ? 4 : hours <= 1440 ? 24 : 72;
  const count = Math.min(Math.ceil(hours / stepHours), 60);
  const now = Date.now();
  const stepMs = stepHours * 3_600_000;

  // ── Fee trend ──
  const fee_trend = Array.from({ length: count }, (_, i) => {
    const drift = 0.6 + rng(i * 7) * 0.85;
    const spike = rng(i * 3 + 1) > 0.91 ? 2.0 + rng(i) * 2.5 : 1;
    const fee = feeBase * drift * spike;
    return {
      time: new Date(now - (count - i) * stepMs).toISOString(),
      base_fee_gwei: parseFloat(fee.toFixed(7)),
    };
  });

  // ── Utilization ──
  const utilization = Array.from({ length: count }, (_, i) => {
    const base = 45 + Math.sin(i * 0.4) * 18;
    const noise = rng(i * 5 + 2) * 22;
    const spike = rng(i * 11) > 0.88 ? 28 : 0;
    const util = Math.min(99, Math.max(5, base + noise + spike));
    return {
      time: new Date(now - (count - i) * stepMs).toISOString(),
      util_pct: parseFloat(util.toFixed(1)),
      blobs_per_block: parseFloat((util / 100 * 9).toFixed(2)),
    };
  });

  // ── Regime heatmap — always 7d × 24h ──
  const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const regime_heatmap = DAYS.flatMap((day, d) =>
    Array.from({ length: 24 }, (_, h) => {
      const hourBias = h >= 14 && h <= 20 ? 18 : 0;
      const util = Math.min(99, 22 + rng(d * 24 + h + 100) * 58 + hourBias);
      return { hour: h, day: d, day_label: day, util: parseFloat(util.toFixed(1)), regime: getRegime(util) };
    })
  );

  // ── L1 vs Blob cost (USD) ──
  const l1_vs_blob = fee_trend.map((f, i) => {
    const blobUsd = f.base_fee_gwei * BLOB_BYTES / 1e9 * ETH_USD;
    return {
      time: f.time,
      blob_cost_usd: parseFloat(blobUsd.toFixed(5)),
      calldata_cost_usd: parseFloat((blobUsd * (13 + rng(i * 9 + 3) * 7)).toFixed(4)),
    };
  });

  // ── Rollup activity ──
  const rollup_weights = [0.30, 0.25, 0.20, 0.13, 0.12];
  const blobBase = hours <= 24 ? 180 : hours <= 168 ? 720 : 2200;
  const rollup_activity: Record<string, { time: string; blobs: number }[]> = {};
  ROLLUPS.forEach((r, ri) => {
    rollup_activity[r] = fee_trend.map((f, i) => ({
      time: f.time,
      blobs: Math.round(blobBase * rollup_weights[ri] * (0.78 + rng(i * 7 + ri) * 0.44)),
    }));
  });

  // ── Rollup fees ──
  const rollup_fees: Record<string, { time: string; fee_gwei: number }[]> = {};
  ROLLUPS.forEach((r, ri) => {
    rollup_fees[r] = fee_trend.map((f, i) => ({
      time: f.time,
      fee_gwei: parseFloat((feeBase * (0.82 + rng(i * 3 + ri * 11) * 0.38)).toFixed(7)),
    }));
  });

  // ── 12-slot congestion forecast ──
  const latestFee = fee_trend[fee_trend.length - 1].base_fee_gwei;
  const latestUtil = utilization[utilization.length - 1].util_pct;
  const forecast = Array.from({ length: 12 }, (_, i) => {
    const excess = Math.max(0, latestUtil - 50);
    const escalation = Math.pow(1 + (excess / 100) * 0.125, i);
    const fee = latestFee * escalation * (0.97 + rng(i * 17) * 0.06);
    const projUtil = Math.min(99, latestUtil + i * (excess > 0 ? 1.5 : -0.5));
    return {
      slot: i + 1,
      fee_gwei: parseFloat(fee.toFixed(7)),
      regime: getRegime(projUtil),
    };
  });

  // ── KPI ──
  const totalBlobs = utilization.reduce(
    (s, u) => s + Math.round(u.blobs_per_block * 30 * stepHours),
    0
  );
  const avgUtil = utilization.reduce((s, u) => s + u.util_pct, 0) / utilization.length;
  const currentRegime = getRegime(latestUtil);

  const regimeDescriptions = {
    congested: "High demand — blob fees escalating exponentially. Rollups should batch aggressively and delay non-urgent submissions.",
    healthy: "Balanced demand — fees stable near the EIP-4844 target. Optimal window for normal sequencer operations.",
    quiet: "Low demand — fees at or near the protocol floor. Excellent time for bulk data submissions at minimal cost.",
  };

  return NextResponse.json({
    kpi: {
      cost_per_blob_gwei: latestFee,
      cost_per_blob_usd: parseFloat((latestFee * BLOB_BYTES / 1e9 * ETH_USD).toFixed(4)),
      total_blobs: totalBlobs,
      avg_utilization_pct: parseFloat(avgUtil.toFixed(1)),
      top_rollup: "Arbitrum One",
      eth_usd: ETH_USD,
    },
    market_regime: {
      regime: currentRegime,
      description: regimeDescriptions[currentRegime],
      util_pct: parseFloat(latestUtil.toFixed(1)),
      slots_since_last_spike: Math.round(20 + rng(hours * 7 + 999) * 80),
    },
    fee_trend,
    utilization,
    regime_heatmap,
    l1_vs_blob,
    rollup_activity,
    rollup_fees,
    forecast,
    rollups: ROLLUPS,
    rollup_colors: ROLLUP_COLORS,
    hours,
    step_hours: stepHours,
  });
}
