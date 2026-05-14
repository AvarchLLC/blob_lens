"use client";

import { BlobSparkline } from "@/components/charts/BlobSparkline";
import { RollupBadge } from "@/components/shared/RollupBadge";
import { Button } from "@/components/ui/button";
import { blobCostUsd, formatUsd } from "@/lib/ethPrice";
import { useEthPrice } from "@/lib/useEthPrice";
import { formatNumber } from "@/lib/utils";
import type { LeaderboardRow, SparklinePoint } from "@/types";
import { ArrowDown, ArrowRight, ArrowUp, Download } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";

type SortKey = keyof Pick<
  LeaderboardRow,
  "total_blobs" | "tx_count" | "avg_blobs_per_tx" | "avg_fee" | "da_cost_eth" | "packing_score" | "network_share_pct" | "efficiency_score" | "cost_per_byte_eth" | "coordination_score"
>;

function FullnessBar({ pct }: { pct: number | null }) {
  if (pct == null) return <span className="font-mono text-xs text-muted-foreground/40">—</span>;
  const clamped = Math.min(100, Math.max(0, pct));
  const color = clamped >= 70 ? "#00df81" : clamped >= 40 ? "#fcbb00" : "#fb2c36";
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-[#1E2D45]">
        <div className="h-full rounded-full transition-all" style={{ width: `${clamped}%`, backgroundColor: color }} />
      </div>
      <span className="font-mono text-xs" style={{ color }}>{clamped.toFixed(0)}%</span>
    </div>
  );
}

