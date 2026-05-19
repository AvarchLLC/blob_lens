"use client";

import { InfoTooltip } from "@/components/shared/InfoTooltip";
import type { LeaderboardRow, MarketHour } from "@/types";
import * as React from "react";
import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((r) => r.json());
const REFRESH_MS = 12_000;

const REGIME_COLOR: Record<string, string> = {
  undersaturated: "#71717A",
  healthy:        "#00A86B",
  congested:      "#F5A524",
  spike:          "#E5484D",
};

const REGIME_LABEL: Record<string, string> = {
  undersaturated: "Quiet",
  healthy:        "Healthy",
  congested:      "Congested",
  spike:          "Spike",
};

function classifyRegime(maxBlobs: number): string {
  const u = maxBlobs / 9;
  if (u < 0.20) return "undersaturated";
  if (u < 0.80) return "healthy";
  if (u < 0.95) return "congested";
  return "spike";
}

function StatRow({ label, value, sub, tooltip }: {
  label: string;
  value: string;
  sub?: string;
  tooltip?: string;
}) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-border last:border-0">
      <div className="flex items-center gap-1.5">
        <span className="text-[10px] font-bold uppercase tracking-wider text-text-secondary">{label}</span>
        {tooltip && <InfoTooltip content={tooltip} side="right" />}
      </div>
      <div className="text-right">
        <span className="font-mono text-sm font-bold text-text-primary">{value}</span>
        {sub && <p className="font-mono text-[10px] text-text-secondary opacity-50">{sub}</p>}
      </div>
    </div>
  );
}

export function LiveStats() {
  const [updatedAt, setUpdatedAt] = React.useState<Date | null>(null);

  const { data: marketData } = useSWR<{ data: MarketHour[] }>(
    "/api/market?hours=1",
    fetcher,
    {
      refreshInterval: REFRESH_MS,
      onSuccess: () => setUpdatedAt(new Date()),
    }
  );
  const { data: leaderboardData } = useSWR<{ data: LeaderboardRow[] }>(
    "/api/leaderboard?hours=1",
    fetcher,
    { refreshInterval: REFRESH_MS }
  );

  const hourly = marketData?.data ?? [];
  const leaderboard = leaderboardData?.data ?? [];
  const lastHour = hourly[hourly.length - 1];

  const regime = classifyRegime(lastHour?.max_blobs_in_block ?? 0);
  const rc = REGIME_COLOR[regime];

  const avgFeeGwei = lastHour && Number(lastHour.avg_fee) > 0
    ? (Number(lastHour.avg_fee) / 1e9).toFixed(5)
    : "—";
  const utilPct = lastHour
    ? `${Number(lastHour.avg_utilization).toFixed(1)}%`
    : "—";
  const blobsPerMin = lastHour
    ? (Number(lastHour.blob_count) / 60).toFixed(2)
    : "—";
  const txsPerMin = lastHour
    ? (Number(lastHour.tx_count) / 60).toFixed(2)
    : "—";
  const totalBlobsHr = lastHour ? Number(lastHour.blob_count).toLocaleString() : "—";
  const totalTxsHr = lastHour ? Number(lastHour.tx_count).toLocaleString() : "—";

  const activeRollups = leaderboard.filter(
    (r) => r.rollup !== "UNKNOWN" && Number(r.total_blobs) > 0
  );
  const topRollups = activeRollups.slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Regime banner */}
      <div
        className="flex items-center gap-4 rounded-md border p-4 bg-surface"
        style={{ borderLeft: `4px solid ${rc}` }}
      >
        <div 
          className="h-3 w-3 rounded-full shrink-0 animate-pulse" 
          style={{ backgroundColor: rc }} 
        />
        <div>
          <p className="text-sm font-bold uppercase tracking-tight" style={{ color: rc }}>
            {REGIME_LABEL[regime]} Regime · {lastHour?.max_blobs_in_block ?? 0} blobs/block
          </p>
          <p className="text-xs text-text-secondary mt-0.5">
            Current blob fee market state based on the latest hourly snapshot.
          </p>
        </div>
        <div className="ml-auto text-right">
          <p className="font-mono text-xs font-bold text-text-primary">
            {updatedAt ? updatedAt.toLocaleTimeString() : "—"}
          </p>
          <p className="text-[10px] uppercase font-bold text-text-secondary opacity-40">Updated</p>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Column 1: Rate metrics */}
        <div className="surface-elevated p-6 rounded-md">
          <h3 className="text-[11px] font-bold uppercase tracking-[0.15em] text-text-secondary opacity-50 mb-4">
            Throughput (1h)
          </h3>
          <div className="flex flex-col">
            <StatRow
              label="Blobs / min"
              value={blobsPerMin}
              sub={`${totalBlobsHr} total`}
              tooltip="Average blob submission rate over the last hour."
            />
            <StatRow
              label="Txs / min"
              value={txsPerMin}
              sub={`${totalTxsHr} total`}
              tooltip="Average EIP-4844 transaction rate over the last hour."
            />
            <StatRow
              label="Avg Fee (Gwei)"
              value={avgFeeGwei}
              tooltip="Average blob base fee paid in the last hour."
            />
            <StatRow
              label="Utilization (%)"
              value={utilPct}
              tooltip="Average percentage of the 9-blob block capacity used."
            />
          </div>
        </div>

        {/* Column 2: Rollup breakdown */}
        <div className="surface-elevated p-6 rounded-md">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[11px] font-bold uppercase tracking-[0.15em] text-text-secondary opacity-50">
              Active Rollups (1h)
            </h3>
            <span className="text-[10px] font-mono font-bold text-primary px-2 py-0.5 bg-primary/10 rounded">
              {activeRollups.length}
            </span>
          </div>
          <div className="flex flex-col">
            {topRollups.length > 0 ? (
              topRollups.map((r) => (
                <div
                  key={r.rollup}
                  className="flex items-center justify-between py-2.5 border-b border-border last:border-0"
                >
                  <span className="text-xs font-medium text-text-primary truncate max-w-[140px]">{r.rollup}</span>
                  <div className="flex items-center gap-4">
                    <span className="font-mono text-xs font-bold text-text-primary">
                      {Number(r.total_blobs).toLocaleString()}
                    </span>
                    <span className="font-mono text-[10px] font-bold text-primary w-12 text-right">
                      {Number(r.network_share_pct).toFixed(1)}%
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-8 flex flex-col items-center justify-center opacity-30">
                <p className="text-xs text-text-secondary">Awaiting live data...</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <p className="text-[10px] text-center font-bold uppercase tracking-widest text-text-secondary opacity-40 pt-4">
        Refreshes every {REFRESH_MS / 1000}s · Direct Indexer Stream
      </p>
    </div>
  );
}
