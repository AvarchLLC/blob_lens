import { BlobFeeGauge } from "@/components/charts/BlobFeeGauge";
import { BlobFeeLineChartSelector } from "@/components/charts/BlobFeeLineChartSelector";
import { BlobsPerBlockChart } from "@/components/charts/BlobsPerBlockChart";
import { BlobUtilizationChart } from "@/components/charts/BlobUtilizationChart";
import { CongestionForecast } from "@/components/charts/CongestionForecast";
import { CostHeatmap } from "@/components/charts/CostHeatmap";
import { DACostCharts } from "@/components/charts/DACostCharts";
import { EfficiencyScatterplot } from "@/components/charts/EfficiencyScatterplot";
import { RegimeHeatmap } from "@/components/charts/RegimeHeatmap";
import { RollupNetworkGraphD3 } from "@/components/charts/RollupNetworkGraphD3";
import { RollupVolumeAreaChart } from "@/components/charts/RollupVolumeAreaChart";
import { BlockFeed } from "@/components/shared/BlockFeed";
import { EfficiencyLeaderboardMini } from "@/components/shared/EfficiencyLeaderboardMini";
import { LiveBlobFeed } from "@/components/shared/LiveBlobFeed";
import { RegimeBadge } from "@/components/shared/RegimeBadge";
import { RollupBadge } from "@/components/shared/RollupBadge";
import { RollupShareCard } from "@/components/shared/RollupShareCard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getEthPrice } from "@/lib/ethPrice";
import {
  getDailyRollupBreakdown,
  getForecastData,
  getHourlyRollupFee,
  getLeaderboard,
  getMarketActivity,
  getRollupNetworkGraph,
  getRollupSparklines,
} from "@/lib/queries";
import { classifyRegime, formatNumber } from "@/lib/utils";
import { LayoutGrid, Trophy, Activity } from "lucide-react";

export const revalidate = 60;

