"use client";

import type { ForecastData } from "@/types";

// Post-Pectra EIP-4844 constants
const TARGET_BLOB_GAS_PER_BLOCK = 589_824; // 4.5 blobs × 131_072
const BLOB_GASPRICE_UPDATE_FRACTION = 5_007_716;

interface ForecastPoint {
  blocks: number;
  label: string;
  fee_wei: number;
  delta_pct: number;
}

function computeForecast(data: ForecastData): ForecastPoint[] {
  const { current_fee_wei, avg_blob_gas_used } = data;
  const fee0 = Number(current_fee_wei);
  const avgGas = Number(avg_blob_gas_used);

  return [4, 8, 12, 25, 50].map((blocks) => {
    const exponent = (blocks * (avgGas - TARGET_BLOB_GAS_PER_BLOCK)) / BLOB_GASPRICE_UPDATE_FRACTION;
    const fee_wei = fee0 * Math.exp(exponent);
    const delta_pct = fee0 > 0 ? ((fee_wei - fee0) / fee0) * 100 : 0;
    const seconds = blocks * 12;
    const label =
      seconds < 60
        ? `${seconds}s (~${blocks} blocks)`
        : `${Math.round(seconds / 60)}m (~${blocks} blocks)`;
    return { blocks, label, fee_wei, delta_pct };
  });
}

function formatFee(wei: number): string {
  const gwei = wei / 1e9;
  if (gwei < 0.0001) return gwei.toPrecision(3) + " gwei";
  if (gwei < 1) return gwei.toFixed(4) + " gwei";
  return gwei.toFixed(2) + " gwei";
}

function TrendArrow({ pct }: { pct: number }) {
  if (Math.abs(pct) < 0.5) return <span className="text-[#9CA3AF]">≈</span>;
  return pct > 0 ? (
    <span className="text-[#f97316]">↑</span>
  ) : (
    <span className="text-[#22c55e]">↓</span>
  );
}

interface Props {
  data: ForecastData;
}

export function CongestionForecast({ data }: Props) {
  const points = computeForecast(data);
  const avgGas = Number(data.avg_blob_gas_used);
  const avgBlobs = (avgGas / 131_072).toFixed(1);
  const pressure =
    avgGas > TARGET_BLOB_GAS_PER_BLOCK + 65_536
      ? { label: "Rising", color: "#f97316" }
      : avgGas < TARGET_BLOB_GAS_PER_BLOCK - 65_536
      ? { label: "Falling", color: "#22c55e" }
      : { label: "Stable", color: "#eab308" };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <p className="text-xs text-[#9CA3AF]">
            Based on last {data.sample_size} blocks · avg{" "}
            <span className="font-mono text-foreground">{avgBlobs}</span> blobs/block
          </p>
          <p className="text-xs text-[#9CA3AF]">
            Fee pressure:{" "}
            <span className="font-semibold" style={{ color: pressure.color }}>
              {pressure.label}
            </span>
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-[#9CA3AF]">Current fee</p>
          <p className="font-mono text-sm text-foreground">
            {formatFee(Number(data.current_fee_wei))}
          </p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="pb-2 pr-4 text-left text-xs font-medium uppercase tracking-[0.08em] text-[#9CA3AF]">
                Time horizon
              </th>
              <th className="pb-2 pr-4 text-right text-xs font-medium uppercase tracking-[0.08em] text-[#9CA3AF]">
                Forecast fee
              </th>
              <th className="pb-2 text-right text-xs font-medium uppercase tracking-[0.08em] text-[#9CA3AF]">
                Change
              </th>
            </tr>
          </thead>
          <tbody>
            {points.map((pt) => (
              <tr key={pt.blocks} className="border-b border-border/50">
                <td className="py-2 pr-4 text-xs text-[#9CA3AF]">{pt.label}</td>
                <td className="py-2 pr-4 text-right font-mono text-xs text-foreground">
                  {formatFee(pt.fee_wei)}
                </td>
                <td className="py-2 text-right font-mono text-xs">
                  <TrendArrow pct={pt.delta_pct} />
                  <span
                    className="ml-1"
                    style={{
                      color:
                        Math.abs(pt.delta_pct) < 0.5
                          ? "#9CA3AF"
                          : pt.delta_pct > 0
                          ? "#f97316"
                          : "#22c55e",
                    }}
                  >
                    {Math.abs(pt.delta_pct) < 0.5
                      ? "flat"
                      : `${pt.delta_pct > 0 ? "+" : ""}${pt.delta_pct.toFixed(1)}%`}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-[10px] text-[#4B5563]">
        Estimate uses EIP-4844 fee adjustment formula (post-Pectra constants). Assumes current blob demand continues.
      </p>
    </div>
  );
}
