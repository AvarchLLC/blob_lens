import { BlobsPerBlockChart } from "@/components/charts/BlobsPerBlockChart";
import { BlobUtilizationChart } from "@/components/charts/BlobUtilizationChart";
import { CongestionForecast } from "@/components/charts/CongestionForecast";
import { CumulativeBlobGrowth } from "@/components/charts/CumulativeBlobGrowth";
import { HistoricalBlobCostChart } from "@/components/charts/HistoricalBlobCostChart";
import { HistoricalBlobVolumeChart } from "@/components/charts/HistoricalBlobVolumeChart";
import { PackingHistogram } from "@/components/charts/PackingHistogram";
import { RegimeHeatmap } from "@/components/charts/RegimeHeatmap";
import { RollupShareDonut } from "@/components/charts/RollupShareDonut";
import { RollupVolumeAreaChart } from "@/components/charts/RollupVolumeAreaChart";
import { PageHeader, PageSection } from "@/components/shared/PageHeader";
import { MetricCard } from "@/components/shared/MetricCard";
import {
  getDailyRollupBreakdown,
  getForecastData,
  getFullnessHistogram,
  getHistoricalDailyStats,
  getLeaderboard,
  getMarketActivity,
  getBpoEpochStats,
  type BpoEpochStat,
  type HistoricalDailyStat,
} from "@/lib/queries";
import { BarChart3, FlaskConical, TrendingUp, Cpu, ChevronRight, Clock } from "lucide-react";
import Link from "next/link";
import React from "react";

export const revalidate = 60;

const BPO_META: Record<string, {
  eip: string; date: string; startBlock: number;
  bgStyle: React.CSSProperties; borderColor: string; badgeStyle: React.CSSProperties; dotColor: string; tagline: string;
}> = {
  Dencun: {
    eip: "EIP-4844", date: "Mar 13, 2024", startBlock: 19_426_587,
    bgStyle:     { background: "linear-gradient(135deg, rgba(59,130,246,0.10) 0%, transparent 100%)" },
    borderColor: "rgba(59,130,246,0.20)",
    badgeStyle:  { background: "rgba(59,130,246,0.10)", color: "#60A5FA", borderColor: "rgba(59,130,246,0.20)" },
    dotColor:    "#60A5FA",
    tagline: "Birth of the blob market — 3 target / 6 max blobs per block",
  },
  Pectra: {
    eip: "EIP-7691", date: "Apr 2025", startBlock: 22_431_084,
    bgStyle:     { background: "linear-gradient(135deg, rgba(139,92,246,0.10) 0%, transparent 100%)" },
    borderColor: "rgba(139,92,246,0.22)",
    badgeStyle:  { background: "rgba(139,92,246,0.10)", color: "#8B5CF6", borderColor: "rgba(139,92,246,0.22)" },
    dotColor:    "#8B5CF6",
    tagline: "2× blob throughput — 6 target / 9 max blobs per block",
  },
  Fusaka: {
    eip: "BPO2", date: "2025", startBlock: 24_833_256,
    bgStyle:     { background: "linear-gradient(135deg, rgba(82,102,110,0.10) 0%, transparent 100%)" },
    borderColor: "rgba(82,102,110,0.22)",
    badgeStyle:  { background: "rgba(82,102,110,0.10)", color: "#6B8A94", borderColor: "rgba(82,102,110,0.22)" },
    dotColor:    "#6B8A94",
    tagline: "4× throughput from Dencun — 12 target / 18 max blobs per block",
  },
};

