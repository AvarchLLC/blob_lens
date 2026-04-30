"use client";

import { BlobSparkline } from "@/components/charts/BlobSparkline";
import { RollupBadge } from "@/components/shared/RollupBadge";
import { Button } from "@/components/ui/button";
import { formatFee, formatNumber } from "@/lib/utils";
import type { LeaderboardRow, SparklinePoint } from "@/types";
import { ArrowDown, ArrowUp, Download } from "lucide-react";
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
        <ArrowDown className="inline h-3 w-3 ml-1" />
      ) : (
        <ArrowUp className="inline h-3 w-3 ml-1" />
      )
    ) : null;

  const th =
    "pb-3 pr-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider cursor-pointer select-none hover:text-foreground transition-colors";

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
              <th className="pb-3 pr-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider w-6">#</th>
              <th className="pb-3 pr-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Rollup</th>
              <th className={th} onClick={() => toggleSort("total_blobs")}>
                Total Blobs <SortIcon k="total_blobs" />
              </th>
              <th className={th} onClick={() => toggleSort("tx_count")}>
                TX Count <SortIcon k="tx_count" />
              </th>
              <th className={th} onClick={() => toggleSort("avg_blobs_per_tx")}>
                Avg / TX <SortIcon k="avg_blobs_per_tx" />
              </th>
              <th className={th} onClick={() => toggleSort("avg_fee")}>
                Avg Fee <SortIcon k="avg_fee" />
              </th>
              <th className="pb-3 pr-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">24h Trend</th>
              <th className="pb-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Last Active</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((row, i) => (
              <tr
                key={row.rollup}
                className="border-b border-border last:border-0 hover:bg-accent/30 transition-colors"
              >
                <td className="py-3 pr-4 text-muted-foreground text-xs">{i + 1}</td>
                <td className="py-3 pr-4">
                  <RollupBadge rollup={row.rollup} linkable />
                </td>
                <td className="py-3 pr-4 font-mono text-foreground">
                  {formatNumber(Number(row.total_blobs))}
                </td>
                <td className="py-3 pr-4 font-mono text-muted-foreground">
                  {formatNumber(Number(row.tx_count))}
                </td>
                <td className="py-3 pr-4 font-mono text-muted-foreground">
                  {Number(row.avg_blobs_per_tx).toFixed(2)}
                </td>
                <td className="py-3 pr-4 font-mono text-muted-foreground">
                  {formatFee(row.avg_fee)}
                </td>
                <td className="py-3 pr-4">
                  <BlobSparkline points={sparklinesMap[row.rollup] ?? []} />
                </td>
                <td className="py-3 text-xs text-muted-foreground">
                  {new Date(row.last_seen).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
