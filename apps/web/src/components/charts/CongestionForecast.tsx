"use client";

import type { ForecastData, MarketRegime } from "@/types";

// Post-Pectra EIP-4844 constants
const TARGET_BLOB_GAS_PER_BLOCK = 589_824;   // 4.5 blobs × 131_072
const MAX_BLOB_GAS_PER_BLOCK    = 1_179_648; // 9 blobs × 131_072
const BLOB_GASPRICE_UPDATE_FRACTION = 5_007_716;

const REGIME_LABEL: Record<MarketRegime, string> = {
  undersaturated: "Quiet",
  healthy:        "Healthy",
  congested:      "Congested",
  spike:          "Spike",
};

const REGIME_COLOR: Record<MarketRegime, string> = {
  undersaturated: "#3f3f46",
  healthy:        "#00df81",
  congested:      "#fcbb00",
  spike:          "#fb2c36",
};

const REGIME_BG: Record<MarketRegime, string> = {
  undersaturated: "rgba(63,63,70,0.15)",
  healthy:        "rgba(0,223,129,0.12)",
  congested:      "rgba(252,187,0,0.12)",
  spike:          "rgba(251,44,54,0.12)",
};

function regimeFromUtil(utilization: number): MarketRegime {
  if (utilization < 0.20) return "undersaturated";
  if (utilization < 0.80) return "healthy";
  if (utilization < 0.95) return "congested";
  return "spike";
}

interface ForecastPoint {
  blocks: number;
  label: string;
  fee_wei: number;
  delta_pct: number;
  regime: MarketRegime;
}

function computeForecast(data: ForecastData): ForecastPoint[] {
  const fee0    = Number(data.current_fee_wei);
  const avgGas  = Number(data.avg_blob_gas_used);
  const trend   = Number(data.excess_trend ?? 0);

  // Project utilization accounting for trend direction (clamped to realistic range)
  const trendedGas = Math.max(0, Math.min(MAX_BLOB_GAS_PER_BLOCK,
    avgGas + trend * 0.05  // 5% weight on trend to smooth projections
  ));
  const utilization = trendedGas / MAX_BLOB_GAS_PER_BLOCK;

  return [4, 8, 12, 25, 50].map((blocks) => {
    const exponent = (blocks * (avgGas - TARGET_BLOB_GAS_PER_BLOCK)) / BLOB_GASPRICE_UPDATE_FRACTION;
    const fee_wei  = Math.max(1, fee0 * Math.exp(exponent));
    const delta_pct = fee0 > 0 ? ((fee_wei - fee0) / fee0) * 100 : 0;
    // Regime worsens proportionally as excess builds
    const blocksRatio = blocks / 50;
    const projectedUtil = utilization + (trend > 0 ? blocksRatio * 0.05 : trend < 0 ? -blocksRatio * 0.03 : 0);
    const regime = regimeFromUtil(Math.max(0, Math.min(1, projectedUtil)));
    const seconds = blocks * 12;
    const label   = seconds < 60 ? `${seconds}s (~${blocks}b)` : `${Math.round(seconds / 60)}m (~${blocks}b)`;
    return { blocks, label, fee_wei, delta_pct, regime };
  });
}

function formatFee(wei: number): string {
  const gwei = wei / 1e9;
  if (gwei < 0.0001) return gwei.toPrecision(3) + " gwei";
  if (gwei < 1)      return gwei.toFixed(4) + " gwei";
  return gwei.toFixed(2) + " gwei";
}

interface Props { data: ForecastData }