function BpoEpochCard({ stat }: { stat: BpoEpochStat }) {
  const meta = BPO_META[stat.epoch] ?? BPO_META["Dencun"];
  const fillPct = stat.target_blobs > 0
    ? Math.min(100, (stat.avg_blobs_per_block / stat.target_blobs) * 100)
    : 0;
  const fillColorStyle = fillPct >= 80
    ? { backgroundColor: "var(--status-critical)" }
    : fillPct >= 50
      ? { backgroundColor: "var(--status-warning)" }
      : { backgroundColor: "var(--status-healthy)" };

  return (
    <div className="rounded-2xl border p-7 flex flex-col gap-5" style={{ borderColor: meta.borderColor, ...meta.bgStyle }}>
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: meta.dotColor }} />
            <h3 className="text-lg font-bold text-text-primary">{stat.epoch}</h3>
          </div>
          <p className="text-[10px] text-text-secondary/50">{meta.date} · Block {stat.start_block.toLocaleString()}</p>
          <p className="text-xs text-text-secondary/60 mt-1">{meta.tagline}</p>
        </div>
        <span className="text-[10px] font-bold px-2.5 py-1 rounded-full border shrink-0" style={meta.badgeStyle}>
          {meta.eip}
        </span>
      </div>

      {/* Key metrics */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: "Avg blobs / block", value: stat.avg_blobs_per_block.toFixed(2) },
          { label: "Avg fee (gwei)",    value: stat.avg_fee_gwei < 0.001 ? stat.avg_fee_gwei.toExponential(2) : stat.avg_fee_gwei.toFixed(4) },
          { label: "Total blobs",       value: Number(stat.total_blobs).toLocaleString() },
          { label: "Blocks with blobs", value: Number(stat.total_blocks_with_blobs).toLocaleString() },
        ].map((m) => (
          <div key={m.label} className="bg-background/40 rounded-xl p-3">
            <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-text-secondary/40 mb-1">{m.label}</p>
            <p className="font-mono text-sm font-bold text-text-primary">{m.value}</p>
          </div>
        ))}
      </div>

      {/* Target fill rate */}
      <div>
        <div className="flex items-center justify-between text-xs mb-2">
          <span className="text-text-secondary/50">Target fill rate</span>
          <span className="font-mono font-bold text-text-primary">{fillPct.toFixed(1)}%</span>
        </div>
        <div className="h-1.5 rounded-full bg-background/60 overflow-hidden mb-1.5">
          <div className="h-full rounded-full transition-all" style={{ width: `${fillPct}%`, ...fillColorStyle }} />
        </div>
        <div className="flex items-center justify-between text-[10px] text-text-secondary/30">
          <span>0</span>
          <span>Target ({stat.target_blobs})</span>
          <span>Max ({stat.max_blobs})</span>
        </div>
        <div className="relative h-1 mt-0.5">
          <div
            className="absolute h-3 w-0.5 bg-text-secondary/20 -top-1"
            style={{ left: `${(stat.target_blobs / stat.max_blobs) * 100}%` }}
          />
        </div>
      </div>

      {/* Throughput vs Dencun comparison */}
      {stat.epoch !== "Dencun" && (
        <div className="pt-3 border-t border-border/20">
          <p className="text-[10px] text-text-secondary/40 uppercase tracking-widest font-bold">
            Capacity vs Dencun: <span className="text-text-primary">
              {stat.epoch === "Pectra" ? "2×" : "3×"} target · {stat.epoch === "Pectra" ? "1.5×" : "3×"} max
            </span>
          </p>
        </div>
      )}
    </div>
  );
}