function GhostBadge({ count }: { count: number }) {
  if (count === 0) return null;
  return (
    <span
      title={`${count} transaction${count > 1 ? "s" : ""} contained ghost blobs (<5% content)`}
      className="inline-flex items-center rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide"
      style={{ background: "rgba(251,44,54,0.12)", color: "#fb2c36", border: "1px solid rgba(251,44,54,0.25)" }}
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
    pct >= 80 ? "#22c55e" : pct >= 50 ? "#eab308" : "#f97316";
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-20 overflow-hidden rounded-full bg-[#1E2D45]">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
      <span className="font-mono text-xs text-muted-foreground">{pct.toFixed(0)}%</span>
    </div>
  );
}

function EfficiencyScore({ score }: { score: number }) {
  const pct = Math.min(100, Math.max(0, score));
  const isHigh   = pct >= 80;
  const isMid    = pct >= 50;
  const color    = isHigh ? "#00df81" : isMid ? "#fcbb00" : "#f97316";
  const bg       = isHigh ? "rgba(0,223,129,0.10)" : isMid ? "rgba(252,187,0,0.10)" : "rgba(249,115,22,0.10)";
  const border   = isHigh ? "rgba(0,223,129,0.25)" : isMid ? "rgba(252,187,0,0.25)" : "rgba(249,115,22,0.25)";
  return (
    <div className="flex items-center gap-2">
      <div className="relative h-1.5 w-16 overflow-hidden rounded-full bg-[#1E2D45]">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
      <span
        className="inline-flex items-center rounded-full px-1.5 py-0.5 font-mono text-[10px] font-semibold"
        style={{ color, background: bg, border: `1px solid ${border}` }}
      >
        {pct.toFixed(0)}
      </span>
    </div>
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

  function exportCsv() {
    const header = "Rollup,Total Blobs,TX Count,Avg Blobs/TX,Avg Fee,DA Cost (ETH),Cost/KB (ETH),Packing Score,Network Share %,Efficiency Score,Timing Score,Coordination Score,Cost/Blob (gwei),Last Active";
    const lines = sorted.map(
      (r) =>
        `${r.rollup},${r.total_blobs},${r.tx_count},${Number(r.avg_blobs_per_tx).toFixed(2)},${r.avg_fee},${Number(r.da_cost_eth).toFixed(6)},${r.cost_per_byte_eth != null ? Number(r.cost_per_byte_eth).toFixed(8) : ""},${Number(r.packing_score).toFixed(1)},${Number(r.network_share_pct).toFixed(2)},${Number(r.efficiency_score).toFixed(1)},${Number(r.timing_score).toFixed(1)},${r.coordination_score != null ? Number(r.coordination_score).toFixed(1) : ""},${Number(r.cost_per_blob_gwei).toFixed(4)},${r.last_seen}`
    );
    const csv = [header, ...lines].join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = "blob-leaderboard.csv";
    a.click();
  }

  const SortIcon = ({ k }: { k: SortKey }) =>
    sortKey === k ? (
      sortDir === "desc" ? (
        <ArrowDown className="ml-1 inline h-3 w-3" />
      ) : (
        <ArrowUp className="ml-1 inline h-3 w-3" />
      )
    ) : null;

  const th =
    "pb-3 pr-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-[0.08em] cursor-pointer select-none hover:text-foreground transition-colors";

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={exportCsv}>
          <Download /> Export CSV
        </Button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="w-6 pb-3 pr-4 text-left text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground/50">#</th>
              <th className="w-64 pb-3 pr-4 text-left text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">Rollup</th>
              <th className={th} onClick={() => toggleSort("total_blobs")}>Total Blobs <SortIcon k="total_blobs" /></th>
              <th className={th} onClick={() => toggleSort("tx_count")}>TX Count <SortIcon k="tx_count" /></th>
              <th className={th} onClick={() => toggleSort("avg_blobs_per_tx")}>Avg / TX <SortIcon k="avg_blobs_per_tx" /></th>
              <th className={th} onClick={() => toggleSort("avg_fee")}>Avg Cost/Blob <SortIcon k="avg_fee" /></th>
              <th className={th} onClick={() => toggleSort("da_cost_eth")}>DA Cost (ETH) <SortIcon k="da_cost_eth" /></th>
              <th className={th} onClick={() => toggleSort("cost_per_byte_eth")} title="ETH cost per KB of blob space actually used (requires beacon data)">Cost/KB <SortIcon k="cost_per_byte_eth" /></th>
              <th className={th} onClick={() => toggleSort("packing_score")}>Packing <SortIcon k="packing_score" /></th>
              <th className={th} onClick={() => toggleSort("efficiency_score")}>Efficiency <SortIcon k="efficiency_score" /></th>
              <th className={th} onClick={() => toggleSort("coordination_score")} title="How often this rollup submits blobs in the same block as peers (0–100)">Coord. <SortIcon k="coordination_score" /></th>
              <th className={th} onClick={() => toggleSort("network_share_pct")}>Net Share <SortIcon k="network_share_pct" /></th>
              <th className="pb-3 pr-4 text-left text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">Fullness</th>
              <th className="pb-3 pr-4 text-left text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">24H Trend</th>
              <th className="pb-3 text-left text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">Last Active</th>
              <th className="pb-3 w-4" />
            </tr>
          </thead>
          <tbody>
            {sorted.map((row, i) => {
              const isNavigable = row.rollup !== "UNKNOWN";
              return (
                <tr
                  key={row.rollup}
                  className={`group border-b border-border/70 transition-colors hover:bg-accent/30 ${isNavigable ? "cursor-pointer" : ""}`}
                  onClick={isNavigable ? () => router.push(`/rollup/${encodeURIComponent(row.rollup)}`) : undefined}
                >
                  <td className="py-3 pr-4 font-mono text-xs text-muted-foreground/50">{i + 1}</td>
                  <td className="py-3 pr-4"><RollupBadge rollup={row.rollup} linkable={false} /></td>
                  <td className="py-3 pr-4 font-mono text-foreground">{formatNumber(Number(row.total_blobs))}</td>
                  <td className="py-3 pr-4 font-mono text-muted-foreground">{formatNumber(Number(row.tx_count))}</td>
                  <td className="py-3 pr-4 font-mono text-muted-foreground">{Number(row.avg_blobs_per_tx).toFixed(2)}</td>
                  <td className="py-3 pr-4 font-mono text-muted-foreground">
                    {ethUsd != null
                      ? formatUsd(blobCostUsd(row.avg_fee, ethUsd))
                      : `${(Number(row.avg_fee) / 1e9).toFixed(4)} gwei`}
                  </td>
                  <td className="py-3 pr-4 font-mono text-muted-foreground">
                    {Number(row.da_cost_eth) > 0
                      ? Number(row.da_cost_eth) < 0.0001
                        ? Number(row.da_cost_eth).toPrecision(3)
                        : Number(row.da_cost_eth).toFixed(4)
                      : "—"}
                  </td>
                  <td className="py-3 pr-4 font-mono text-muted-foreground">
                    {row.cost_per_byte_eth != null
                      ? Number(row.cost_per_byte_eth) < 0.000001
                        ? Number(row.cost_per_byte_eth).toPrecision(3)
                        : Number(row.cost_per_byte_eth).toFixed(6)
                      : <span className="text-muted-foreground/30">—</span>}
                  </td>
                  <td className="py-3 pr-4">
                    <PackingBar score={Number(row.packing_score)} />
                  </td>
                  <td className="py-3 pr-4">
                    <EfficiencyScore score={Number(row.efficiency_score)} />
                  </td>
                  <td className="py-3 pr-4 font-mono text-muted-foreground">
                    {row.coordination_score != null
                      ? <span title="Co-submission frequency with peer rollups">{Number(row.coordination_score).toFixed(0)}</span>
                      : <span className="text-muted-foreground/30">—</span>}
                  </td>
                  <td className="py-3 pr-4 font-mono text-muted-foreground">
                    {Number(row.network_share_pct) > 0
                      ? `${Number(row.network_share_pct).toFixed(1)}%`
                      : "—"}
                  </td>
                  <td className="py-3 pr-4">
                    <div className="flex items-center gap-1.5">
                      <FullnessBar pct={row.avg_fullness_pct} />
                      <GhostBadge count={Number(row.ghost_blob_count ?? 0)} />
                    </div>
                  </td>
                  <td className="py-3 pr-4"><BlobSparkline points={sparklinesMap[row.rollup] ?? []} /></td>
                  <td className="py-3 text-xs text-muted-foreground">{new Date(row.last_seen).toLocaleString()}</td>
                  <td className="py-3 w-4 text-muted-foreground/50">
                    {isNavigable && <ArrowRight className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
