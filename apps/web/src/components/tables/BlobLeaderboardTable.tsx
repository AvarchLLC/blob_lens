"use client";

import { BlobSparkline } from "@/components/charts/BlobSparkline";
import { RollupBadge } from "@/components/shared/RollupBadge";
import { Button } from "@/components/ui/button";
import { ChartCardFooter } from "@/components/shared/ChartCardFooter";
import { blobCostUsd, formatUsd } from "@/lib/ethPrice";
import { useEthPrice } from "@/lib/useEthPrice";
import { formatNumber } from "@/lib/utils";
import type { LeaderboardRow, SparklinePoint } from "@/types";
import { ArrowDown, ArrowRight, ArrowUp, Download, Zap } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";

type SortKey = keyof Pick<
  LeaderboardRow,
  "total_blobs" | "tx_count" | "avg_blobs_per_tx" | "avg_fee" | "da_cost_eth" | "packing_score" | "network_share_pct" | "efficiency_score" | "cost_per_byte_eth" | "coordination_score" | "avg_fullness_pct"
>;

function FullnessBar({ pct }: { pct: number | null }) {
  if (pct == null) return <span className="font-mono text-[10px] text-text-secondary opacity-30">—</span>;
  const clamped = Math.min(100, Math.max(0, pct));
  const color = clamped >= 70 ? "var(--status-healthy)" : clamped >= 40 ? "var(--status-warning)" : "var(--status-critical)";
  return (
    <div className="flex items-center gap-2 font-mono">
      <div className="h-1.5 w-12 bg-background border border-border/30 rounded-none overflow-hidden select-none">
        <div className="h-full rounded-none transition-all" style={{ width: `${clamped}%`, backgroundColor: color }} />
      </div>
      <span className="text-[10px] font-bold" style={{ color }}>{clamped.toFixed(0)}%</span>
    </div>
  );
}

function CoordinationScore({ score }: { score: number | null }) {
  if (score == null) return <span className="font-mono text-[10px] text-text-secondary opacity-30">—</span>;
  const val = Math.min(100, Math.max(0, score));
  return (
    <div className="flex items-center gap-1.5 font-mono">
      <div className="h-1.5 w-8 bg-background border border-border/30 rounded-none overflow-hidden select-none">
        <div 
          className="h-full rounded-none bg-primary opacity-60" 
          style={{ width: `${val}%` }} 
        />
      </div>
      <span className="text-[10px] font-bold text-text-secondary">{val.toFixed(0)}</span>
    </div>
  );
}

function GhostBadge({ count }: { count: number }) {
  if (count === 0) return null;
  return (
    <span
      title={`${count} transaction${count > 1 ? "s" : ""} contained ghost blobs (<5% content)`}
      className="inline-flex items-center rounded-none px-1 py-0.5 text-[8px] font-bold uppercase tracking-wider bg-status-critical/10 text-status-critical border border-status-critical/20"
    >
      ghost
    </span>
  );
}

interface Props {
  rows: LeaderboardRow[];
  sparklines: SparklinePoint[];
}

function PackingBar({ score }: { score: number }) {
  const pct = Math.min(100, Math.max(0, score));
  const color =
    pct >= 80 ? "var(--status-healthy)" : pct >= 50 ? "var(--status-warning)" : "var(--status-critical)";
  return (
    <div className="flex items-center gap-2 font-mono">
      <div className="h-1.5 w-16 bg-background border border-border/30 rounded-none overflow-hidden select-none">
        <div
          className="h-full rounded-none transition-all"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
      <span className="text-[10px] font-bold text-text-secondary">{pct.toFixed(0)}%</span>
    </div>
  );
}

function EfficiencyScore({ score }: { score: number }) {
  const pct = Math.min(100, Math.max(0, score));
  const color = pct >= 80 ? "var(--status-healthy)" : pct >= 50 ? "var(--status-warning)" : "var(--status-critical)";
  return (
    <div className="flex items-center gap-2 font-mono">
      <div className="h-1.5 w-12 bg-background border border-border/30 rounded-none overflow-hidden select-none">
        <div
          className="h-full rounded-none transition-all"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
      <div 
        className="inline-flex items-center px-1.5 py-0.5 rounded-none text-[10px] font-bold"
        style={{ color, backgroundColor: `color-mix(in srgb, ${color} 10%, transparent)` }}
      >
        {pct.toFixed(0)}
      </div>
    </div>
  );
}

function SortIcon({ k, sortKey, sortDir }: { k: SortKey; sortKey: SortKey; sortDir: "asc" | "desc" }) {
  if (sortKey !== k) return null;
  return sortDir === "desc" ? (
    <ArrowDown className="ml-1 inline h-2.5 w-2.5 text-primary" />
  ) : (
    <ArrowUp className="ml-1 inline h-2.5 w-2.5 text-primary" />
  );
}

