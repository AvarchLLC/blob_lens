"use client";

import { useMemo } from "react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import type { LeaderboardRow } from "@/types";
import { RollupBadge } from "@/components/shared/RollupBadge";
import { formatNumber } from "@/lib/utils";

interface Props {
  leaderboard: LeaderboardRow[];
  networkAvgGwei: number;
  ethUsd?: number;
}

export function EfficiencyComparisonTable({ leaderboard, networkAvgGwei, ethUsd }: Props) {
  const rows = useMemo(() =>
    leaderboard
      .filter((r) => r.rollup !== "UNKNOWN" && Number(r.total_blobs) > 0)
      .sort((a, b) => Number(b.efficiency_score) - Number(a.efficiency_score)),
    [leaderboard]
  );

  if (!rows.length)
    return <p className="py-8 text-center text-xs text-text-secondary opacity-40 italic font-mono">No rollup data</p>;

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-border/30">
            {["#", "Rollup", "Blobs", "Fullness Ratio", "Packing Density", "Coordination", "Avg Fee", "Cost / KB", "vs Network", "Efficiency"].map((h) => (
              <th key={h} className="pb-3 pr-3 last:pr-0 text-left text-[9px] font-bold uppercase tracking-[0.2em] text-text-secondary opacity-50 whitespace-nowrap">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border/10">
          {rows.map((row, i) => {
            const score   = Number(row.efficiency_score);
            const packing = Number(row.packing_score);
            const timing  = Number(row.timing_score);
            const feeGwei = Number(row.cost_per_blob_gwei);
            const delta   = networkAvgGwei > 0 ? ((feeGwei - networkAvgGwei) / networkAvgGwei) * 100 : 0;
            const scoreColor = "var(--primary)";

            // Format Cost / KB
            let costFmt = "—";
            if (row.cost_per_byte_eth != null) {
              if (ethUsd) {
                const usdVal = row.cost_per_byte_eth * ethUsd;
                costFmt = usdVal < 0.0001 ? "<$0.0001" : `$${usdVal.toFixed(4)}`;
              } else {
                costFmt = `${(row.cost_per_byte_eth * 1e6).toFixed(2)} μETH`;
              }
            }

            return (
              <tr key={`${row.rollup}-${i}`} className="hover:bg-surface-elevated/30 transition-colors">
                <td className="py-3 pr-3 font-mono text-[11px] text-text-secondary opacity-30 w-5">{i + 1}</td>
                <td className="py-3 pr-4"><RollupBadge rollup={row.rollup} linkable /></td>
                <td className="py-3 pr-4 font-mono text-xs text-text-primary text-right tabular-nums">
                  {formatNumber(Number(row.total_blobs))}
                </td>
                
                {/* Fullness Ratio (Blob content fullness) */}
                <td className="py-3 pr-4">
                  {row.avg_fullness_pct != null ? (
                    <div className="flex items-center gap-2 min-w-[95px]">
                      <div className="flex-1 h-1.5 rounded-full bg-surface-elevated overflow-hidden">
                        <div className="h-full rounded-full bg-emerald-500/50" style={{ width: `${row.avg_fullness_pct}%` }} />
                      </div>
                      <span className="font-mono text-[10px] text-text-secondary w-8 text-right shrink-0">{row.avg_fullness_pct.toFixed(0)}%</span>
                    </div>
                  ) : (
                    <span className="text-text-secondary opacity-20 font-mono text-[10px]">—</span>
                  )}
                </td>

                {/* Packing Density (Blobs per transaction) */}
                <td className="py-3 pr-4">
                  <div className="flex items-center gap-2 min-w-[95px]">
                    <div className="flex-1 h-1.5 rounded-full bg-surface-elevated overflow-hidden">
                      <div className="h-full rounded-full bg-blue-500/50" style={{ width: `${packing}%` }} />
                    </div>
                    <span className="font-mono text-[10px] text-text-secondary w-8 text-right shrink-0">{packing.toFixed(0)}%</span>
                  </div>
                </td>

                {/* Coordination Score (Timing score) */}
                <td className="py-3 pr-4">
                  <div className="flex items-center gap-2 min-w-[95px]">
                    <div className="flex-1 h-1.5 rounded-full bg-surface-elevated overflow-hidden">
                      <div className="h-full rounded-full bg-purple-500/50" style={{ width: `${timing}%` }} />
                    </div>
                    <span className="font-mono text-[10px] text-text-secondary w-8 text-right shrink-0">{timing.toFixed(0)}%</span>
                  </div>
                </td>

                {/* Avg Base Fee per Blob */}
                <td className="py-3 pr-4 font-mono text-xs text-text-primary text-right tabular-nums whitespace-nowrap">
                  {feeGwei < 0.001 ? feeGwei.toFixed(6) : feeGwei.toFixed(4)} gwei
                </td>

                {/* Cost per KB used */}
                <td className="py-3 pr-4 font-mono text-xs text-text-primary text-right tabular-nums whitespace-nowrap">
                  {costFmt}
                </td>

                {/* vs Network Avg */}
                <td className="py-3 pr-4 text-right">
                  {networkAvgGwei > 0 ? (
                    <span className={`inline-flex items-center justify-end gap-0.5 font-mono font-bold text-[10px] ${
                      delta < -5 ? "text-emerald-400" :
                      delta > 5  ? "text-orange-400"  :
                      "text-text-secondary opacity-40"
                    }`}>
                      {delta < -5
                        ? <TrendingDown className="h-3 w-3" />
                        : delta > 5
                          ? <TrendingUp className="h-3 w-3" />
                          : <Minus className="h-3 w-3" />}
                      {Math.abs(delta) < 2 ? "avg" : `${delta > 0 ? "+" : ""}${delta.toFixed(0)}%`}
                    </span>
                  ) : <span className="text-text-secondary opacity-20 text-[10px]">—</span>}
                </td>

                {/* Composite Efficiency Score */}
                <td className="py-3">
                  <div className="flex items-center gap-2 min-w-[90px]">
                    <div className="flex-1 h-1.5 rounded-full bg-surface-elevated overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${score}%`, backgroundColor: scoreColor }} />
                    </div>
                    <span className="font-mono font-bold text-[11px] w-6 text-right shrink-0" style={{ color: scoreColor }}>
                      {score.toFixed(0)}
                    </span>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      
      <div className="mt-6 p-4 border border-dashed border-border bg-surface/25 rounded-none space-y-3">
        <h5 className="text-[10px] font-bold uppercase tracking-wider text-text-primary font-mono">Mathematical Cost-Efficiency Formula</h5>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-[11px] text-text-secondary leading-relaxed font-mono">
          <div>
            <p className="font-bold text-text-primary mb-1">1. Composite Efficiency Score</p>
            <p>
              Calculated as: <code className="text-primary font-bold">0.70 × Packing Score + 0.30 × Timing Score</code>.
            </p>
            <ul className="list-disc list-inside mt-1 space-y-0.5">
              <li><strong>Packing Score</strong>: Ratio of blobs bundled per transaction (up to 6 max).</li>
              <li><strong>Timing Score</strong>: Opp-score evaluating window choice vs overall network average fee.</li>
            </ul>
          </div>
          <div>
            <p className="font-bold text-text-primary mb-1">2. Amortized DA Cost per L2 Transaction</p>
            <p>
              Determined by: <code className="text-primary font-bold">Amortized Cost = (L1 Tx Fee + Blob Gas Fee) / L2 Tx Count</code>.
            </p>
            <p className="mt-1">
              Rollups minimize per-tx overhead by maximizing <strong>Fullness Ratio</strong> (filling the 128KB blob space with actual transaction bytes) and <strong>Packing Density</strong> (bundling multiple blobs into a single L1 transaction to split the fixed transaction gas cost).
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