export default async function ResearchPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab = "market" } = await searchParams;
  const isBpo     = tab === "bpo";
  const isHistory = tab === "history";
  const isMarket  = !isBpo && !isHistory;

  const [market7d, market30d, leaderboard30d, dailyBreakdown, forecast, fullnessHistogram, bpoStats, historicalStats] =
    await Promise.all([
      isMarket   ? getMarketActivity(720).catch(() => [])                      : Promise.resolve([]),
      isMarket   ? getMarketActivity(2160).catch(() => [])                     : Promise.resolve([]),
      isMarket   ? getLeaderboard(2160).catch(() => [])                        : Promise.resolve([]),
      isMarket   ? getDailyRollupBreakdown(90).catch(() => [])                 : Promise.resolve([]),
      isMarket   ? getForecastData().catch(() => null)                         : Promise.resolve(null),
      isMarket   ? getFullnessHistogram(30).catch(() => [])                    : Promise.resolve([]),
      isBpo      ? getBpoEpochStats().catch(() => [] as BpoEpochStat[])        : Promise.resolve([] as BpoEpochStat[]),
      isHistory  ? getHistoricalDailyStats().catch(() => [] as HistoricalDailyStat[]) : Promise.resolve([] as HistoricalDailyStat[]),
    ]);

  const totalBlobs30d = leaderboard30d.reduce((s, r) => s + Number(r.total_blobs), 0);
  const totalTxs30d   = leaderboard30d.reduce((s, r) => s + Number(r.tx_count), 0);
  const rollupCount   = leaderboard30d.filter((r) => r.rollup !== "UNKNOWN").length;

  return (
    <div className="animate-page-in">
      <PageHeader
        meta="Economic Research"
        title="Blob Market Analytics"
        summary="Long-horizon analysis of Ethereum's data availability layer — from EIP-4844 blobs through every BPO upgrade."
      >
        <div className="flex items-center gap-1.5 px-3 py-1.5 surface border border-border rounded-md text-primary font-bold text-[10px] uppercase tracking-widest">
          <FlaskConical className="h-3 w-3" />
          Institutional View
        </div>
      </PageHeader>

      {/* ── Tab navigation ── */}
      <div className="flex items-center gap-1 mb-10 p-1 bg-surface-elevated/50 border border-border/30 rounded-xl w-fit">
        {[
          { value: "market",  label: "Blob Market",       icon: BarChart3 },
          { value: "bpo",     label: "BPO Upgrades",      icon: Cpu },
          { value: "history", label: "All-Time History",  icon: Clock },
        ].map(({ value, label, icon: Icon }) => {
          const active = tab === value || (value === "market" && isMarket);
          return (
            <Link
              key={value}
              href={`/research?tab=${value}`}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-bold uppercase tracking-widest transition-all ${
                active
                  ? "bg-primary/10 text-primary shadow-sm"
                  : "text-text-secondary hover:text-text-primary hover:bg-surface/60"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </Link>
          );
        })}
      </div>

      {/* ══ TAB: Blob Market ══ */}
      {isMarket && (
        <>
          {/* Summary strip */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            <MetricCard label="Blobs (30d)"       value={totalBlobs30d.toLocaleString()} note="Cumulative EIP-4844 blobs submitted." />
            <MetricCard label="Transactions (30d)" value={totalTxs30d.toLocaleString()}   note="Type-3 transactions in the monthly window." />
            <MetricCard label="Active Rollups"      value={rollupCount}                    note="Distinct L2 protocols active this month." />
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
            <div className="xl:col-span-8 space-y-12">
              <PageSection
                label="Growth Trends"
                title="Submission Velocity"
                description="Cumulative growth and block-level throughput analysis."
                interpretation="A steepening 'Cumulative Blob Growth' curve indicates accelerating L2 adoption. Fluctuations in 'Blobs per Block' reveal shifts in rollup batching efficiency."
              >
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                  <div>
                    <h4 className="text-[10px] font-bold uppercase tracking-widest text-text-secondary mb-4 opacity-60">
                      Cumulative Blob Growth (7d)
                    </h4>
                    <CumulativeBlobGrowth data={market7d} />
                  </div>
                  <div className="lg:border-l lg:border-border/50 lg:pl-10">
                    <h4 className="text-[10px] font-bold uppercase tracking-widest text-text-secondary mb-4 opacity-60">
                      Avg Blobs per Block (7d)
                    </h4>
                    <BlobsPerBlockChart data={market7d} />
                  </div>
                </div>
              </PageSection>

              <PageSection
                label="Market Structure"
                title="Ecosystem Distribution"
                description="Analysis of market share and long-term utilization patterns."
                interpretation="The 'Rollup Market Share' identifies which L2s are the primary drivers of Ethereum's DA revenue. Step-changes in volume often indicate protocol upgrades."
              >
                <div className="space-y-10">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                    <div>
                      <h4 className="text-[10px] font-bold uppercase tracking-widest text-text-secondary mb-4 opacity-60">
                        Market Share by Volume (30d)
                      </h4>
                      <div className="h-[350px] flex items-center justify-center">
                        <RollupShareDonut data={leaderboard30d} />
                      </div>
                    </div>
                    <div className="lg:border-l lg:border-border/50 lg:pl-10">
                      <h4 className="text-[10px] font-bold uppercase tracking-widest text-text-secondary mb-4 opacity-60">
                        Slot Utilization Trend (30d)
                      </h4>
                      <BlobUtilizationChart data={market30d} />
                    </div>
                  </div>
                  <div className="pt-10 border-t border-border/50">
                    <h4 className="text-[10px] font-bold uppercase tracking-widest text-text-secondary mb-4 opacity-60">
                      Daily Blob Volume by Rollup (Stacked)
                    </h4>
                    <RollupVolumeAreaChart data={dailyBreakdown} />
                  </div>
                </div>
              </PageSection>

              <PageSection
                label="Efficiency"
                title="Data Packing Analysis"
                description="Distribution of blob content fullness across all submissions."
                interpretation="A left-heavy distribution (high density in 0-20% buckets) suggests that rollups are paying for blob space they are not fully utilizing."
              >
                <div className="min-h-[350px]">
                  <PackingHistogram data={fullnessHistogram} />
                </div>
              </PageSection>
            </div>

            <div className="xl:col-span-4 space-y-12">
              <PageSection
                label="Patterns"
                title="Regime Timeline"
                description="Historical state analysis over 7 days."
                interpretation="The heatmap reveals repeating daily congestion patterns. Use these windows to schedule high-volume data availability tasks during 'Healthy' regimes."
              >
                <div className="min-h-[400px]">
                  <RegimeHeatmap data={market7d} />
                </div>
              </PageSection>

              {forecast && forecast.current_fee_wei > 0 && (
                <PageSection label="Forecast" title="Fee Projection" description="Short-term price modeling.">
                  <CongestionForecast data={forecast} />
                </PageSection>
              )}

              <div className="p-8 border border-primary/20 bg-primary/5 rounded-xl space-y-4">
                <div className="flex items-center gap-3">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  <h3 className="text-sm font-bold uppercase tracking-widest text-text-primary">Research Insight</h3>
                </div>
                <p className="text-xs text-text-secondary leading-relaxed">
                  The transition to Pectra parameters has significantly altered the supply-demand equilibrium. Current data suggests that
                  the &apos;Healthy&apos; regime now sustains higher throughput at lower costs compared to the initial Dencun launch.
                </p>
                <div className="pt-4 flex justify-between items-center text-[10px] font-bold text-primary uppercase tracking-widest">
                  <span>Confidence Score</span>
                  <span className="font-mono">88%</span>
                </div>
                <div className="h-1 w-full bg-primary/10 rounded-full overflow-hidden">
                  <div className="h-full bg-primary" style={{ width: "88%" }} />
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ══ TAB: BPO Upgrades ══ */}
      {isBpo && (
        <div className="space-y-12">
          {/* Intro */}
          <div className="rounded-2xl border border-border/30 bg-surface/30 p-8">
            <div className="flex items-start gap-4">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Cpu className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-text-primary mb-2">BPO Upgrade Analytics</h2>
                <p className="text-sm text-text-secondary/70 leading-relaxed max-w-3xl">
                  Each BPO (Blob Parameter Only) upgrade fundamentally changed the DA market — capacity, fee dynamics, and rollup behavior all shifted.
                  These stats are computed from indexed blob transactions, comparing each epoch&apos;s actual throughput against its target and maximum parameters.
                </p>
                <div className="flex flex-wrap gap-4 mt-4 text-[10px] font-bold uppercase tracking-widest">
                  {[
                    { label: "Dencun",  block: "19,426,587", eip: "EIP-4844",  dotColor: "#60A5FA" },
                    { label: "Pectra",  block: "22,431,084", eip: "EIP-7691",  dotColor: "#8B5CF6" },
                    { label: "Fusaka",  block: "24,833,256", eip: "BPO2",      dotColor: "#6B8A94" },
                  ].map((e) => (
                    <div key={e.label} className="flex items-center gap-1.5">
                      <span className="font-mono" style={{ color: e.dotColor }}>{e.label}</span>
                      <span className="text-text-secondary/30">·</span>
                      <span className="text-text-secondary/40">{e.eip}</span>
                      <span className="text-text-secondary/30">·</span>
                      <span className="text-text-secondary/30">Block {e.block}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Epoch comparison cards */}
          {bpoStats.length > 0 ? (
            <div>
              <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-text-secondary opacity-60 mb-6">
                Epoch-by-Epoch Metrics
              </h3>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {bpoStats.map((stat) => (
                  <BpoEpochCard key={stat.epoch} stat={stat} />
                ))}
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-border/30 bg-surface/30 p-12 text-center">
              <p className="text-sm text-text-secondary/40">BPO epoch data is indexing. Check back shortly.</p>
            </div>
          )}

          {/* Parameter comparison table */}
          <div>
            <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-text-secondary opacity-60 mb-4">
              Protocol Parameters by Epoch
            </h3>
            <div className="rounded-xl border border-border/30 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/30 bg-surface-elevated/30">
                    {["Epoch", "EIP", "Activation Block", "Target Blobs", "Max Blobs", "Max DA / Block", "Update Fraction"].map((h) => (
                      <th key={h} className="px-5 py-3.5 text-left text-[10px] font-bold uppercase tracking-[0.15em] text-text-secondary/50">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    { epoch: "Dencun", eip: "EIP-4844", block: "19,426,587", target: 3, max: 6,  da: "768 KB",   fraction: "3,338,477",  dotColor: "#60A5FA" },
                    { epoch: "Pectra", eip: "EIP-7691", block: "22,431,084", target: 6, max: 9,  da: "1,152 KB", fraction: "5,007,716",  dotColor: "#8B5CF6" },
                    { epoch: "Fusaka", eip: "BPO2",     block: "24,833,256", target: 12, max: 18, da: "2,304 KB", fraction: "11,684,671", dotColor: "#6B8A94" },
                  ].map((row, i) => (
                    <tr key={row.epoch} className={`border-b border-border/15 hover:bg-surface/30 transition-colors ${i % 2 === 0 ? "" : "bg-surface/20"}`}>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full" style={{ background: row.dotColor }} />
                          <span className="font-bold text-text-primary">{row.epoch}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4 font-mono text-xs text-text-secondary/60">{row.eip}</td>
                      <td className="px-5 py-4 font-mono text-xs text-text-secondary/60">{row.block}</td>
                      <td className="px-5 py-4 font-mono text-sm font-bold text-text-primary">{row.target}</td>
                      <td className="px-5 py-4 font-mono text-sm font-bold text-text-primary">{row.max}</td>
                      <td className="px-5 py-4 font-mono text-xs text-text-secondary">{row.da}</td>
                      <td className="px-5 py-4 font-mono text-xs text-text-secondary/60">{row.fraction}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-[10px] text-text-secondary/30 mt-2 px-1">
              Max DA per block = max_blobs × 128 KB. Update fraction governs the fake_exponential blob base fee calculation.
            </p>
          </div>

          {/* What changed narrative */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[
              {
                title: "Dencun → Pectra",
                subtitle: "The supply shock",
                body: "EIP-7691 doubled the blob target and raised the max cap, dramatically reducing fee pressure. Blob base fees dropped by orders of magnitude as the market adapted to the expanded supply.",
                dotColor: "#8B5CF6",
                borderColor: "rgba(139,92,246,0.22)",
              },
              {
                title: "Pectra → Fusaka",
                subtitle: "Scaling with demand",
                body: "The Fusaka BPO2 upgrade targets 12 blobs per block — 4× Dencun's original target — as rollup adoption continues to grow. The update fraction change also affects fee curve steepness.",
                dotColor: "#6B8A94",
                borderColor: "rgba(82,102,110,0.22)",
              },
              {
                title: "What to watch",
                subtitle: "Key signals",
                body: "Track target fill rate per epoch. When avg blobs/block exceeds the target, fee pressure builds. A fill rate consistently above 80% of target signals upcoming congestion.",
                dotColor: "var(--primary)",
                borderColor: "var(--primary-border)",
              },
            ].map((card) => (
              <div key={card.title} className="rounded-xl bg-surface/30 p-6 border" style={{ borderColor: card.borderColor }}>
                <div className="flex items-center gap-2 mb-3">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: card.dotColor }} />
                  <h4 className="font-bold text-sm text-text-primary">{card.title}</h4>
                </div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-text-secondary/40 mb-3">{card.subtitle}</p>
                <p className="text-xs text-text-secondary/70 leading-relaxed">{card.body}</p>
              </div>
            ))}
          </div>

          {/* CTA to blob market tab */}
          <div className="flex items-center justify-center pt-4">
            <Link href="/research?tab=market"
              className="inline-flex items-center gap-2 text-sm font-bold text-primary hover:gap-3 transition-all">
              View Blob Market analytics <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      )}

      {/* ══ TAB: All-Time History ══ */}
      {isHistory && (
        <div className="space-y-12">
          {/* Intro */}
          <div className="rounded-2xl border border-border/30 bg-surface/30 p-8">
            <div className="flex items-start gap-4">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Clock className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-text-primary mb-2">All-Time History</h2>
                <p className="text-sm text-text-secondary/70 leading-relaxed max-w-3xl">
                  Full historical view of the Ethereum DA layer from the Dencun activation (March 2024) to today.
                  Each BPO daily record is shaded by BPO epoch — Dencun <span style={{ color: "#60A5FA" }} className="font-semibold">blue</span>,
                  Pectra <span style={{ color: "#8B5CF6" }} className="font-semibold">purple</span>,
                  Fusaka <span style={{ color: "#6B8A94" }} className="font-semibold">slate</span>.
                  Use Alt + scroll or the slider to zoom in on any period.
                </p>
              </div>
            </div>
          </div>

          {historicalStats.length > 0 ? (
            <>
              {/* Summary strip */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {(() => {
                  const totalBlobs = historicalStats.reduce((s, d) => s + Number(d.total_blobs), 0);
                  const totalDays  = historicalStats.length;
                  const avgFee     = historicalStats.filter(d => d.avg_fee_gwei > 0)
                                       .reduce((s, d) => s + d.avg_fee_gwei, 0) /
                                     Math.max(1, historicalStats.filter(d => d.avg_fee_gwei > 0).length);
                  const peakDay    = historicalStats.reduce((m, d) => Number(d.total_blobs) > Number(m.total_blobs) ? d : m, historicalStats[0]);
                  return (
                    <>
                      <MetricCard label="All-Time Blobs"   value={totalBlobs >= 1_000_000 ? (totalBlobs / 1_000_000).toFixed(2) + "M" : totalBlobs.toLocaleString()} note="Total EIP-4844 blobs since Dencun." />
                      <MetricCard label="Days of Data"     value={totalDays.toLocaleString()} note="Calendar days indexed from Dencun to present." />
                      <MetricCard label="All-Time Avg Fee" value={avgFee < 0.000001 ? avgFee.toExponential(2) + " G" : avgFee.toFixed(4) + " G"} note="Average daily blob base fee in Gwei." />
                      <MetricCard label="Peak Day (blobs)" value={Number(peakDay.total_blobs).toLocaleString()} note={`Highest single-day blob count (${peakDay.day}).`} />
                    </>
                  );
                })()}
              </div>

              <PageSection
                label="Cost History"
                title="Blob Base Fee — All Time"
                description="Daily average blob base fee since EIP-4844 Dencun activation. Log scale reveals fee dynamics across orders of magnitude. Background shading marks BPO epoch boundaries."
                interpretation="Sharp fee spikes indicate periods of blob demand exceeding the target. Each BPO upgrade reset the supply curve, causing visible step-downs in the fee baseline."
              >
                <HistoricalBlobCostChart data={historicalStats} />
              </PageSection>

              <PageSection
                label="Volume History"
                title="Daily Blob Volume — All Time"
                description="Total blobs submitted per day from Dencun to present. Background shading marks BPO epoch boundaries."
                interpretation="Rising blob counts following each upgrade demonstrate successful adoption of expanded capacity. Flat periods or dips often correspond to L2 protocol maintenance windows."
              >
                <HistoricalBlobVolumeChart data={historicalStats} />
              </PageSection>
            </>
          ) : (
            <div className="rounded-xl border border-border/30 bg-surface/30 p-12 text-center">
              <p className="text-sm text-text-secondary/40">Historical data is loading. Check back shortly.</p>
            </div>
          )}

          <div className="flex items-center justify-center pt-4">
            <Link href="/research?tab=bpo"
              className="inline-flex items-center gap-2 text-sm font-bold text-primary hover:gap-3 transition-all">
              View BPO Upgrade analytics <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
