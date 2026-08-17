"use client";

import React, { useState } from "react";
import { DottedCard } from "@/components/ui/dotted-card";
import { BlobFeeGauge } from "@/components/charts/blob-fee-gauge";
import { BlobFeeLineChart } from "@/components/charts/blob-fee-line-chart";
import { BlobsPerBlockChart } from "@/components/charts/blobs-per-block-chart";
import { RegimeTimeline } from "@/components/shared/regime-timeline";
import { TimeRangePicker, type DateRangeState } from "@/components/shared/time-range-picker";
import { LiveSidecarFeed } from "@/components/dashboard/live-sidecar-feed";
import { BPOCapacityWidget } from "@/components/dashboard/bpo-capacity-widget";
import { L2Icon } from "@/components/shared/l2-icon";
import { TrendingUp, Terminal, Activity, ArrowRight, Layers } from "lucide-react";
import Link from "next/link";

export default function DashboardPage() {
  const [timeRange, setTimeRange] = useState<DateRangeState>({
    preset: "24h",
  });

  return (
    <div className="flex flex-col gap-5 w-full max-w-7xl mx-auto py-2 font-sans">
      {/* ── Instrument Hero Header & Time Range Control ── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-dashed border-[var(--border)]">
        <div className="flex flex-col gap-1.5">
          <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
            <span className="px-2.5 py-1 font-bold tracking-widest text-[var(--primary-text)] bg-[var(--primary-bg)] border border-[var(--primary-border)] uppercase rounded-[4px]">
              [ EIP-4844 / EIP-7691 TELEMETRY ]
            </span>
            <span className="px-2.5 py-1 border border-[var(--border)] rounded-[4px] text-[var(--text-secondary)]">
              SLOT #9,832,104
            </span>
            <span className="px-2.5 py-1 border border-[var(--border)] rounded-[4px] text-[var(--success)] font-bold">
              PECTRA READY (6/9 BLOBS)
            </span>
          </div>

          <h1 className="text-xl sm:text-2xl font-sans font-bold tracking-tight text-[var(--text-primary)]">
            Ethereum Blob Layer Observability
          </h1>

          <p className="text-sm font-sans text-[var(--text-secondary)] leading-relaxed max-w-none">
            High-precision Ethereum data availability instrument. Monitor real-time base fee dynamics, saturation regimes, L2 rollup allocations, and blob sidecar payload streams.
          </p>
        </div>

        {/* Time Range Selector & Live Indicator */}
        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <TimeRangePicker value={timeRange} onChange={setTimeRange} />

          <div className="badge-live flex items-center gap-2 px-3 py-1.5 shadow-xs font-mono text-xs border border-transparent">
            <span className="w-2 h-2 rounded-full bg-[var(--accent)] animate-pulse" />
            <span className="uppercase tracking-wider font-semibold">
              LIVE STREAM
            </span>
          </div>
        </div>
      </div>

      {/* ── 4 Primary Stat Instrument Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <DottedCard
          title="Blob Base Fee"
          telemetryMeta="12ms ago"
          badge="🟢 Live"
          badgeType="live"
          techBracket
          scanline
        >
          <div className="flex flex-col gap-1 py-0.5">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-mono font-bold text-[var(--text-primary)] tabular-nums">
                0.0012
              </span>
              <span className="text-sm font-mono text-[var(--text-secondary)] uppercase font-semibold">gwei</span>
            </div>
            <div className="flex items-center justify-between text-xs font-mono text-[var(--text-secondary)] pt-1.5 border-t border-dashed border-[var(--border)] mt-1 font-medium">
              <span>EST. USD COST</span>
              <span className="font-bold text-[var(--text-primary)] tabular-nums text-sm">~$0.045 / blob</span>
            </div>
          </div>
        </DottedCard>

        <DottedCard
          title="Blob Volume"
          telemetryMeta={`Window: ${timeRange.preset.toUpperCase()}`}
          badge="🟢 +14.2%"
          badgeType="iris"
          techBracket
          scanline
        >
          <div className="flex flex-col gap-1 py-0.5">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-mono font-bold text-[var(--text-primary)] tabular-nums">
                14,832
              </span>
              <span className="text-sm font-mono text-[var(--success)] font-semibold flex items-center">
                <TrendingUp className="w-4 h-4 inline mr-0.5" /> High
              </span>
            </div>
            <div className="flex items-center justify-between text-xs font-mono text-[var(--text-secondary)] pt-1.5 border-t border-dashed border-[var(--border)] mt-1 font-medium">
              <span>AVG THROUGHPUT</span>
              <span className="font-bold text-[var(--text-primary)] tabular-nums text-sm">3.84 / block</span>
            </div>
          </div>
        </DottedCard>

        <DottedCard
          title="Slot Saturation"
          telemetryMeta="Max Limit: 9.0"
          badge="🟡 78.4%"
          badgeType="warning"
          techBracket
          scanline
        >
          <div className="flex flex-col gap-1 py-0.5">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-mono font-bold text-[var(--warning)] tabular-nums">
                78.4%
              </span>
              <span className="text-sm font-mono text-[var(--warning)] font-semibold">Elevated</span>
            </div>
            <div className="flex items-center justify-between text-xs font-mono text-[var(--text-secondary)] pt-1.5 border-t border-dashed border-[var(--border)] mt-1 font-medium">
              <span>TARGET THRESHOLD</span>
              <span className="font-bold text-[var(--warning)] tabular-nums text-sm">50.0% (6 Blobs)</span>
            </div>
          </div>
        </DottedCard>

        <DottedCard
          title="Active Rollups"
          telemetryMeta="Ethereum L2"
          badge="🔵 18 L2s"
          badgeType="iris"
          techBracket
          scanline
        >
          <div className="flex flex-col gap-1 py-0.5">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-mono font-bold text-[var(--primary-text)] tabular-nums">
                18
              </span>
              <span className="text-sm font-mono text-[var(--primary-text)] uppercase font-semibold">Submitters</span>
            </div>
            <div className="flex items-center justify-between text-xs font-mono text-[var(--text-secondary)] pt-1.5 border-t border-dashed border-[var(--border)] mt-1 font-medium">
              <span>TOP ALLOCATION</span>
              <span className="font-bold text-[var(--primary-text)] text-sm">Base (34.2%)</span>
            </div>
          </div>
        </DottedCard>
      </div>

      {/* ── Section 1: Fee Market & State Regime Timeline ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <DottedCard
          title="Blob Fee Gauge"
          subtitle="Real-time base fee logarithmic scale"
          badge="🟢 EIP-4844"
          badgeType="default"
          techBracket
          className="lg:col-span-1 flex flex-col justify-between"
        >
          <BlobFeeGauge latestFeeWei={1200000} ethUsd={2850} />
        </DottedCard>

        <DottedCard
          title="Market State Timeline & Fee Trends"
          subtitle={`Base fee evolution (${timeRange.preset.toUpperCase()} Window) — drag slider to scrub point-in-time`}
          badge={`🟢 ${timeRange.preset.toUpperCase()}`}
          badgeType="iris"
          techBracket
          className="lg:col-span-2 flex flex-col justify-between gap-3"
        >
          <RegimeTimeline timeRange={timeRange} />
          <BlobFeeLineChart ethUsd={2850} timeRange={timeRange} />
        </DottedCard>
      </div>

      {/* ── Section 2: Saturation Regimes & Rollup Leaderboard ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <DottedCard
          title="Blob Volume by Saturation Regime"
          subtitle="Color coded by peak block saturation (Quiet, Healthy, Congested, Spike)"
          badge="🔵 Telemetry"
          badgeType="default"
          techBracket
          className="lg:col-span-2"
        >
          <BlobsPerBlockChart timeRange={timeRange} />
        </DottedCard>

        <DottedCard
          title="Top Rollup Submitters"
          subtitle="Data availability utilization ranking"
          badge="🔵 Rankings"
          badgeType="default"
          techBracket
          className="lg:col-span-1 flex flex-col justify-between"
        >
          <div className="flex flex-col gap-2 py-0.5">
            {[
              { name: "Base", share: "34.2%", blobs: 5072, color: "text-[var(--primary-text)]", bg: "bg-[var(--primary-bg)] border-[var(--primary-border)]" },
              { name: "Arbitrum One", share: "28.5%", blobs: 4227, color: "text-[var(--series-2)]", bg: "bg-[var(--series-2)]/10 border-[var(--series-2)]/30" },
              { name: "OP Mainnet", share: "18.1%", blobs: 2684, color: "text-[var(--series-3)]", bg: "bg-[var(--series-3)]/10 border-[var(--series-3)]/30" },
              { name: "Taiko", share: "8.4%", blobs: 1245, color: "text-[var(--series-5)]", bg: "bg-[var(--series-5)]/10 border-[var(--series-5)]/30" },
              { name: "Scroll", share: "5.2%", blobs: 771, color: "text-[var(--series-6)]", bg: "bg-[var(--surface-sunken)] border-[var(--border)]" },
            ].map((r, i) => (
              <div key={r.name} className="flex items-center justify-between p-2.5 bg-[var(--surface-1)] border border-dashed border-[var(--border)] rounded-[6px] hover:border-[var(--primary-border)] transition-colors">
                <div className="flex items-center gap-2.5">
                  <span className="text-xs font-mono font-bold text-[var(--text-muted)]">#{i + 1}</span>
                  <L2Icon name={r.name} size="sm" />
                  <div className="flex flex-col">
                    <span className="text-xs sm:text-sm font-mono font-semibold text-[var(--text-primary)]">{r.name}</span>
                    <span className="text-xs font-mono text-[var(--text-secondary)]">{r.blobs.toLocaleString()} blobs</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2.5 py-0.5 text-xs font-mono font-bold ${r.color} ${r.bg} border rounded-[4px]`}>
                    {r.share}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="pt-2.5 mt-2 border-t border-dashed border-[var(--border)] flex justify-end">
            <Link
              href="/leaderboard"
              className="text-xs sm:text-sm font-mono font-bold text-[var(--primary-text)] hover:underline flex items-center gap-1 uppercase tracking-wider"
            >
              [ VIEW ALL ROLLUPS ] <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </DottedCard>
      </div>

      {/* ── Section 3: Live Protocol Terminal & Real-Time Sidecar Feed ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Real-time Sidecar Feed */}
        <DottedCard
          title="Live Blob Sidecars"
          subtitle="Real-time Type-3 transaction payload stream"
          badge="🟢 Live Feed"
          badgeType="live"
          techBracket
          scanline
          className="lg:col-span-2"
        >
          <LiveSidecarFeed />
        </DottedCard>

        {/* BPO Protocol Capacity Status */}
        <DottedCard
          title="Protocol Capacity Roadmap"
          subtitle="EIP-7691 &amp; BPO parameter expansion tracker"
          badge="🟣 EIP-7691"
          badgeType="iris"
          techBracket
          className="lg:col-span-1 flex flex-col justify-between"
        >
          <BPOCapacityWidget />
        </DottedCard>
      </div>
    </div>
  );
}
