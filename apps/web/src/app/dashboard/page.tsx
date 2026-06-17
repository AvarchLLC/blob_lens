import { BlobFeeGauge } from "@/components/charts/BlobFeeGauge";
import { BlobFeeLineChartSelector } from "@/components/charts/BlobFeeLineChartSelector";
import { BlobsPerBlockChart } from "@/components/charts/BlobsPerBlockChart";
import { BlobUtilizationChart } from "@/components/charts/BlobUtilizationChart";
import { CongestionForecast } from "@/components/charts/CongestionForecast";
import { CostHeatmap } from "@/components/charts/CostHeatmap";
import { EfficiencyComparisonTable } from "@/components/charts/EfficiencyComparisonTable";
import { EfficiencyScatterplot } from "@/components/charts/EfficiencyScatterplot";
import { RegimeHeatmap } from "@/components/charts/RegimeHeatmap";
import { RollupNetworkGraphD3 } from "@/components/charts/RollupNetworkGraphD3";
import { RollupVolumeAreaChart } from "@/components/charts/RollupVolumeAreaChart";
import { BlockFeed } from "@/components/shared/BlockFeed";
import { EfficiencyLeaderboardMini } from "@/components/shared/EfficiencyLeaderboardMini";
import { FeeActionCard } from "@/components/shared/FeeActionCard";
import { LiveBlobFeed } from "@/components/shared/LiveBlobFeed";
import { RegimeBadge } from "@/components/shared/RegimeBadge";
import { RollupBadge } from "@/components/shared/RollupBadge";
import { RollupShareCard } from "@/components/shared/RollupShareCard";
import { RegimeAlertPanel } from "@/components/shared/RegimeAlertPanel";
import { InfoTooltip } from "@/components/shared/InfoTooltip";
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
import { LayoutGrid, Trophy, Activity, Network, BarChart2 } from "lucide-react";

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
  const currentRegime = classifyRegime(latestMaxBlobsInBlock) as "undersaturated" | "healthy" | "congested" | "spike";
  const networkAvgGwei = avgFeeWei24h / 1e9;

  return (
    <div className="animate-page-in space-y-8">
      {/* ── System Dashboard Header ── */}
      <div className="p-6 glass-card-bordered border-glow rounded-2xl flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 animate-fade-up">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-[9px] font-mono tracking-[0.25em] text-primary uppercase">
            <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
            System Console // EIP-4844 Analytics
          </div>
          <h1 className="text-3xl font-extrabold text-text-primary tracking-tight font-display">
            DA Intelligence Console
          </h1>
          <p className="text-xs text-text-secondary opacity-80 max-w-2xl leading-relaxed">
            Observing the Ethereum blob economy through real-time fee market health classification and rollup cost-efficiency scoring.
          </p>
        </div>
        
        {/* Devcon Supporter Highlights Badge */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="px-3.5 py-2 bg-primary/10 border border-primary/20 rounded-xl text-[10px] font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
            <Trophy className="h-3.5 w-3.5" />
            DA Cost-Efficiency Scoring
          </div>
          <div className="px-3.5 py-2 bg-accent/10 border border-accent/20 rounded-xl text-[10px] font-bold uppercase tracking-wider text-accent flex items-center gap-1.5">
            <Activity className="h-3.5 w-3.5" />
            Live Market Health Monitoring
          </div>
        </div>
      </div>

      {/* ── Technical Diagnostics Metrics Strip ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-card p-5 rounded-2xl flex items-center justify-between border-l-2 border-primary">
          <div>
            <p className="text-[9px] font-bold uppercase tracking-widest text-text-secondary opacity-50">Ecosystem Efficiency</p>
            <p className="font-mono text-2xl font-extrabold text-text-primary mt-1">
              {leaderboard.length ? (leaderboard.reduce((s, r) => s + Number(r.efficiency_score), 0) / leaderboard.length).toFixed(0) : "—"}/100
            </p>
          </div>
          <Trophy className="h-5 w-5 text-primary opacity-40" />
        </div>
        
        <div className="glass-card p-5 rounded-2xl flex items-center justify-between border-l-2 border-status-healthy">
          <div>
            <p className="text-[9px] font-bold uppercase tracking-widest text-text-secondary opacity-50">Market Regime</p>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="h-2 w-2 rounded-full bg-status-healthy animate-pulse" />
              <span className="text-xs font-bold uppercase tracking-wider text-text-primary">{currentRegime}</span>
            </div>
          </div>
          <Activity className="h-5 w-5 text-status-healthy opacity-40" />
        </div>

        <div className="glass-card p-5 rounded-2xl flex items-center justify-between border-l-2 border-accent">
          <div>
            <p className="text-[9px] font-bold uppercase tracking-widest text-text-secondary opacity-50">Current Base Fee</p>
            <p className="font-mono text-2xl font-extrabold text-text-primary mt-1">
              {latestFeeWei > 0 ? `${(latestFeeWei / 1e9).toFixed(3)} Gwei` : "—"}
            </p>
          </div>
          <span className="font-mono text-xs font-extrabold text-accent opacity-50">WEI</span>
        </div>

        <div className="glass-card p-5 rounded-2xl flex items-center justify-between border-l-2 border-purple-500">
          <div>
            <p className="text-[9px] font-bold uppercase tracking-widest text-text-secondary opacity-50">Active Rollups</p>
            <p className="font-mono text-2xl font-extrabold text-text-primary mt-1">
              {activeRollups}
            </p>
          </div>
          <LayoutGrid className="h-5 w-5 text-purple-500 opacity-40" />
        </div>
      </div>

      {/* ── Console Tabs ── */}
      <Tabs defaultValue="overview" className="w-full space-y-8">
        <TabsList className="bg-surface/60 backdrop-blur-md border border-border p-1.5 rounded-2xl h-16 flex items-center justify-start gap-1 overflow-x-auto custom-scrollbar">
          <TabsTrigger value="overview" className="px-6 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-all data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-inner">
            Overview
          </TabsTrigger>
          <TabsTrigger value="market" className="px-6 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-all data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-inner">
            Market Health
          </TabsTrigger>
          <TabsTrigger value="efficiency" className="px-6 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-all data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-inner">
            Cost Efficiency
          </TabsTrigger>
          <TabsTrigger value="topology" className="px-6 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-all data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-inner">
            Ecosystem Map
          </TabsTrigger>
          <TabsTrigger value="feeds" className="px-6 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-all data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-inner">
            Trends & Feeds
          </TabsTrigger>
        </TabsList>

        {/* ── Tab 1: Overview ── */}
        <TabsContent value="overview" className="m-0 space-y-8 animate-page-in">
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-stretch">
            {/* Left: Current Fee Gauge */}
            <div className="xl:col-span-4">
              <div className="glass-card rounded-2xl p-6 h-full flex flex-col justify-center items-center">
                <div className="flex items-center gap-1.5 mb-2 self-start">
                  <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-primary">Current Fee Gauge</span>
                  <InfoTooltip content="Real-time EIP-4844 blob base fee. High fees indicate heavy blob space demand, driving up rollup DA costs." side="right" />
                </div>
                <BlobFeeGauge latestFeeWei={latestFeeWei} ethUsd={ethUsd} />
              </div>
            </div>

            {/* Right: Mini Leaderboard */}
            <div className="xl:col-span-8">
              <div className="glass-card rounded-2xl p-6 h-full flex flex-col justify-between">
                <EfficiencyLeaderboardMini leaderboard={leaderboard} sparklines={sparklines} />
              </div>
            </div>
          </div>

          {/* Historical Blob Cost Hero Chart - full width for maximum breathing room */}
          <div className="glass-card rounded-2xl p-6">
            <div className="mb-3">
              <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-primary mb-1 block">Economics</span>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-text-primary tracking-tight">Historical Blob Cost Selector</h2>
                <InfoTooltip content="Analyze historical blob base fees. Toggle between network-wide average fees and individual rollup fee distributions." side="right" />
              </div>
              <p className="text-xs text-text-secondary opacity-60">Track network fee trends vs. individual rollup cost distributions over time.</p>
            </div>
            <div className="h-[400px]">
              <BlobFeeLineChartSelector
                networkData={market}
                rollups={leaderboard.filter(r => r.rollup !== "UNKNOWN").map(r => r.rollup)}
                rollupFeeData={rollupFeeData}
                ethUsd={ethUsd ?? undefined}
              />
            </div>
            {/* Chart Footer */}
            <div className="flex items-center justify-between pt-3 mt-3 border-t border-border/30">
              <span className="text-[10px] font-bold text-text-secondary/40 tracking-wider uppercase">bloblens.com</span>
              <span className="text-[10px] font-mono text-text-secondary/40">
                Updated {new Date().toLocaleString('en-US', { hour: '2-digit', minute: '2-digit', timeZoneName: 'short' })}
              </span>
            </div>
          </div>

          {/* Live action recommendation card */}
          <FeeActionCard
            regime={currentRegime}
            currentFeeWei={latestFeeWei}
            avgFeeWei24h={avgFeeWei24h}
            forecast={forecast}
          />

          {/* Snapshot Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="relative overflow-hidden glass-card rounded-2xl p-6 group">
              <div className="absolute top-0 right-0 w-24 h-24 bg-primary/[0.04] rounded-bl-[80px]" />
              <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-text-secondary opacity-60 mb-3">Total Blobs (24h)</p>
              <p className="font-mono text-3xl font-extrabold text-text-primary tracking-tight mb-1">
                {formatNumber(totalBlobs24h)}
              </p>
              <p className="text-xs text-text-secondary opacity-50">Combined throughput across all rollups in the last 24 hours.</p>
            </div>

            <div className="relative overflow-hidden glass-card rounded-2xl p-6 group">
              <div className="absolute top-0 right-0 w-24 h-24 bg-primary/[0.04] rounded-bl-[80px]" />
              <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-text-secondary opacity-60 mb-3">Average Utilization (24h)</p>
              <p className="font-mono text-3xl font-extrabold text-text-primary tracking-tight mb-1">
                {avgUtil24h}<span className="text-lg text-text-secondary ml-0.5">%</span>
              </p>
              <p className="text-xs text-text-secondary opacity-50">Average blob slot fullness relative to the per-block maximum.</p>
            </div>

            <div className="relative overflow-hidden glass-card rounded-2xl p-6 group">
              <div className="absolute top-0 right-0 w-24 h-24 bg-primary/[0.04] rounded-bl-[80px]" />
              <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-text-secondary opacity-60 mb-3">Avg Cost / Blob (24h)</p>
              <p className="font-mono text-3xl font-extrabold text-text-primary tracking-tight mb-1">
                {avgCostPerBlobUsd != null ? `$${avgCostPerBlobUsd < 0.01 ? avgCostPerBlobUsd.toFixed(6) : avgCostPerBlobUsd.toFixed(4)}` : "—"}
              </p>
              <p className="text-xs text-text-secondary opacity-50">Average USD cost to post one blob over the last 24 hours.</p>
            </div>
          </div>
        </TabsContent>

        {/* ── Tab 2: Market Health ── */}
        <TabsContent value="market" className="m-0 space-y-8 animate-page-in">
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-stretch">
            {/* Regime Heatmap */}
            <div className="xl:col-span-8 glass-card rounded-2xl p-6">
              <div className="flex items-center gap-1.5 mb-4">
                <h3 className="text-[10px] font-bold uppercase tracking-widest text-text-secondary opacity-60">7d Regime Classification (Hour × Day)</h3>
                <InfoTooltip content="Classifies blob fee market conditions hourly based on block fullness. Helps identify typical congestion hours and optimal posting windows." side="right" />
              </div>
              <div className="min-h-[280px]">
                <RegimeHeatmap data={market24h} />
              </div>
            </div>

            {/* Congestion Forecast */}
            <div className="xl:col-span-4 glass-card rounded-2xl p-6">
              <div className="flex items-center gap-1.5 mb-4">
                <h3 className="text-[10px] font-bold uppercase tracking-widest text-text-secondary opacity-60">4-12 Slot Congestion Forecast</h3>
                <InfoTooltip content="Forecasts potential market congestion and fee spikes over the next 4 to 12 slots using live mempool metrics." side="right" />
              </div>
              {forecast && forecast.current_fee_wei > 0 ? (
                <CongestionForecast data={forecast} />
              ) : (
                <div className="h-full flex items-center justify-center text-text-secondary opacity-40 italic text-xs min-h-[200px]">Insufficient data for forecast.</div>
              )}
            </div>
          </div>

          {/* Regime Webhook Alert Panel (Pillar 2 / Alert Hook) */}
          <div className="glass-card rounded-2xl p-6">
            <div className="mb-4">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-text-primary tracking-tight">Regime Threshold Webhooks</h3>
                <InfoTooltip content="Automated notifications for sequencer node operators. Alerts fire when the market transitions into congested or spike regimes." side="right" />
              </div>
              <p className="text-xs text-text-secondary opacity-70">Register automated webhook endpoints to notify your engineering or operations teams immediately when market regimes cross specified congestion bounds.</p>
            </div>
            <RegimeAlertPanel />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Blobs per Block */}
            <div className="glass-card rounded-2xl p-6 flex flex-col min-h-[380px]">
              <div className="flex items-center gap-1.5 mb-4">
                <h3 className="text-[10px] font-bold uppercase tracking-widest text-text-secondary opacity-60">Demand Density (Blobs per Block)</h3>
                <InfoTooltip content="Shows the frequency distribution of blobs per block. More blocks with 6 blobs signals an active congestion regime." side="right" />
              </div>
              <div className="flex-1">
                <BlobsPerBlockChart data={market24h} />
              </div>
            </div>
            {/* Utilization Trend */}
            <div className="glass-card rounded-2xl p-6 flex flex-col min-h-[380px]">
              <div className="flex items-center gap-1.5 mb-4">
                <h3 className="text-[10px] font-bold uppercase tracking-widest text-text-secondary opacity-60">Slot Utilization Trend</h3>
                <InfoTooltip content="Tracks average blob slot utilization over time. Consistent usage above the 50% target (3 blobs/block) escalates fees exponentially." side="right" />
              </div>
              <div className="flex-1">
                <BlobUtilizationChart data={market} />
              </div>
            </div>
          </div>
        </TabsContent>

        {/* ── Tab 3: Cost Efficiency ── */}
        <TabsContent value="efficiency" className="m-0 space-y-8 animate-page-in">
          {/* Full ranks efficiency table */}
          <div className="glass-card rounded-2xl p-6">
            <div className="mb-4">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-text-primary tracking-tight">Ecosystem Cost-Efficiency Leaderboard</h3>
                <InfoTooltip content="Standardized comparison scoring rollups out of 100. High scores represent dense blob packing and execution timed during low base fees." side="right" />
              </div>
              <p className="text-xs text-text-secondary opacity-70">Ranking all active rollups by their combined packing density and timing performance compared to the network baseline.</p>
            </div>
            <EfficiencyComparisonTable leaderboard={leaderboard} networkAvgGwei={networkAvgGwei} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
            {/* Efficiency Scatterplot */}
            <div className="glass-card rounded-2xl p-6 min-h-[460px] flex flex-col">
              <div className="flex items-center gap-1.5 mb-4">
                <h3 className="text-[10px] font-bold uppercase tracking-widest text-text-secondary opacity-60">Efficiency Diagnostics (Packing vs Timing)</h3>
                <InfoTooltip content="Compares packing score (how well rollups fill their blobs) vs timing score (how well they avoid fee surges). Top-right is optimal." side="right" />
              </div>
              <div className="flex-grow min-h-[360px]">
                <EfficiencyScatterplot data={leaderboard} />
              </div>
            </div>

            {/* Rollup Share Donut */}
            <div className="glass-card rounded-2xl p-6 flex flex-col min-h-[460px]">
              <div className="flex items-center gap-1.5 mb-4">
                <h3 className="text-[10px] font-bold uppercase tracking-widest text-text-secondary opacity-60">Rollup Volume Market Share</h3>
                <InfoTooltip content="Percentage breakdown of total blob volume submitted by each rollup. Helps visualize DA market dominance." side="right" />
              </div>
              <div className="flex-1">
                <RollupShareCard initialData={leaderboard} />
              </div>
            </div>
          </div>

          {/* Top 3 DA Performers Cards */}
          {top3Efficient.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Trophy className="h-4 w-4 text-primary" />
                <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-text-secondary opacity-60">Top DA Performers (24h)</h3>
                <InfoTooltip content="Top 3 rollups with outstanding gas-saving strategies in packing and fee-market timing." side="right" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {top3Efficient.map((row, idx) => {
                  const score = Number(row.efficiency_score);
                  const packing = Number(row.packing_score);
                  const timing = Number(row.timing_score);
                  const color = score >= 80 ? "var(--status-healthy)" : score >= 50 ? "var(--status-warning)" : "var(--status-critical)";
                  const medal = idx === 0 ? "🥇" : idx === 1 ? "🥈" : "🥉";
                  return (
                    <div key={row.rollup} className="glass-card rounded-2xl p-5 border-l-2" style={{ borderLeftColor: color }}>
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
        </TabsContent>

        {/* ── Tab 4: Ecosystem Map ── */}
        <TabsContent value="topology" className="m-0 space-y-8 animate-page-in">
          <div className="glass-card rounded-2xl p-6">
            <div className="mb-4">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-text-primary tracking-tight">Rollup Ecosystem Co-Occurrence Map</h3>
                <InfoTooltip content="Maps demand correlation. Nodes represent rollups; links show how often their transactions co-occur in the same block, highlighting shared congestion risks." side="right" />
              </div>
              <p className="text-xs text-text-secondary opacity-70">A force-directed D3 visualization mapping demand correlation. Large nodes indicate high blob volume, border glows represent efficiency scores, and linking edge thickness represents blocks with overlapping transactions.</p>
            </div>
            
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
                <div className="h-[580px] bg-background/30 rounded-xl overflow-hidden border border-border/30">
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
        </TabsContent>

        {/* ── Tab 5: Trends & Feeds ── */}
        <TabsContent value="feeds" className="m-0 space-y-8 animate-page-in">
          {/* Stacked area daily volume chart (30d) - full width */}
          <div className="glass-card rounded-2xl p-6">
            <div className="mb-4">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-text-primary tracking-tight">Ecosystem Volume (30d)</h3>
                <InfoTooltip content="Stacked volume chart showing daily counts of blobs posted per rollup, showing macro trends in throughput." side="right" />
              </div>
              <p className="text-xs text-text-secondary opacity-70">Daily blob volume distribution stacked per rollup over the last 30 days.</p>
            </div>
            <div className="h-[380px]">
              <RollupVolumeAreaChart data={dailyRollups} />
            </div>
            <div className="flex items-center justify-between pt-3 mt-3 border-t border-border/30">
              <span className="text-[10px] font-bold text-text-secondary/40 tracking-wider uppercase">bloblens.com</span>
              <span className="text-[10px] font-mono text-text-secondary/40">
                Updated {new Date().toLocaleString('en-US', { hour: '2-digit', minute: '2-digit', timeZoneName: 'short' })}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
            {/* Cost Heatmap */}
            {ethUsd != null && (
              <div className="glass-card rounded-2xl p-6 flex flex-col min-h-[380px]">
                <div className="flex items-center gap-1.5 mb-4">
                  <h3 className="text-[10px] font-bold uppercase tracking-widest text-text-secondary opacity-60">Cost Heatmap (7d × 24h)</h3>
                  <InfoTooltip content="Visualizes the average USD fee of posting a blob by hour and day of week. Highlights cheaper times to schedule batch submissions." side="right" />
                </div>
                <div className="flex-grow flex items-center justify-center min-h-[280px]">
                  <CostHeatmap data={market} ethUsd={ethUsd} />
                </div>
              </div>
            )}

            {/* Live block/transaction feeds */}
            <div className="glass-card rounded-2xl overflow-hidden flex flex-col min-h-[380px]">
              <Tabs defaultValue="blocks" className="w-full h-full flex flex-col">
                <TabsList className="flex gap-1 p-2 bg-surface-elevated/50 border-b border-border rounded-none h-12 shrink-0">
                  <TabsTrigger value="blocks" className="flex-1 rounded-md text-xs font-bold uppercase tracking-widest data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
                    Recent Blocks
                  </TabsTrigger>
                  <TabsTrigger value="transactions" className="flex-1 rounded-md text-xs font-bold uppercase tracking-widest data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
                    Live Transactions
                  </TabsTrigger>
                </TabsList>
                <div className="flex-grow min-h-0">
                  <TabsContent value="blocks" className="m-0 h-[320px] overflow-y-auto custom-scrollbar">
                    <BlockFeed />
                  </TabsContent>
                  <TabsContent value="transactions" className="m-0 h-[320px] overflow-y-auto custom-scrollbar">
                    <LiveBlobFeed />
                  </TabsContent>
                </div>
              </Tabs>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Strategic Context Footer */}
      <div className="p-10 border border-primary/20 bg-primary/5 rounded-2xl flex flex-col md:flex-row gap-10 items-center">
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