export default async function OverviewPage() {
  const [leaderboard, market, dailyRollups, ethUsd, rollupFeeData, networkGraph, sparklines, forecast] = await Promise.all([
    getLeaderboard(24).catch(() => []),
    getMarketActivity(720).catch(() => []), 
    getDailyRollupBreakdown(30, 16).catch(() => []),
    getEthPrice().catch(() => null),
    getHourlyRollupFee(24, 20).catch(() => []),
    getRollupNetworkGraph(24).catch(() => ({ nodes: [], edges: [] })),
    getRollupSparklines().catch(() => []),
    getForecastData().catch(() => null),
  ]);

  const market24h = market.slice(-24);
  const latestHour = market24h.length > 0 ? market24h[market24h.length - 1] : null;
  const latestMaxBlobs = market24h.length > 0 ? Math.max(...market24h.map((m) => m.max_blobs_in_block)) : 0;
  const latestFeeWei = latestHour ? Number(latestHour.avg_fee) : 0;
  const avgFeeWei24h = market24h.length
    ? market24h.reduce((s, m) => s + Number(m.avg_fee), 0) / market24h.length
    : 0;

  // 24h snapshot stats
  const totalBlobs24h = leaderboard.reduce((s, r) => s + Number(r.total_blobs), 0);
  const avgUtil24h = market24h.length
    ? (market24h.reduce((s, m) => s + Number(m.avg_utilization), 0) / market24h.length).toFixed(1)
    : "—";
  const activeRollups = leaderboard.filter((r) => r.rollup !== "UNKNOWN").length;

  // Average cost per blob in USD
  const avgCostPerBlobUsd = market24h.length > 0 && avgFeeWei24h > 0 && ethUsd
    ? (avgFeeWei24h * 131_072) / 1e18 * ethUsd
    : null;

  // Ecosystem map context metrics
  const topByVolume = leaderboard.filter(r => r.rollup !== "UNKNOWN")[0];
  const topByEfficiency = [...leaderboard]
    .filter(r => r.rollup !== "UNKNOWN" && Number(r.total_blobs) > 10)
    .sort((a, b) => Number(b.efficiency_score) - Number(a.efficiency_score))[0];

  // Gap 1: Top 3 DA performers
  const top3Efficient = [...leaderboard]
    .filter((r) => r.rollup !== "UNKNOWN" && Number(r.total_blobs) > 0)
    .sort((a, b) => Number(b.efficiency_score) - Number(a.efficiency_score))
    .slice(0, 3);

  // Gap 2: Regime classification
  const latestMaxBlobsInBlock = market24h.length > 0 ? Math.max(...market24h.map((m) => m.max_blobs_in_block)) : 0;

  return (
    <div className="animate-page-in space-y-0">

      {/* ═══════════════════════════════════════════════════════════════
          §01 — MARKET PULSE
          ═══════════════════════════════════════════════════════════════ */}
      <section id="market-pulse" className="scroll-mt-24 mb-10">
        <div className="mb-6 animate-fade-up">
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary mb-1.5 block">
            Protocol Analytics
          </span>
          <h1 className="text-2xl font-bold text-text-primary tracking-tight mb-1">
            Network Overview
          </h1>
          <p className="text-sm text-text-secondary opacity-70 max-w-2xl">
            Real-time monitoring of Ethereum&apos;s EIP-4844 blob market.
          </p>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-stretch">
          {/* Left: Current Fee Gauge */}
          <div className="xl:col-span-4">
            <div className="bg-surface border border-border rounded-xl p-6 h-full flex flex-col justify-center items-center">
              <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-primary mb-2 self-start">Current Fee</span>
              <BlobFeeGauge latestFeeWei={latestFeeWei} ethUsd={ethUsd} />
            </div>
          </div>

          {/* Right: Historical Blob Cost Hero Chart */}
          <div className="xl:col-span-8">
            <div className="bg-surface border border-border rounded-xl p-6 h-full flex flex-col">
              <div className="mb-3">
                <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-primary mb-1 block">Economics</span>
                <h2 className="text-lg font-bold text-text-primary tracking-tight">Historical Blob Cost</h2>
              </div>
              <div className="flex-1">
                <BlobFeeLineChartSelector
                  networkData={market}
                  rollups={leaderboard.filter(r => r.rollup !== "UNKNOWN").map(r => r.rollup)}
                  rollupFeeData={rollupFeeData}
                  ethUsd={ethUsd ?? undefined}
                />
              </div>
              {/* Chart Footer — only on hero charts */}
              <div className="flex items-center justify-between pt-3 mt-3 border-t border-border/30">
                <span className="text-[10px] font-bold text-text-secondary/40 tracking-wider uppercase">bloblens.com</span>
                <span className="text-[10px] font-mono text-text-secondary/40">
                  Updated {new Date().toLocaleString('en-US', { hour: '2-digit', minute: '2-digit', timeZoneName: 'short' })}
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Section Divider ── */}
      <div className="border-t border-border/20 mb-10" />

      {/* ═══════════════════════════════════════════════════════════════
          §02 — 24H SNAPSHOT
          ═══════════════════════════════════════════════════════════════ */}
      <section id="24h-snapshot" className="scroll-mt-24 mb-10">
        <div className="mb-5">
          <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-primary mb-1 block">Executive Summary</span>
          <h2 className="text-lg font-bold text-text-primary tracking-tight">24h Snapshot</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Total Blobs */}
          <div className="relative overflow-hidden bg-surface-elevated border border-border rounded-xl p-6 group hover:border-primary/25 transition-all duration-200">
            <div className="absolute top-0 right-0 w-28 h-28 bg-primary/[0.06] dark:bg-primary/[0.04] rounded-bl-[80px]" />
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-text-secondary opacity-60 mb-3">Total Blobs</p>
            <p className="font-mono text-3xl font-bold text-text-primary tracking-tight mb-1">
              {formatNumber(totalBlobs24h)}
            </p>
            <p className="text-[11px] text-text-secondary opacity-50">Combined throughput across all rollups in the last 24 hours.</p>
          </div>

          {/* Avg Utilization */}
          <div className="relative overflow-hidden bg-surface-elevated border border-border rounded-xl p-6 group hover:border-primary/25 transition-all duration-200">
            <div className="absolute top-0 right-0 w-28 h-28 bg-primary/[0.06] dark:bg-primary/[0.04] rounded-bl-[80px]" />
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-text-secondary opacity-60 mb-3">Avg Utilization</p>
            <p className="font-mono text-3xl font-bold text-text-primary tracking-tight mb-1">
              {avgUtil24h}<span className="text-lg text-text-secondary ml-0.5">%</span>
            </p>
            <p className="text-[11px] text-text-secondary opacity-50">Average blob slot fullness relative to the per-block maximum.</p>
          </div>

          {/* Avg Cost/Blob */}
          <div className="relative overflow-hidden bg-surface-elevated border border-border rounded-xl p-6 group hover:border-primary/25 transition-all duration-200">
            <div className="absolute top-0 right-0 w-28 h-28 bg-primary/[0.06] dark:bg-primary/[0.04] rounded-bl-[80px]" />
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-text-secondary opacity-60 mb-3">Avg Cost / Blob</p>
            <p className="font-mono text-3xl font-bold text-text-primary tracking-tight mb-1">
              {avgCostPerBlobUsd != null ? `$${avgCostPerBlobUsd < 0.01 ? avgCostPerBlobUsd.toFixed(6) : avgCostPerBlobUsd.toFixed(4)}` : "—"}
            </p>
            <p className="text-[11px] text-text-secondary opacity-50">Average USD cost to post one blob over the last 24 hours.</p>
          </div>
        </div>
      </section>

      {/* ── Section Divider ── */}
      <div className="border-t border-border/20 mb-10" />

      {/* ═══════════════════════════════════════════════════════════════
          §02.5 — DA COST ANALYSIS
          ═══════════════════════════════════════════════════════════════ */}
      <section id="da-cost-analysis" className="scroll-mt-24 mb-10">
        <div className="mb-6">
          <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-primary mb-1 block">Deep Economics</span>
          <h2 className="text-lg font-bold text-text-primary tracking-tight">DA Cost Analysis</h2>
          <p className="text-xs text-text-secondary opacity-70">Surgical breakdown of rollup data availability expenditures and packing efficiency.</p>
        </div>
        <DACostCharts leaderboard={leaderboard} ethUsd={ethUsd} />

        {/* Top DA Performers */}
        {top3Efficient.length > 0 && (
          <div className="mt-8">
            <div className="flex items-center gap-2 mb-5">
              <Trophy className="h-4 w-4 text-primary" />
              <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-text-secondary opacity-60">Top DA Performers (24h)</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {top3Efficient.map((row, idx) => {
                const score = Number(row.efficiency_score);
                const packing = Number(row.packing_score);
                const timing = Number(row.timing_score);
                const color = score >= 80 ? "var(--status-healthy)" : score >= 50 ? "var(--status-warning)" : "var(--status-critical)";
                const medal = idx === 0 ? "🥇" : idx === 1 ? "🥈" : "🥉";
                return (
                  <div key={row.rollup} className="bg-surface border border-border rounded-xl p-5 border-l-2" style={{ borderLeftColor: color }}>
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{medal}</span>
                        <RollupBadge rollup={row.rollup} linkable />
                      </div>
                      <div className="font-mono text-2xl font-bold tracking-tighter" style={{ color }}>
                        {score.toFixed(0)}
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider text-text-secondary opacity-60 mb-1">
                          <span>Packing</span><span style={{ color }}>{packing.toFixed(0)}%</span>
                        </div>
                        <div className="h-1 w-full bg-surface-elevated rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${packing}%`, backgroundColor: color }} />
                        </div>
                      </div>
                      <div className="pt-2 border-t border-border/30 flex justify-between text-[10px] font-bold">
                        <span className="text-text-secondary opacity-50 uppercase tracking-wider">Timing</span>
                        <span className="text-text-primary">{timing.toFixed(0)}/100</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </section>

      {/* ── Section Divider ── */}
      <div className="border-t border-border/20 mb-10" />

      {/* ═══════════════════════════════════════════════════════════════
          §02.6 — FEE MARKET HEALTH (GAP 2)
          ═══════════════════════════════════════════════════════════════ */}
      <section id="fee-market-health" className="scroll-mt-24 mb-10">
        <div className="mb-6 flex items-start justify-between">
          <div>
            <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-primary mb-1 block">Fee Market Health</span>
            <h2 className="text-lg font-bold text-text-primary tracking-tight">Market Regime & Congestion</h2>
            <p className="text-xs text-text-secondary opacity-70">Live classification of blob market state and short-term fee forecasting.</p>
          </div>
          <RegimeBadge maxBlobsInBlock={latestMaxBlobsInBlock} size="lg" />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          {/* Regime Heatmap */}
          <div className="xl:col-span-8 bg-surface border border-border rounded-xl p-6">
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-text-secondary mb-4 opacity-60">24h Regime Classification</h3>
            <div className="min-h-[280px]">
              <RegimeHeatmap data={market24h} />
            </div>
          </div>

          {/* Congestion Forecast */}
          <div className="xl:col-span-4 bg-surface border border-border rounded-xl p-6">
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-text-secondary mb-4 opacity-60">Congestion Forecast</h3>
            {forecast && forecast.current_fee_wei > 0 ? (
              <CongestionForecast data={forecast} />
            ) : (
              <div className="h-full flex items-center justify-center text-text-secondary opacity-40 italic text-xs min-h-[200px]">Insufficient data for forecast.</div>
            )}
          </div>
        </div>
      </section>

      {/* ── Section Divider ── */}
      <div className="border-t border-border/20 mb-10" />

      {/* ═══════════════════════════════════════════════════════════════
          §03 — ROLLUP ECOSYSTEM MAP
          ═══════════════════════════════════════════════════════════════ */}
      <section id="ecosystem-map" className="scroll-mt-24 mb-10">
        <div className="mb-6">
          <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-primary mb-1 block">Structural Intelligence</span>
          <h2 className="text-lg font-bold text-text-primary tracking-tight">Rollup Ecosystem Map</h2>
          <p className="text-xs text-text-secondary opacity-70">Force-directed visualization of blobspace demand relationships across Ethereum rollups.</p>
        </div>
        <div className="bg-surface border border-border rounded-xl p-6">
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
            {/* Left Context Panel */}
            <div className="xl:col-span-3 space-y-4">
              {topByVolume && (
                <div className="p-4 rounded-lg bg-surface-elevated/50 border border-border/50 space-y-1">
                  <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-text-secondary opacity-50">Largest DA Consumer</p>
                  <p className="text-sm font-bold text-text-primary">{topByVolume.rollup}</p>
                  <p className="font-mono text-xs text-primary">{formatNumber(Number(topByVolume.total_blobs))} blobs</p>
                </div>
              )}
              {topByEfficiency && (
                <div className="p-4 rounded-lg bg-surface-elevated/50 border border-border/50 space-y-1">
                  <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-text-secondary opacity-50">Highest Efficiency</p>
                  <p className="text-sm font-bold text-text-primary">{topByEfficiency.rollup}</p>
                  <p className="font-mono text-xs text-status-healthy">{Number(topByEfficiency.efficiency_score).toFixed(0)} / 100</p>
                </div>
              )}
              <div className="p-4 rounded-lg bg-surface-elevated/50 border border-border/50 space-y-1">
                <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-text-secondary opacity-50">Active Nodes</p>
                <p className="text-sm font-bold text-text-primary">{networkGraph.nodes.length} rollups</p>
                <p className="font-mono text-xs text-text-secondary">{networkGraph.edges.length} relationships</p>
              </div>
            </div>

            {/* Right: Force-Directed Graph */}
            <div className="xl:col-span-9">
              <div className="h-[560px]">
                {networkGraph.nodes.length > 0 ? (
                  <RollupNetworkGraphD3 data={networkGraph} />
                ) : (
                  <div className="h-full flex items-center justify-center text-text-secondary opacity-40 italic text-xs">
                    No relationship data available.
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="mt-4 p-3 bg-primary/5 border border-primary/10 rounded-lg">
            <p className="text-xs text-text-secondary leading-relaxed">
              <span className="font-bold text-text-primary mr-1">Interpretation:</span>
              Node size represents blob volume. Edge thickness shows co-occurrence frequency. Glow color indicates efficiency tier. Drag nodes and scroll to zoom.
            </p>
          </div>
        </div>
      </section>

      {/* ── Section Divider ── */}
      <div className="border-t border-border/20 mb-10" />

      {/* ═══════════════════════════════════════════════════════════════
          §04 — MARKET STRUCTURE
          ═══════════════════════════════════════════════════════════════ */}
      <section id="market-structure" className="scroll-mt-24 mb-10">
        <div className="mb-6">
          <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-primary mb-1 block">Analysis</span>
          <h2 className="text-lg font-bold text-text-primary tracking-tight">Market Structure</h2>
          <p className="text-xs text-text-secondary opacity-70">Demand density and ecosystem distribution.</p>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
          {/* Blobs per Block */}
          <div className="bg-surface border border-border rounded-xl p-6 flex flex-col min-h-[420px]">
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-text-secondary mb-4 opacity-60">
              Demand Density
            </h3>
            <div className="flex-1">
              <BlobsPerBlockChart data={market24h} />
            </div>
          </div>

          {/* Rollup Share */}
          <div className="bg-surface border border-border rounded-xl p-6 flex flex-col min-h-[420px]">
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-text-secondary mb-4 opacity-60">
              Who Contributes
            </h3>
            <div className="flex-1">
              <RollupShareCard initialData={leaderboard} />
            </div>
          </div>
        </div>
      </section>

      {/* ── Section Divider ── */}
      <div className="border-t border-border/20 mb-10" />

      {/* ═══════════════════════════════════════════════════════════════
          §05 — 30D TRENDS
          ═══════════════════════════════════════════════════════════════ */}
      <section id="30d-trends" className="scroll-mt-24 mb-10 space-y-6">
        {/* Main: Full-width stacked area */}
        <div>
          <div className="mb-6">
            <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-primary mb-1 block">Growth</span>
            <h2 className="text-lg font-bold text-text-primary tracking-tight">Ecosystem Volume (30d)</h2>
            <p className="text-xs text-text-secondary opacity-70">Daily blob volume by rollup — the strongest historical market narrative.</p>
          </div>
          <div className="bg-surface border border-border rounded-xl p-6">
            <RollupVolumeAreaChart data={dailyRollups} />
            <div className="flex items-center justify-between pt-3 mt-3 border-t border-border/30">
              <span className="text-[10px] font-bold text-text-secondary/40 tracking-wider uppercase">bloblens.com</span>
              <span className="text-[10px] font-mono text-text-secondary/40">
                Updated {new Date().toLocaleString('en-US', { hour: '2-digit', minute: '2-digit', timeZoneName: 'short' })}
              </span>
            </div>
          </div>
        </div>

        {/* Below: 2-col */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
          {ethUsd != null && (
            <div className="bg-surface border border-border rounded-xl p-6 flex flex-col min-h-[340px]">
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-text-secondary mb-4 opacity-60">
                Cost Heatmap (7d × 24h)
              </h3>
              <div className="flex-1"><CostHeatmap data={market} ethUsd={ethUsd} /></div>
            </div>
          )}
          <div className="bg-surface border border-border rounded-xl p-6 flex flex-col min-h-[340px]">
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-text-secondary mb-4 opacity-60">
              Utilization Trend
            </h3>
            <div className="flex-1"><BlobUtilizationChart data={market} /></div>
          </div>
        </div>
      </section>

      {/* ── Section Divider ── */}
      <div className="border-t border-border/20 mb-10" />

      {/* ═══════════════════════════════════════════════════════════════
          §06 — EFFICIENCY INTELLIGENCE
          ═══════════════════════════════════════════════════════════════ */}
      <section id="efficiency-intelligence" className="scroll-mt-24 mb-10">
        <div className="mb-6">
          <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-primary mb-1 block">Comparative Diagnostics</span>
          <h2 className="text-lg font-bold text-text-primary tracking-tight">Efficiency Intelligence</h2>
          <p className="text-xs text-text-secondary opacity-70">Cross-rollup cost vs. utilization analysis. Bubble size indicates volume.</p>
        </div>
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-stretch">
          {/* Left: Scatter */}
          <div className="xl:col-span-7">
            <div className="bg-surface border border-border rounded-xl p-6 h-full min-h-[460px]">
              <EfficiencyScatterplot data={leaderboard} />
            </div>
          </div>

          {/* Right: Mini Leaderboard */}
          <div className="xl:col-span-5">
            <div className="bg-surface border border-border rounded-xl p-6 h-full">
              <EfficiencyLeaderboardMini leaderboard={leaderboard} sparklines={sparklines} />
            </div>
          </div>
        </div>
      </section>

      {/* ── Section Divider ── */}
      <div className="border-t border-border/20 mb-10" />

      {/* ═══════════════════════════════════════════════════════════════
          §08 — LIVE FEED
          ═══════════════════════════════════════════════════════════════ */}
      <section id="live-feed" className="scroll-mt-24 mb-10">
        <div className="mb-6">
          <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-primary mb-1 block">Monitoring</span>
          <h2 className="text-lg font-bold text-text-primary tracking-tight">Live Feed</h2>
          <p className="text-xs text-text-secondary opacity-70">Real-time block and transaction data polled directly from the indexer.</p>
        </div>
        <div className="bg-surface border border-border rounded-xl overflow-hidden">
          <Tabs defaultValue="blocks" className="w-full">
            <TabsList className="flex gap-1 p-2 bg-surface-elevated/50 border-b border-border rounded-none h-12">
              <TabsTrigger value="blocks" className="flex-1 rounded-md text-xs font-bold uppercase tracking-widest data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
                Recent Blocks
              </TabsTrigger>
              <TabsTrigger value="transactions" className="flex-1 rounded-md text-xs font-bold uppercase tracking-widest data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
                Live Transactions
              </TabsTrigger>
            </TabsList>
            <div className="p-0">
              <TabsContent value="blocks" className="m-0">
                <div className="h-[400px] overflow-y-auto custom-scrollbar">
                  <BlockFeed />
                </div>
              </TabsContent>
              <TabsContent value="transactions" className="m-0">
                <div className="h-[400px] overflow-y-auto custom-scrollbar">
                  <LiveBlobFeed />
                </div>
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </section>

      {/* Strategic Context Footer */}
      <div className="p-10 border border-primary/20 bg-primary/5 rounded-2xl flex flex-col md:flex-row gap-10 items-center mt-4">
        <div className="flex-1 space-y-4">
          <div className="flex items-center gap-3 text-primary">
            <LayoutGrid className="h-6 w-6" />
            <h3 className="text-lg font-bold uppercase tracking-widest">Ecosystem Context</h3>
          </div>
          <p className="text-sm text-text-secondary leading-relaxed max-w-2xl">
            BlobLens provides a unified observability layer for EIP-4844. By monitoring these metrics, rollup teams can optimize gas strategies, while Ethereum governance can track the health and scaling progress of the Data Availability layer.
          </p>
        </div>
        <div className="shrink-0 flex gap-4">
           <div className="px-6 py-4 bg-surface border border-border rounded-xl text-center">
              <p className="text-[10px] font-bold text-text-secondary uppercase mb-1">Status</p>
              <div className="flex items-center gap-2">
                 <span className="h-2 w-2 rounded-full bg-status-healthy animate-pulse" />
                 <span className="text-xs font-bold text-text-primary uppercase tracking-tighter">Indexer Syncing</span>
              </div>
           </div>
           <div className="px-6 py-4 bg-surface border border-border rounded-xl text-center">
              <p className="text-[10px] font-bold text-text-secondary uppercase mb-1">Network</p>
              <span className="text-xs font-bold text-text-primary uppercase tracking-tighter">Ethereum Mainnet</span>
           </div>
        </div>
      </div>
    </div>
  );
}
