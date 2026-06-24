"use client";

import { InfoTooltip } from "@/components/shared/InfoTooltip";
import type { LeaderboardRow, MarketHour } from "@/types";
import * as React from "react";
import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((r) => r.json());
const REFRESH_MS = 12_000;

const REGIME_COLOR: Record<string, string> = {
  undersaturated: "#52666E",
  healthy:        "#00A86B",
  congested:      "#E8A020",
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
    <div className="flex items-center justify-between py-3 border-b border-border/30 last:border-0">
      <div className="flex items-center gap-1.5">
        <span className="text-[10px] font-bold uppercase tracking-wider text-text-secondary font-mono">{label}</span>
        {tooltip && <InfoTooltip content={tooltip} side="right" />}
      </div>
      <div className="text-right font-mono">
        <span className="text-sm font-bold text-text-primary">{value}</span>
        {sub && <p className="text-[10px] text-text-secondary opacity-50">{sub}</p>}
      </div>
    </div>
  );
}

function LedLevelMeter({ label, pct, tooltip, valueLabel }: { label: string; pct: number; tooltip?: string; valueLabel: string }) {
  const numSegments = 10;
  const activeSegments = Math.round((Math.min(100, Math.max(0, pct)) / 100) * numSegments);

  return (
    <div className="flex flex-col gap-2.5 p-4 border border-dashed border-border/40 bg-background/30 rounded-none relative group/meter">
      <div className="flex items-center justify-between font-mono">
        <div className="flex items-center gap-1.5">
          <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-text-secondary">{label}</span>
          {tooltip && <InfoTooltip content={tooltip} side="right" />}
        </div>
        <span className="text-[10px] font-bold text-text-primary">{valueLabel}</span>
      </div>
      
      <div className="flex gap-1 h-3.5 w-full bg-surface/50 p-0.5 border border-border/20 select-none">
        {Array.from({ length: numSegments }).map((_, idx) => {
          const isActive = idx < activeSegments;
          const segmentPct = (idx + 1) * 10;
          
          let colorClass = "text-status-healthy bg-status-healthy";
          if (segmentPct > 80) colorClass = "text-status-critical bg-status-critical";
          else if (segmentPct > 50) colorClass = "text-status-warning bg-status-warning";

          return (
            <div
              key={idx}
              className={`flex-1 transition-all duration-300 rounded-none ${
                isActive 
                  ? `${colorClass} shadow-[0_0_4px_currentColor] opacity-90` 
                  : "bg-text-secondary/10"
              }`}
            />
          );
        })}
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

  const avgFeeGweiVal = lastHour && Number(lastHour.avg_fee) > 0
    ? Number(lastHour.avg_fee) / 1e9
    : 0;
  const avgFeeGwei = avgFeeGweiVal > 0 ? avgFeeGweiVal.toFixed(5) : "—";
  
  const rawUtil = lastHour ? Number(lastHour.avg_utilization) : 0;
  const utilPct = lastHour ? `${rawUtil.toFixed(1)}%` : "—";
  
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

  // Fee pressure percentage scaled against 10 Gwei (standard congested limit)
  const feePressurePct = Math.min(100, (avgFeeGweiVal / 10) * 100);

  return (
    <div className="space-y-6">
      {/* Regime banner */}
      <div
        className="flex items-center gap-4 rounded-none border border-border bg-surface p-4"
        style={{ borderLeft: `4px solid ${rc}` }}
      >
        <div 
          className="h-2.5 w-2.5 rounded-none shrink-0 animate-pulse" 
          style={{ backgroundColor: rc }} 
        />
        <div>
          <p className="text-xs font-bold uppercase tracking-widest font-mono" style={{ color: rc }}>
            {REGIME_LABEL[regime].toUpperCase()} REGIME // {lastHour?.max_blobs_in_block ?? 0} BLOBS_PER_BLOCK
          </p>
          <p className="text-xs text-text-secondary mt-0.5">
            Current blob fee market state based on the latest hourly telemetry window.
          </p>
        </div>
        <div className="ml-auto text-right font-mono">
          <p className="text-xs font-bold text-text-primary">
            {updatedAt ? updatedAt.toLocaleTimeString() : "—"}
          </p>
          <p className="text-[9px] uppercase font-bold text-text-secondary opacity-40 mt-0.5">Updated</p>
        </div>
      </div>

      {/* LED equalizers row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <LedLevelMeter
          label="Blob Saturation Index"
          pct={rawUtil}
          valueLabel={utilPct}
          tooltip="Average percentage of the EIP-7691 block capacity used (9-blob maximum)."
        />
        <LedLevelMeter
          label="Fee Market Pressure"
          pct={feePressurePct}
          valueLabel={avgFeeGweiVal > 0 ? `${avgFeeGweiVal.toFixed(4)} GWEI` : "1 WEI"}
          tooltip="Blob fee scaling pressure mapped against a 10-Gwei high-congested baseline."
        />
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Column 1: Rate metrics */}
        <div className="bg-surface border border-border p-6 rounded-none relative group/card tech-bracket">
          <h3 className="text-[10px] font-bold uppercase tracking-[0.15em] text-text-secondary opacity-60 mb-4 font-mono">
            Throughput Telemetry (1h)
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
              label="Avg Saturation"
              value={utilPct}
              tooltip="Average percentage of block capacity utilized."
            />
          </div>
        </div>

        {/* Column 2: Rollup breakdown */}
        <div className="bg-surface border border-border p-6 rounded-none relative group/card tech-bracket">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[10px] font-bold uppercase tracking-[0.15em] text-text-secondary opacity-60 font-mono">
              Active Sequencer Share (1h)
            </h3>
            <span className="text-[10px] font-mono font-bold text-primary px-2.5 py-0.5 bg-primary/10 border border-primary/20 rounded-none">
              {activeRollups.length} ACTIVE
            </span>
          </div>
          <div className="flex flex-col">
            {topRollups.length > 0 ? (
              topRollups.map((r) => (
                <div
                  key={r.rollup}
                  className="flex items-center justify-between py-2.5 border-b border-border/30 last:border-0"
                >
                  <span className="text-xs font-bold text-text-primary font-mono uppercase truncate max-w-[140px]">{r.rollup}</span>
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
                <p className="text-xs text-text-secondary font-mono">AWAITING LIVE DATA STREAM...</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <p className="text-[9px] text-center font-bold uppercase tracking-widest text-text-secondary opacity-40 pt-4 font-mono">
        Refreshes every {REFRESH_MS / 1000}s · Direct Indexer Stream
      </p>
    </div>
  );
}
