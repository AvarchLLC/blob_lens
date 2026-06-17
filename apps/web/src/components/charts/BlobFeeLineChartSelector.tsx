"use client";

import { useState } from "react";
import { BlobFeeLineChart } from "./BlobFeeLineChart";
import { RollupMetricLineChart } from "./RollupMetricLineChart";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { MarketHour, HourlyRollupValue } from "@/types";

interface Props {
  networkData: MarketHour[];
  rollups: string[];
  rollupFeeData: HourlyRollupValue[];
  ethUsd?: number;
}

const LIMITS = [5, 10, 15, 20] as const;

export function BlobFeeLineChartSelector({ networkData, rollups, rollupFeeData, ethUsd }: Props) {
  const [viewMode, setViewMode] = useState<"avg" | "stacked">("avg");
  const [selectedRollup, setSelectedRollup] = useState<string>("network");
  const [stackedLimit, setStackedLimit] = useState<number>(10);
  const [fetchedRollups, setFetchedRollups] = useState<Record<string, MarketHour[]>>({});
  const [loading, setLoading] = useState(false);

  // ── Avg mode: fetch per-rollup data on demand ──────────────────────────────
  const handleRollupChange = async (rollup: string) => {
    setSelectedRollup(rollup);
    if (rollup !== "network" && !fetchedRollups[rollup]) {
      setLoading(true);
      try {
        const res = await fetch(`/api/rollup-fee?rollup=${encodeURIComponent(rollup)}`);
        const { data } = await res.json();
        setFetchedRollups((prev) => ({ ...prev, [rollup]: data }));
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    }
  };

  // ── Stacked mode: top-N rollups from pre-fetched data ─────────────────────
  const topRollupNames = [...new Set(rollupFeeData.map((d) => d.rollup))].slice(0, stackedLimit);
  const stackedData = rollupFeeData.filter((d) => topRollupNames.includes(d.rollup));

  // ── Avg mode display data ─────────────────────────────────────────────────
  const avgDisplayData =
    selectedRollup === "network"
      ? networkData
      : fetchedRollups[selectedRollup] ?? [];

  return (
    <div className="space-y-3">
      {/* ── Controls row ── */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* View type */}
        <Select value={viewMode} onValueChange={(v) => setViewMode(v as "avg" | "stacked")}>
          <SelectTrigger className="w-44 h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="avg">Network Average</SelectItem>
            <SelectItem value="stacked">By Rollup</SelectItem>
          </SelectContent>
        </Select>

        {/* Contextual second dropdown */}
        {viewMode === "avg" ? (
          <Select value={selectedRollup} onValueChange={handleRollupChange}>
            <SelectTrigger className="w-40 h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="network">All rollups</SelectItem>
              {Array.from(new Set(rollups.filter(Boolean))).map((r) => (
                <SelectItem key={r} value={r}>{r}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <Select value={String(stackedLimit)} onValueChange={(v) => setStackedLimit(Number(v))}>
            <SelectTrigger className="w-28 h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LIMITS.map((n) => (
                <SelectItem key={n} value={String(n)}>Top {n}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* ── Chart ── */}
      {viewMode === "avg" ? (
        loading ? (
          <div className="h-[280px] flex items-center justify-center text-muted-foreground text-sm">
            Loading…
          </div>
        ) : (
          <BlobFeeLineChart data={avgDisplayData} ethUsd={ethUsd} />
        )
      ) : stackedData.length > 0 ? (
        <RollupMetricLineChart data={stackedData} mode="fee-wei" ethUsd={ethUsd} />
      ) : (
        <p className="py-8 text-center text-sm text-muted-foreground">No rollup fee data</p>
      )}
    </div>
  );
}
