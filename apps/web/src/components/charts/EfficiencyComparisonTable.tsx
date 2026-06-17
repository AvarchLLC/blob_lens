"use client";

import { useMemo } from "react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import type { LeaderboardRow } from "@/types";
import { RollupBadge } from "@/components/shared/RollupBadge";
import { formatNumber } from "@/lib/utils";

interface Props {
  leaderboard: LeaderboardRow[];
  networkAvgGwei: number;
}

export function EfficiencyComparisonTable({ leaderboard, networkAvgGwei }: Props) {
  const rows = useMemo(() =>
    leaderboard
      .filter((r) => r.rollup !== "UNKNOWN" && Number(r.total_blobs) > 0)
      .sort((a, b) => Number(b.efficiency_score) - Number(a.efficiency_score)),
    [leaderboard]
  );

  if (!rows.length)
    return <p className="py-8 text-center text-xs text-text-secondary opacity-40 italic">No rollup data</p>;

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-border/30">
            {["#", "Rollup", "Blobs 24h", "Packing", "Avg Fee", "vs Network", "Efficiency"].map((h) => (
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
            const feeGwei = Number(row.cost_per_blob_gwei);
            const delta   = networkAvgGwei > 0 ? ((feeGwei - networkAvgGwei) / networkAvgGwei) * 100 : 0;
            const scoreColor = "var(--primary)";

            return (
              <tr key={`${row.rollup}-${i}`} className="hover:bg-surface-elevated/30 transition-colors">
                <td className="py-3 pr-3 font-mono text-[11px] text-text-secondary opacity-30 w-5">{i + 1}</td>
                <td className="py-3 pr-4"><RollupBadge rollup={row.rollup} linkable /></td>
                <td className="py-3 pr-4 font-mono text-xs text-text-primary text-right tabular-nums">
                  {formatNumber(Number(row.total_blobs))}
                </td>
                <td className="py-3 pr-4">
                  <div className="flex items-center gap-2 min-w-[110px]">
                    <div className="flex-1 h-1.5 rounded-full bg-surface-elevated overflow-hidden">
                      <div className="h-full rounded-full bg-primary/50" style={{ width: `${packing}%` }} />
                    </div>
                    <span className="font-mono text-[10px] text-text-secondary w-8 text-right shrink-0">{packing.toFixed(0)}%</span>
                  </div>
                </td>
                <td className="py-3 pr-4 font-mono text-xs text-text-primary text-right tabular-nums whitespace-nowrap">
                  {feeGwei < 0.001 ? feeGwei.toFixed(6) : feeGwei.toFixed(4)} gwei
                </td>
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
      <p className="mt-4 text-[10px] text-text-secondary opacity-30 leading-relaxed">
        Efficiency = 70% packing density (blobs/tx vs max) + 30% timing score (fee vs network avg) · 24h window
      </p>
    </div>
  );
}