export function CongestionForecast({ data }: Props) {
  const points   = computeForecast(data);
  const avgGas   = Number(data.avg_blob_gas_used);
  const avgBlobs = (avgGas / 131_072).toFixed(1);
  const trend    = Number(data.excess_trend ?? 0);
  const currentUtil = avgGas / MAX_BLOB_GAS_PER_BLOCK;
  const currentRegime = regimeFromUtil(currentUtil);

  const pressure =
    trend > 20_000  ? { label: "Building ↑", color: "#fb2c36" }
    : trend > 5_000 ? { label: "Rising →",   color: "#fcbb00" }
    : trend < -5_000 ? { label: "Easing ↓",  color: "#00df81" }
    : { label: "Stable", color: "#a1a1aa" };

  // Best window: first horizon where regime is healthy or better
  const bestWindow = points.find(p => p.regime === "healthy" || p.regime === "undersaturated");
  const recommendation =
    currentRegime === "congested" || currentRegime === "spike"
      ? bestWindow
        ? `Cost likely eases by ~${bestWindow.label} — batch blobs and wait`
        : "Sustained congestion projected — submit now to avoid worse fees"
      : currentRegime === "healthy"
      ? "Market is healthy — safe to submit any time in this window"
      : "Network is quiet — excellent time to post blobs cheaply";

  return (
    <div className="space-y-4">
      {/* Header: summary stats */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">
            Based on last {data.sample_size} blocks · avg{" "}
            <span className="font-mono text-foreground">{avgBlobs}</span> blobs/block
          </p>
          <p className="text-xs text-muted-foreground">
            Fee pressure:{" "}
            <span className="font-semibold" style={{ color: pressure.color }}>
              {pressure.label}
            </span>
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground">Current fee</p>
          <p className="font-mono text-sm text-foreground">
            {formatFee(Number(data.current_fee_wei))}
          </p>
        </div>
      </div>

      {/* Visual regime timeline strip */}
      <div className="space-y-1.5">
        <p className="text-[10px] uppercase tracking-[0.10em] text-muted-foreground font-medium">
          Projected regime
        </p>
        <div className="flex gap-1">
          {/* Current */}
          <div className="flex flex-col items-center gap-1 min-w-0 flex-1">
            <div
              className="w-full h-6 rounded-md flex items-center justify-center text-[10px] font-semibold"
              style={{ background: REGIME_BG[currentRegime], color: REGIME_COLOR[currentRegime], border: `1px solid ${REGIME_COLOR[currentRegime]}33` }}
            >
              Now
            </div>
            <span className="text-[9px] text-muted-foreground">now</span>
          </div>
          {points.slice(0, 4).map((pt) => (
            <div key={pt.blocks} className="flex flex-col items-center gap-1 min-w-0 flex-1">
              <div
                className="w-full h-6 rounded-md flex items-center justify-center text-[10px] font-semibold"
                style={{ background: REGIME_BG[pt.regime], color: REGIME_COLOR[pt.regime], border: `1px solid ${REGIME_COLOR[pt.regime]}33` }}
              >
                {REGIME_LABEL[pt.regime]}
              </div>
              <span className="text-[9px] text-muted-foreground">{pt.label.split(" ")[0]}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Recommendation */}
      <div
        className="rounded-lg px-3 py-2.5 text-xs font-medium"
        style={{ background: REGIME_BG[currentRegime], color: REGIME_COLOR[currentRegime], border: `1px solid ${REGIME_COLOR[currentRegime]}22` }}
      >
        {recommendation}
      </div>

      {/* Fee projection table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="pb-2 pr-4 text-left text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">Horizon</th>
              <th className="pb-2 pr-4 text-left text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">Regime</th>
              <th className="pb-2 pr-4 text-right text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">Forecast fee</th>
              <th className="pb-2 text-right text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">Δ</th>
            </tr>
          </thead>
          <tbody>
            {points.map((pt) => {
              const isFlat = Math.abs(pt.delta_pct) < 0.5;
              const deltaColor = isFlat ? "#71717a" : pt.delta_pct > 0 ? "#f97316" : "#00df81";
              return (
                <tr key={pt.blocks} className="border-b border-border/50">
                  <td className="py-2 pr-4 text-xs text-muted-foreground">{pt.label}</td>
                  <td className="py-2 pr-4">
                    <span
                      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold"
                      style={{ background: REGIME_BG[pt.regime], color: REGIME_COLOR[pt.regime] }}
                    >
                      <span className="h-1.5 w-1.5 rounded-full inline-block" style={{ background: REGIME_COLOR[pt.regime] }} />
                      {REGIME_LABEL[pt.regime]}
                    </span>
                  </td>
                  <td className="py-2 pr-4 text-right font-mono text-xs text-foreground">
                    {formatFee(pt.fee_wei)}
                  </td>
                  <td className="py-2 text-right font-mono text-xs" style={{ color: deltaColor }}>
                    {isFlat ? "≈ flat" : `${pt.delta_pct > 0 ? "+" : ""}${pt.delta_pct.toFixed(1)}%`}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="text-[10px] text-muted-foreground">
        EIP-4844 fee formula (post-Pectra). Assumes current blob demand continues. Regime projected from utilization trend.
      </p>
    </div>
  );
}
