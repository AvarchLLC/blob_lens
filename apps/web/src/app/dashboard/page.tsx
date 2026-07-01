import dynamic from "next/dynamic";

const BlobFeeGauge = dynamic(() => import("@/components/charts/BlobFeeGauge").then(m => m.BlobFeeGauge), {
  loading: () => <div className="h-[200px] w-full animate-pulse bg-surface-elevated/30 rounded-none border border-dashed border-border/20" />
});

const BlobFeeLineChartSelector = dynamic(() => import("@/components/charts/BlobFeeLineChartSelector").then(m => m.BlobFeeLineChartSelector), {
  loading: () => <div className="h-[400px] w-full animate-pulse bg-surface-elevated/30 rounded-none border border-dashed border-border/20" />
});

const BlobsPerBlockChart = dynamic(() => import("@/components/charts/BlobsPerBlockChart").then(m => m.BlobsPerBlockChart), {
  loading: () => <div className="h-[300px] w-full animate-pulse bg-surface-elevated/30 rounded-none border border-dashed border-border/20" />
});

const BlobUtilizationChart = dynamic(() => import("@/components/charts/BlobUtilizationChart").then(m => m.BlobUtilizationChart), {
  loading: () => <div className="h-[300px] w-full animate-pulse bg-surface-elevated/30 rounded-none border border-dashed border-border/20" />
});

const CongestionForecast = dynamic(() => import("@/components/charts/CongestionForecast").then(m => m.CongestionForecast), {
  loading: () => <div className="h-[300px] w-full animate-pulse bg-surface-elevated/30 rounded-none border border-dashed border-border/20" />
});

const CostHeatmap = dynamic(() => import("@/components/charts/CostHeatmap").then(m => m.CostHeatmap), {
  loading: () => <div className="h-[350px] w-full animate-pulse bg-surface-elevated/30 rounded-none border border-dashed border-border/20" />
});

const EfficiencyScatterplot = dynamic(() => import("@/components/charts/EfficiencyScatterplot").then(m => m.EfficiencyScatterplot), {
  loading: () => <div className="h-[350px] w-full animate-pulse bg-surface-elevated/30 rounded-none border border-dashed border-border/20" />
});

const RegimeHeatmap = dynamic(() => import("@/components/charts/RegimeHeatmap").then(m => m.RegimeHeatmap), {
  loading: () => <div className="h-[350px] w-full animate-pulse bg-surface-elevated/30 rounded-none border border-dashed border-border/20" />
});

const RollupNetworkGraphD3 = dynamic(() => import("@/components/charts/RollupNetworkGraphD3").then(m => m.RollupNetworkGraphD3), {
  loading: () => <div className="h-[500px] w-full animate-pulse bg-surface-elevated/30 rounded-none border border-dashed border-border/20" />
});

const RollupVolumeAreaChart = dynamic(() => import("@/components/charts/RollupVolumeAreaChart").then(m => m.RollupVolumeAreaChart), {
  loading: () => <div className="h-[300px] w-full animate-pulse bg-surface-elevated/30 rounded-none border border-dashed border-border/20" />
});
import { BlockFeed } from "@/components/shared/BlockFeed";
import { EfficiencyComparisonTable } from "@/components/charts/EfficiencyComparisonTable";
import { EfficiencyLeaderboardMini } from "@/components/shared/EfficiencyLeaderboardMini";
import { FeeActionCard } from "@/components/shared/FeeActionCard";
import { LiveBlobFeed } from "@/components/shared/LiveBlobFeed";
import { RegimeBadge } from "@/components/shared/RegimeBadge";
import { RollupBadge } from "@/components/shared/RollupBadge";
import { RollupShareCard } from "@/components/shared/RollupShareCard";
import { RegimeAlertPanel } from "@/components/shared/RegimeAlertPanel";
import { InfoTooltip } from "@/components/shared/InfoTooltip";
import { CopySectionLink } from "@/components/shared/CopySectionLink";
import { DashboardScrollHandler } from "@/components/shared/DashboardScrollHandler";
import { ChartCardFooter } from "@/components/shared/ChartCardFooter";
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
import { classifyRegime, formatNumber, cn } from "@/lib/utils";
import { LayoutGrid, Trophy, Activity, Network, BarChart2 } from "lucide-react";
import Link from "next/link";

