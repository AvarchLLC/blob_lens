"use client";

import { InfoTooltip } from "@/components/shared/InfoTooltip";
import type { LeaderboardRow, MarketHour } from "@/types";
import * as React from "react";
import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((r) => r.json());
const REFRESH_MS = 12_000;

const REGIME_COLOR: Record<string, string> = {
  undersaturated: "#71717a",
  healthy:        "#00df81",
  congested:      "#fcbb00",
  spike:          "#fb2c36",
};
const REGIME_BG: Record<string, string> = {
  undersaturated: "rgba(63,63,70,0.12)",
  healthy:        "rgba(0,223,129,0.10)",
  congested:      "rgba(252,187,0,0.10)",
  spike:          "rgba(251,44,54,0.10)",
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
    <div className="flex items-center justify-between py-2.5 border-b border-border/50 last:border-0">
      <div className="flex items-center gap-1.5">
        <span className="text-xs text-muted-foreground">{label}</span>
        {tooltip && <InfoTooltip content={tooltip} side="right" />}
      </div>
      <div className="text-right">
        <span className="font-mono text-sm text-foreground">{value}</span>
        {sub && <p className="font-mono text-[10px] text-muted-foreground">{sub}</p>}
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
  const rbg = REGIME_BG[regime];

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
    <div className="space-y-5">
      {/* Regime banner */}
      <div
        className="flex items-center gap-3 rounded-xl border px-4 py-3"
        style={{ background: rbg, borderColor: `${rc}33` }}
      >
        <span
          className="h-3 w-3 rounded-full shrink-0"
          style={{ backgroundColor: rc, boxShadow: `0 0 8px ${rc}99` }}
        />
        <div>
          <p className="text-sm font-semibold" style={{ color: rc }}>
            {REGIME_LABEL[regime]} · {lastHour?.max_blobs_in_block ?? 0} blobs/block
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Current blob fee market state based on latest block
          </p>
        </div>
        <div className="ml-auto text-right">
          <p className="font-mono text-xs text-muted-foreground">
            {updatedAt ? updatedAt.toLocaleTimeString() : "—"}
          </p>
          <p className="text-[10px] text-muted-foreground/60">last updated</p>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {/* Column 1: Rate metrics */}
        <div className="rounded-xl border border-border bg-card px-4 py-3 space-y-0">
          <p className="text-[10px] uppercase tracking-[0.10em] text-muted-foreground font-semibold mb-1">
            Rate (last hour)
          </p>
          <StatRow
            label="Blobs / min"
            value={blobsPerMin}
            sub={`${totalBlobsHr} total`}
            tooltip="Average blob submission rate over the last hour. Divide total blobs by 60 minutes."
          />
          <StatRow
            label="Transactions / min"
            value={txsPerMin}
            sub={`${totalTxsHr} total`}
            tooltip="Average EIP-4844 type-3 transaction rate over the last hour."
          />
          <StatRow
            label="Blob base fee"
            value={`${avgFeeGwei} gwei`}
            tooltip="Average blob base fee paid per blob in the last hour. This is the market rate set by EIP-4844's exponential mechanism, not the bid."
          />
          <StatRow
            label="Avg utilization"
            value={utilPct}
            tooltip="Average percentage of the 9-blob block capacity used in the last hour. Above 50% = above target. Above 80% = fee pressure building."
          />
        </div>

        {/* Column 2: Rollup breakdown */}
        <div className="rounded-xl border border-border bg-card px-4 py-3 space-y-0">
          <div className="flex items-center justify-between mb-1">
            <p className="text-[10px] uppercase tracking-[0.10em] text-muted-foreground font-semibold">
              Top rollups (1h)
            </p>
            <span className="text-[10px] font-mono text-muted-foreground">
              {activeRollups.length} active
            </span>
          </div>
          {topRollups.length > 0 ? (
            topRollups.map((r) => (
              <div
                key={r.rollup}
                className="flex items-center justify-between py-2 border-b border-border/50 last:border-0"
              >
                <span className="text-xs text-foreground truncate max-w-[140px]">{r.rollup}</span>
                <div className="text-right">
                  <span className="font-mono text-xs text-foreground">
                    {Number(r.total_blobs).toLocaleString()}
                  </span>
                  <span className="font-mono text-[10px] text-muted-foreground ml-2">
                    {Number(r.network_share_pct).toFixed(1)}%
                  </span>
                </div>
              </div>
            ))
          ) : (
            <p className="py-4 text-xs text-center text-muted-foreground">Loading…</p>
          )}
        </div>
      </div>

      <p className="text-[10px] text-center text-muted-foreground/60">
        Refreshes every {REFRESH_MS / 1000}s · Data sourced from Ethereum mainnet via BlobLens indexer
      </p>
    </div>
  );
}