export function BlobLeaderboardTable({ rows, sparklines }: Props) {
  const router = useRouter();
  const ethUsd = useEthPrice();
  const [sortKey, setSortKey] = React.useState<SortKey>("total_blobs");
  const [sortDir, setSortDir] = React.useState<"asc" | "desc">("desc");

  const sparklinesMap = React.useMemo(() => {
    const m: Record<string, SparklinePoint[]> = {};
    for (const p of sparklines) {
      if (!m[p.rollup]) m[p.rollup] = [];
      m[p.rollup].push(p);
    }
    return m;
  }, [sparklines]);

  const sorted = React.useMemo(() => {
    return [...rows].sort((a, b) => {
      const av = Number(a[sortKey]);
      const bv = Number(b[sortKey]);
      return sortDir === "desc" ? bv - av : av - bv;
    });
  }, [rows, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === "desc" ? "asc" : "desc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  const th =
    "px-6 py-4 text-left text-[10px] font-bold text-text-secondary uppercase tracking-wider cursor-pointer select-none hover:text-primary transition-colors";

  return (
    <div className="flex flex-col h-full">
      <div className="flex justify-between items-center px-6 py-4 bg-sidebar/50 border-b border-border">
         <div className="flex items-center gap-2">
            <Zap className="h-3 w-3 text-primary animate-pulse" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-text-secondary opacity-60 font-mono">
              Protocol Rankings
            </span>
         </div>
         <button 
           onClick={() => {
              const header = "Rollup,Total Blobs,TX Count,Avg Blobs/TX,Efficiency Score,Coordination Score,Cost per KB (ETH)";
              const lines = sorted.map(r => `${r.rollup},${r.total_blobs},${r.tx_count},${r.avg_blobs_per_tx},${r.efficiency_score},${r.coordination_score ?? 0},${r.cost_per_byte_eth ?? 0}`);
              const csv = [header, ...lines].join("\n");
              const a = document.createElement("a");
              a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
              a.download = "leaderboard.csv";
              a.click();
           }}
           className="flex items-center gap-2 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-text-secondary hover:text-primary transition-colors border border-border rounded-none bg-surface/30 font-mono"
         >
           <Download className="h-3 w-3" />
           CSV
         </button>
      </div>
      
      <div className="overflow-x-auto flex-1">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-background/50 border-b border-border">
              <th className="px-6 py-4 text-left text-[10px] font-bold uppercase tracking-widest text-text-secondary opacity-40">#</th>
              <th className="px-6 py-4 text-left text-[10px] font-bold uppercase tracking-widest text-text-secondary min-w-[200px]">Rollup</th>
              <th className={th} onClick={() => toggleSort("total_blobs")}>Blobs <SortIcon k="total_blobs" sortKey={sortKey} sortDir={sortDir} /></th>
              <th className={th} onClick={() => toggleSort("tx_count")}>TXs <SortIcon k="tx_count" sortKey={sortKey} sortDir={sortDir} /></th>
              <th className={th} onClick={() => toggleSort("efficiency_score")}>Efficiency <SortIcon k="efficiency_score" sortKey={sortKey} sortDir={sortDir} /></th>
              <th className={th} onClick={() => toggleSort("coordination_score")}>Coordination <SortIcon k="coordination_score" sortKey={sortKey} sortDir={sortDir} /></th>
              <th className={th} onClick={() => toggleSort("avg_fullness_pct")}>Fullness <SortIcon k="avg_fullness_pct" sortKey={sortKey} sortDir={sortDir} /></th>
              <th className={th} onClick={() => toggleSort("cost_per_byte_eth")}>Cost/KB <SortIcon k="cost_per_byte_eth" sortKey={sortKey} sortDir={sortDir} /></th>
              <th className="px-6 py-4 text-left text-[10px] font-bold uppercase tracking-widest text-text-secondary">24H Trend</th>
              <th className="px-6 py-4 text-right text-[10px] font-bold uppercase tracking-widest text-text-secondary">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/30">
            {sorted.map((row, i) => {
              const isNavigable = row.rollup !== "UNKNOWN";
              return (
                <tr
                  key={row.rollup}
                  className={`group hover:bg-surface-elevated transition-colors ${isNavigable ? "cursor-pointer" : ""}`}
                  onClick={isNavigable ? () => router.push(`/rollup/${encodeURIComponent(row.rollup)}`) : undefined}
                >
                  <td className="px-6 py-4 font-mono text-[10px] text-text-secondary opacity-40">{i + 1}</td>
                  <td className="px-6 py-4"><RollupBadge rollup={row.rollup} linkable={false} /></td>
                  <td className="px-6 py-4 font-mono text-xs font-bold text-text-primary">{formatNumber(Number(row.total_blobs))}</td>
                  <td className="px-6 py-4 font-mono text-xs text-text-secondary opacity-60">{formatNumber(Number(row.tx_count))}</td>
                  <td className="px-6 py-4">
                    <EfficiencyScore score={Number(row.efficiency_score)} />
                  </td>
                  <td className="px-6 py-4">
                    <CoordinationScore score={row.coordination_score} />
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <FullnessBar pct={row.avg_fullness_pct} />
                      <GhostBadge count={Number(row.ghost_blob_count ?? 0)} />
                    </div>
                  </td>
                  <td className="px-6 py-4 font-mono text-[10px] text-text-secondary">
                    {row.cost_per_byte_eth ? (
                      <div className="flex flex-col">
                        <span className="font-bold text-text-primary">{row.cost_per_byte_eth.toFixed(6)} ETH</span>
                        {ethUsd && <span className="opacity-40 text-[8px]">{formatUsd(row.cost_per_byte_eth * ethUsd)}</span>}
                      </div>
                    ) : (
                      <span className="opacity-20">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                     <div className="w-24 opacity-80 group-hover:opacity-100 transition-opacity">
                        <BlobSparkline points={sparklinesMap[row.rollup] ?? []} />
                     </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    {isNavigable ? (
                      <span className="text-[10px] font-bold text-primary group-hover:underline flex items-center justify-end gap-1 uppercase tracking-widest">
                        Analysis <ArrowRight className="h-2.5 w-2.5" />
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold text-text-secondary opacity-20 uppercase tracking-widest">N/A</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="px-6 py-4 border-t border-border/20">
        <ChartCardFooter />
      </div>
    </div>
  );
}