export const revalidate = 60;

export default async function OverviewPage({
  searchParams,
}: {
  searchParams: Promise<{ window?: string; tab?: string }>;
}) {
  const params = await searchParams;
  const window = params.window ?? "24h";
  const activeTab = params.tab ?? "overview";
  
  let hours = 24;
  if (window === "365d") {
    hours = 8760;
  } else if (window === "90d") {
    hours = 2160;
  } else if (window === "30d") {
    hours = 720;
  } else if (window === "7d") {
    hours = 168;
  }

  const heatmapDays = window === "365d" ? 30 : window === "90d" ? 30 : window === "30d" ? 30 : window === "7d" ? 7 : 7;
  const periodLabel = window === "365d" ? "365d" : window === "90d" ? "90d" : window === "30d" ? "30d" : window === "7d" ? "7d" : "30d";
  const periodDaysText = window === "365d" ? "365 days" : window === "90d" ? "90 days" : window === "30d" ? "30 days" : window === "7d" ? "7 days" : "30 days";

  const [leaderboard, market, dailyRollups, ethUsd, rollupFeeData, networkGraph, sparklines, forecast] = await Promise.all([
    getLeaderboard(hours).catch(() => []),
    getMarketActivity(hours === 24 ? 168 : hours).catch(() => []), 
    getDailyRollupBreakdown(
      window === "365d" ? 365 : window === "90d" ? 90 : window === "30d" ? 30 : window === "7d" ? 7 : 30,
      16
    ).catch(() => []),
    getEthPrice().catch(() => null),
    getHourlyRollupFee(hours, 20).catch(() => []),
    getRollupNetworkGraph(hours).catch(() => ({ nodes: [], edges: [] })),
    getRollupSparklines().catch(() => []),
    getForecastData().catch(() => null),
  ]);

  // For calculations, we use the selected hours window (or last 24h)
  const marketSnapshot = market.slice(-hours);
  const latestHour = marketSnapshot.length > 0 ? marketSnapshot[marketSnapshot.length - 1] : null;
  const latestFeeWei = latestHour ? Number(latestHour.avg_fee) : 0;
  
  const avgFeeWeiPeriod = marketSnapshot.length
    ? marketSnapshot.reduce((s, m) => s + Number(m.avg_fee), 0) / marketSnapshot.length
    : 0;

  // Snapshot stats for the selected period
  const totalBlobsPeriod = leaderboard.reduce((s, r) => s + Number(r.total_blobs), 0);
  const avgUtilPeriod = marketSnapshot.length
    ? (marketSnapshot.reduce((s, m) => s + Number(m.avg_utilization), 0) / marketSnapshot.length).toFixed(1)
    : "—";
  const activeRollups = leaderboard.filter((r) => r.rollup !== "UNKNOWN").length;

  // Average cost per blob in USD for the selected period
  const avgCostPerBlobUsd = marketSnapshot.length > 0 && avgFeeWeiPeriod > 0 && ethUsd
    ? (avgFeeWeiPeriod * 131_072) / 1e18 * ethUsd
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
  const latestMaxBlobsInBlock = marketSnapshot.length > 0 ? Math.max(...marketSnapshot.map((m) => m.max_blobs_in_block)) : 0;
  const currentRegime = classifyRegime(latestMaxBlobsInBlock) as "undersaturated" | "healthy" | "congested" | "spike";
  const networkAvgGwei = avgFeeWeiPeriod / 1e9;

  // Timeframe options
  const timeframes = [
    { label: "24 HOURS", value: "24h" },
    { label: "7 DAYS", value: "7d" },
    { label: "30 DAYS", value: "30d" },
    { label: "90 DAYS", value: "90d" },
    { label: "365 DAYS", value: "365d" },
  ];

  return (
    <div className="animate-page-in space-y-8">
      {/* ── System Dashboard Header ── */}
      <div className="animate-fade-up mb-10 pb-6 border-b border-dotted border-border">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="max-w-3xl">
            <p
              className="mb-1"
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.65rem',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color: 'var(--text-tertiary)',
              }}
            >
              System Console · EIP-4844 Analytics
            </p>
            <h1 className="page-title">DA Intelligence Console</h1>
            <p className="body-base text-text-secondary mt-2 max-w-[600px] leading-relaxed">
              Observing the Ethereum blob economy through real-time fee market health classification and rollup cost-efficiency scoring.
            </p>
          </div>
          
          {/* Control Bar: Time-Frame Selector & Highlights */}
          <div className="flex flex-wrap items-center gap-4 shrink-0">
            {/* Time-Frame Selector */}
            <div className="flex items-center border border-border bg-surface p-0.5 rounded-sm shadow-sm">
              {timeframes.map((tf) => {
                const isActive = window === tf.value;
                return (
                  <Link
                    key={tf.value}
                    href={`/dashboard?window=${tf.value}`}
                    className={cn(
                      "px-3 py-1.5 text-[9px] font-bold uppercase tracking-wider transition-all duration-150 rounded-sm",
                      isActive
                        ? "bg-primary text-white shadow-sm"
                        : "text-text-secondary hover:text-text-primary hover:bg-surface-elevated"
                    )}
                  >
                    {tf.label}
                  </Link>
                );
              })}
            </div>

            <div className="h-6 w-px bg-border/40 hidden sm:block" />

            {/* Badges */}
            <div className="flex items-center gap-2">
              <div className="px-3.5 py-2 bg-primary/10 border border-primary/20 rounded-sm text-[10px] font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                <Trophy className="h-3.5 w-3.5" />
                Scoring
              </div>
              <div className="px-3.5 py-2 bg-accent/10 border border-accent/20 rounded-sm text-[10px] font-bold uppercase tracking-wider text-accent flex items-center gap-1.5">
                <Activity className="h-3.5 w-3.5" />
                Live Monitoring
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Technical Diagnostics Metrics Strip ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="stat-card">
          <p className="section-label">Ecosystem Efficiency</p>
          <h2 className="metric-value">
            {leaderboard.length ? (leaderboard.reduce((s, r) => s + Number(r.efficiency_score), 0) / leaderboard.length).toFixed(0) : "—"}/100
          </h2>
          <span className="caption text-text-secondary">composite score</span>
        </div>
        
        <div className="stat-card">
          <p className="section-label">Market Regime</p>
          <h2 className={cn(
            "metric-value uppercase",
            currentRegime === "undersaturated" && "text-status-neutral",
            currentRegime === "healthy" && "text-status-healthy",
            currentRegime === "congested" && "text-status-warning",
            currentRegime === "spike" && "text-status-critical"
          )}>
            {currentRegime}
          </h2>
          <span className="caption text-text-secondary">EIP-4844 status</span>
        </div>

        <div className="stat-card">
          <p className="section-label">Current Base Fee</p>
          <h2 className="metric-value">
            {latestFeeWei > 0 ? `${(latestFeeWei / 1e9).toFixed(3)} Gwei` : "—"}
          </h2>
          <span className="caption text-text-secondary">network average</span>
        </div>

        <div className="stat-card">
          <p className="section-label">Active Rollups</p>
          <h2 className="metric-value">
            {activeRollups}
          </h2>
          <span className="caption text-text-secondary">submitting data</span>
        </div>
      </div>

      {/* ── Console Tabs ── */}
      <Tabs defaultValue={activeTab} className="w-full space-y-8">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="market">Market Health</TabsTrigger>
          <TabsTrigger value="efficiency">Cost Efficiency</TabsTrigger>
          <TabsTrigger value="topology">Ecosystem Map</TabsTrigger>
          <TabsTrigger value="feeds">Trends &amp; Feeds</TabsTrigger>
        </TabsList>

        {/* ── Tab 1: Overview ── */}
        <TabsContent value="overview" className="m-0 space-y-8 animate-page-in">
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-stretch">
            {/* Left: Current Fee Gauge */}
            <div className="xl:col-span-4" id="fee-gauge">
              <div className="cosmic-card h-full flex flex-col justify-between items-stretch relative group/card">
                <div className="absolute top-3 right-3 opacity-0 group-hover/card:opacity-100 transition-opacity z-10">
                  <CopySectionLink sectionId="fee-gauge" tab="overview" />
                </div>
                <div className="flex flex-col items-center justify-center flex-grow">
                  <div className="flex items-center gap-1.5 mb-2 self-start">
                    <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-primary">Current Fee Gauge</span>
                    <InfoTooltip content="Real-time EIP-4844 blob base fee. High fees indicate heavy blob space demand, driving up rollup DA costs." side="right" />
                  </div>
                  <BlobFeeGauge latestFeeWei={latestFeeWei} ethUsd={ethUsd} />
                </div>
                <ChartCardFooter />
              </div>
            </div>

            {/* Right: Mini Leaderboard */}
            <div className="xl:col-span-8" id="leaderboard-mini">
              <div className="cosmic-card h-full flex flex-col justify-between relative group/card">
                <div className="absolute top-3 right-3 opacity-0 group-hover/card:opacity-100 transition-opacity z-10">
                  <CopySectionLink sectionId="leaderboard-mini" tab="overview" />
                </div>
                <EfficiencyLeaderboardMini leaderboard={leaderboard} sparklines={sparklines} />
                <ChartCardFooter />
              </div>
            </div>
          </div>

          {/* Historical Blob Cost Hero Chart - full width for maximum breathing room */}
          <div className="cosmic-card relative group/card" id="historical-cost-selector">
            <div className="absolute top-3 right-3 opacity-0 group-hover/card:opacity-100 transition-opacity z-10">
              <CopySectionLink sectionId="historical-cost-selector" tab="overview" />
            </div>
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
            <ChartCardFooter />
          </div>

          {/* Live action recommendation card */}
          <FeeActionCard
            regime={currentRegime}
            currentFeeWei={latestFeeWei}
            avgFeeWei24h={avgFeeWeiPeriod}
            forecast={forecast}
          />

          {/* Snapshot Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="relative overflow-hidden cosmic-card group">
              <div className="absolute top-0 right-0 w-24 h-24 bg-primary/[0.04] rounded-bl-[80px]" />
              <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-text-secondary opacity-60 mb-3">Total Blobs ({window})</p>
              <p className="font-mono text-3xl font-extrabold text-text-primary tracking-tight mb-1">
                {formatNumber(totalBlobsPeriod)}
              </p>
              <p className="text-xs text-text-secondary opacity-50">Combined throughput across all rollups in the selected period.</p>
            </div>

            <div className="relative overflow-hidden cosmic-card group">
              <div className="absolute top-0 right-0 w-24 h-24 bg-primary/[0.04] rounded-bl-[80px]" />
              <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-text-secondary opacity-60 mb-3">Average Utilization ({window})</p>
              <p className="font-mono text-3xl font-extrabold text-text-primary tracking-tight mb-1">
                {avgUtilPeriod}<span className="text-lg text-text-secondary ml-0.5">%</span>
              </p>
              <p className="text-xs text-text-secondary opacity-50">Average blob slot fullness relative to the per-block maximum during this period.</p>
            </div>

            <div className="relative overflow-hidden cosmic-card group">
              <div className="absolute top-0 right-0 w-24 h-24 bg-primary/[0.04] rounded-bl-[80px]" />
              <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-text-secondary opacity-60 mb-3">Avg Cost / Blob ({window})</p>
              <p className="font-mono text-3xl font-extrabold text-text-primary tracking-tight mb-1">
                {avgCostPerBlobUsd != null ? `$${avgCostPerBlobUsd < 0.01 ? avgCostPerBlobUsd.toFixed(6) : avgCostPerBlobUsd.toFixed(4)}` : "—"}
              </p>
              <p className="text-xs text-text-secondary opacity-50">Average USD cost to post one blob over this period.</p>
            </div>
          </div>
        </TabsContent>

        {/* ── Tab 2: Market Health ── */}
        <TabsContent value="market" className="m-0 space-y-8 animate-page-in">
          {/* Regime Heatmap - full width */}
          <div className="cosmic-card relative group/card" id="regime-heatmap">
            <div className="absolute top-3 right-3 opacity-0 group-hover/card:opacity-100 transition-opacity z-10">
              <CopySectionLink sectionId="regime-heatmap" tab="market" />
            </div>
            <div className="flex items-center gap-1.5 mb-4">
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-text-secondary opacity-60">Regime Classification ({heatmapDays}d · Hour × Day)</h3>
              <InfoTooltip content="Classifies blob fee market conditions hourly based on block fullness. Helps identify typical congestion hours and optimal posting windows." side="right" />
            </div>
            <div className="min-h-[180px]">
              <RegimeHeatmap data={market} daysCount={heatmapDays} />
            </div>
            <ChartCardFooter />
          </div>

          {/* Congestion Forecast - full width */}
          <div className="cosmic-card relative group/card flex flex-col justify-between" id="congestion-forecast">
            <div className="absolute top-3 right-3 opacity-0 group-hover/card:opacity-100 transition-opacity z-10">
              <CopySectionLink sectionId="congestion-forecast" tab="market" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 mb-4">
                <h3 className="text-[10px] font-bold uppercase tracking-widest text-text-secondary opacity-60">4-12 Slot Congestion Forecast</h3>
                <InfoTooltip content="Forecasts potential market congestion and fee spikes over the next 4 to 12 slots using live mempool metrics." side="right" />
              </div>
              {forecast && forecast.current_fee_wei > 0 ? (
                <CongestionForecast data={forecast} />
              ) : (
                <div className="h-full flex items-center justify-center text-text-secondary opacity-40 italic text-xs min-h-[120px]">Insufficient data for forecast.</div>
              )}
            </div>
            <ChartCardFooter />
          </div>

          {/* Regime Webhook Alert Panel (Pillar 2 / Alert Hook) */}
          <div className="cosmic-card">
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
            <div className="cosmic-card flex flex-col min-h-[380px] relative group/card" id="demand-density">
              <div className="absolute top-3 right-3 opacity-0 group-hover/card:opacity-100 transition-opacity z-10">
                <CopySectionLink sectionId="demand-density" tab="market" />
              </div>
              <div className="flex items-center gap-1.5 mb-4">
                <h3 className="text-[10px] font-bold uppercase tracking-widest text-text-secondary opacity-60">Demand Density (Blobs per Block)</h3>
                <InfoTooltip content="Shows the frequency distribution of blobs per block. More blocks with 6 blobs signals an active congestion regime." side="right" />
              </div>
              <div className="flex-1">
                <BlobsPerBlockChart data={marketSnapshot} />
              </div>
              <ChartCardFooter />
            </div>
            {/* Utilization Trend */}
            <div className="cosmic-card flex flex-col min-h-[380px] relative group/card" id="slot-utilization">
              <div className="absolute top-3 right-3 opacity-0 group-hover/card:opacity-100 transition-opacity z-10">
                <CopySectionLink sectionId="slot-utilization" tab="market" />
              </div>
              <div className="flex items-center gap-1.5 mb-4">
                <h3 className="text-[10px] font-bold uppercase tracking-widest text-text-secondary opacity-60">Slot Utilization Trend</h3>
                <InfoTooltip content="Tracks average blob slot utilization over time. Consistent usage above the 50% target (3 blobs/block) escalates fees exponentially." side="right" />
              </div>
              <div className="flex-1">
                <BlobUtilizationChart data={market} />
              </div>
              <ChartCardFooter />
            </div>
          </div>
        </TabsContent>

        {/* ── Tab 3: Cost Efficiency ── */}
        <TabsContent value="efficiency" className="m-0 space-y-8 animate-page-in">
          {/* Full ranks efficiency table */}
          <div className="cosmic-card relative group/card" id="efficiency-leaderboard">
            <div className="absolute top-3 right-3 opacity-0 group-hover/card:opacity-100 transition-opacity z-10">
              <CopySectionLink sectionId="efficiency-leaderboard" tab="efficiency" />
            </div>
            <div className="mb-4">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-text-primary tracking-tight">Ecosystem Cost-Efficiency Leaderboard</h3>
                <InfoTooltip content="Standardized comparison scoring rollups out of 100. High scores represent dense blob packing and execution timed during low base fees." side="right" />
              </div>
              <p className="text-xs text-text-secondary opacity-70">Ranking all active rollups by their combined packing density and timing performance compared to the network baseline.</p>
            </div>
            <EfficiencyComparisonTable leaderboard={leaderboard} networkAvgGwei={networkAvgGwei} ethUsd={ethUsd ?? undefined} />
            <ChartCardFooter />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
            {/* Efficiency Scatterplot */}
            <div className="cosmic-card min-h-[460px] flex flex-col relative group/card" id="efficiency-scatterplot">
              <div className="absolute top-3 right-3 opacity-0 group-hover/card:opacity-100 transition-opacity z-10">
                <CopySectionLink sectionId="efficiency-scatterplot" tab="efficiency" />
              </div>
              <div className="flex items-center gap-1.5 mb-4">
                <h3 className="text-[10px] font-bold uppercase tracking-widest text-text-secondary opacity-60">Efficiency Diagnostics (Packing vs Timing)</h3>
                <InfoTooltip content="Compares packing score (how well rollups fill their blobs) vs timing score (how well they avoid fee surges). Top-right is optimal." side="right" />
              </div>
              <div className="flex-grow min-h-[360px]">
                <EfficiencyScatterplot data={leaderboard} />
              </div>
              <ChartCardFooter />
            </div>

            {/* Rollup Share Donut */}
            <div className="cosmic-card flex flex-col min-h-[460px] relative group/card" id="volume-share">
              <div className="absolute top-3 right-3 opacity-0 group-hover/card:opacity-100 transition-opacity z-10">
                <CopySectionLink sectionId="volume-share" tab="efficiency" />
              </div>
              <div className="flex items-center gap-1.5 mb-4">
                <h3 className="text-[10px] font-bold uppercase tracking-widest text-text-secondary opacity-60">Rollup Volume Market Share</h3>
                <InfoTooltip content="Percentage breakdown of total blob volume submitted by each rollup. Helps visualize DA market dominance." side="right" />
              </div>
              <div className="flex-1 flex flex-col justify-between">
                <RollupShareCard initialData={leaderboard} />
              </div>
              <ChartCardFooter />
            </div>
          </div>

          {/* Top 3 DA Performers Cards */}
          {top3Efficient.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Trophy className="h-4 w-4 text-primary" />
                <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-text-secondary opacity-60">Top DA Performers ({window})</h3>
                <InfoTooltip content="Top 3 rollups with outstanding gas-saving strategies in packing and fee-market timing." side="right" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {top3Efficient.map((row, idx) => {
                  const score = Number(row.efficiency_score);
                  const packing = Number(row.packing_score);
                  const timing = Number(row.timing_score);
                  const color = "var(--primary)";
                  const medal = idx === 0 ? "🥇" : idx === 1 ? "🥈" : "🥉";
                  return (
                    <div key={`${row.rollup}-${idx}`} className="cosmic-card border-l-2" style={{ borderLeftColor: color, padding: '1.25rem' }}>
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
          <div className="cosmic-card relative group/card" id="co-occurrence-map">
            <div className="absolute top-3 right-3 opacity-0 group-hover/card:opacity-100 transition-opacity z-10">
              <CopySectionLink sectionId="co-occurrence-map" tab="topology" />
            </div>
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
                  <div className="p-4 rounded-sm bg-surface-elevated/50 border border-border/50 space-y-1">
                    <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-text-secondary opacity-50">Largest DA Consumer</p>
                    <p className="text-sm font-bold text-text-primary">{topByVolume.rollup}</p>
                    <p className="font-mono text-xs text-primary">{formatNumber(Number(topByVolume.total_blobs))} blobs</p>
                  </div>
                )}
                {topByEfficiency && (
                  <div className="p-4 rounded-sm bg-surface-elevated/50 border border-border/50 space-y-1">
                    <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-text-secondary opacity-50">Highest Efficiency</p>
                    <p className="text-sm font-bold text-text-primary">{topByEfficiency.rollup}</p>
                    <p className="font-mono text-xs text-status-healthy">{Number(topByEfficiency.efficiency_score).toFixed(0)} / 100</p>
                  </div>
                )}
                <div className="p-4 rounded-sm bg-surface-elevated/50 border border-border/50 space-y-1">
                  <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-text-secondary opacity-50">Active Nodes</p>
                  <p className="text-sm font-bold text-text-primary">{networkGraph.nodes.length} rollups</p>
                  <p className="font-mono text-xs text-text-secondary">{networkGraph.edges.length} relationships</p>
                </div>
              </div>

              {/* Right: Force-Directed Graph */}
              <div className="xl:col-span-9">
                <div className="h-[580px] bg-background/30 rounded-sm overflow-hidden border border-border/30">
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
            
            <div className="mt-4 p-3 bg-primary/5 border border-primary/10 rounded-sm">
              <p className="text-xs text-text-secondary leading-relaxed">
                <span className="font-bold text-text-primary mr-1">Interpretation:</span>
                Node size represents blob volume. Edge thickness shows co-occurrence frequency. Glow color indicates efficiency tier. Drag nodes and scroll to zoom.
              </p>
            </div>
            <ChartCardFooter />
          </div>
        </TabsContent>

        {/* ── Tab 5: Trends & Feeds ── */}
        <TabsContent value="feeds" className="m-0 space-y-8 animate-page-in">
          {/* Stacked area daily volume chart (30d) - full width */}
          <div className="cosmic-card relative group/card" id="ecosystem-volume">
            <div className="absolute top-3 right-3 opacity-0 group-hover/card:opacity-100 transition-opacity z-10">
              <CopySectionLink sectionId="ecosystem-volume" tab="feeds" />
            </div>
            <div className="mb-4">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-text-primary tracking-tight">Ecosystem Volume ({periodLabel})</h3>
                <InfoTooltip content="Stacked volume chart showing daily counts of blobs posted per rollup, showing macro trends in throughput." side="right" />
              </div>
              <p className="text-xs text-text-secondary opacity-70">Daily blob volume distribution stacked per rollup over the last {periodDaysText}.</p>
            </div>
            <div className="h-[380px]">
              <RollupVolumeAreaChart data={dailyRollups} />
            </div>
            <ChartCardFooter />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
            {/* Cost Heatmap */}
            {ethUsd != null && (
              <div className="cosmic-card flex flex-col min-h-[380px] relative group/card" id="cost-heatmap">
                <div className="absolute top-3 right-3 opacity-0 group-hover/card:opacity-100 transition-opacity z-10">
                  <CopySectionLink sectionId="cost-heatmap" tab="feeds" />
                </div>
                <div className="flex items-center gap-1.5 mb-4">
                  <h3 className="text-[10px] font-bold uppercase tracking-widest text-text-secondary opacity-60">Cost Heatmap ({heatmapDays}d × 24h)</h3>
                  <InfoTooltip content="Visualizes the average USD fee of posting a blob by hour and day of week. Highlights cheaper times to schedule batch submissions." side="right" />
                </div>
                <div className="flex-grow flex items-center justify-center min-h-[280px]">
                  <CostHeatmap data={market} ethUsd={ethUsd} daysCount={heatmapDays} />
                </div>
                <ChartCardFooter />
              </div>
            )}

            {/* Live block/transaction feeds */}
            <div className="cosmic-card overflow-hidden flex flex-col min-h-[380px] p-0 rounded-sm">
              <Tabs defaultValue="blocks" className="w-full h-full flex flex-col">
                <TabsList className="shrink-0">
                  <TabsTrigger value="blocks" className="flex-1">Recent Blocks</TabsTrigger>
                  <TabsTrigger value="transactions" className="flex-1">Live Transactions</TabsTrigger>
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
      <div className="p-10 border border-primary/20 bg-primary/5 rounded-sm flex flex-col md:flex-row gap-10 items-center">
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
           <div className="px-6 py-4 bg-surface border border-border rounded-sm text-center">
              <p className="text-[10px] font-bold text-text-secondary uppercase mb-1">Status</p>
              <div className="flex items-center gap-2">
                 <span className="h-2 w-2 rounded-full bg-status-healthy animate-pulse" />
                 <span className="text-xs font-bold text-text-primary uppercase tracking-tighter">Indexer Syncing</span>
              </div>
           </div>
           <div className="px-6 py-4 bg-surface border border-border rounded-sm text-center">
              <p className="text-[10px] font-bold text-text-secondary uppercase mb-1">Network</p>
              <span className="text-xs font-bold text-text-primary uppercase tracking-tighter">Ethereum Mainnet</span>
           </div>
        </div>
      </div>
      <DashboardScrollHandler />
    </div>
  );
}
