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
  "total_blobs" | "tx_count" | "avg_blobs_per_tx" | "avg_fee"
>;

interface Props {
  rows: LeaderboardRow[];
  sparklines: SparklinePoint[];
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
    const header = "Rollup,Total Blobs,TX Count,Avg Blobs/TX,Avg Fee,Last Active";
    const lines = sorted.map(
      (r) =>
        `${r.rollup},${r.total_blobs},${r.tx_count},${Number(r.avg_blobs_per_tx).toFixed(2)},${r.avg_fee},${r.last_seen}`
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
    "pb-3 pr-4 text-left text-xs font-medium text-[#9CA3AF] uppercase tracking-[0.08em] cursor-pointer select-none hover:text-foreground transition-colors";

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
              <th className="w-6 pb-3 pr-4 text-left text-xs font-medium uppercase tracking-[0.08em] text-[#4B5563]">#</th>
              <th className="w-64 pb-3 pr-4 text-left text-xs font-medium uppercase tracking-[0.08em] text-[#9CA3AF]">Rollup</th>
              <th className={th} onClick={() => toggleSort("total_blobs")}>Total Blobs <SortIcon k="total_blobs" /></th>
              <th className={th} onClick={() => toggleSort("tx_count")}>TX Count <SortIcon k="tx_count" /></th>
              <th className={th} onClick={() => toggleSort("avg_blobs_per_tx")}>Avg / TX <SortIcon k="avg_blobs_per_tx" /></th>
              <th className={th} onClick={() => toggleSort("avg_fee")}>Avg Cost/Blob <SortIcon k="avg_fee" /></th>
              <th className="pb-3 pr-4 text-left text-xs font-medium uppercase tracking-[0.08em] text-[#9CA3AF]">24H Trend</th>
              <th className="pb-3 text-left text-xs font-medium uppercase tracking-[0.08em] text-[#9CA3AF]">Last Active</th>
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
                  <td className="py-3 pr-4 font-mono text-xs text-[#4B5563]">{i + 1}</td>
                  <td className="py-3 pr-4"><RollupBadge rollup={row.rollup} linkable={false} /></td>
                  <td className="py-3 pr-4 font-mono text-foreground">{formatNumber(Number(row.total_blobs))}</td>
                  <td className="py-3 pr-4 font-mono text-[#9CA3AF]">{formatNumber(Number(row.tx_count))}</td>
                  <td className="py-3 pr-4 font-mono text-[#9CA3AF]">{Number(row.avg_blobs_per_tx).toFixed(2)}</td>
                  <td className="py-3 pr-4 font-mono text-[#9CA3AF]">
                    {ethUsd != null
                      ? formatUsd(blobCostUsd(row.avg_fee, ethUsd))
                      : `${(Number(row.avg_fee) / 1e9).toFixed(4)} gwei`}
                  </td>
                  <td className="py-3 pr-4"><BlobSparkline points={sparklinesMap[row.rollup] ?? []} /></td>
                  <td className="py-3 text-xs text-[#9CA3AF]">{new Date(row.last_seen).toLocaleString()}</td>
                  <td className="py-3 w-4 text-[#4B5563]">
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
