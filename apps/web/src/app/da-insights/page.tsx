import { Suspense } from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import dynamic from "next/dynamic";

const BlobFeeLineChart = dynamic(() => import("@/components/charts/BlobFeeLineChart").then(m => m.BlobFeeLineChart), {
  loading: () => <div className="h-[300px] w-full animate-pulse bg-surface-elevated/30 rounded-none border border-dashed border-border/20" />
});

const CongestionForecast = dynamic(() => import("@/components/charts/CongestionForecast").then(m => m.CongestionForecast), {
  loading: () => <div className="h-[300px] w-full animate-pulse bg-surface-elevated/30 rounded-none border border-dashed border-border/20" />
});

const CostHeatmap = dynamic(() => import("@/components/charts/CostHeatmap").then(m => m.CostHeatmap), {
  loading: () => <div className="h-[350px] w-full animate-pulse bg-surface-elevated/30 rounded-none border border-dashed border-border/20" />
});

const CumulativeBlobGrowth = dynamic(() => import("@/components/charts/CumulativeBlobGrowth").then(m => m.CumulativeBlobGrowth), {
  loading: () => <div className="h-[300px] w-full animate-pulse bg-surface-elevated/30 rounded-none border border-dashed border-border/20" />
});

const DACostCharts = dynamic(() => import("@/components/charts/DACostCharts").then(m => m.DACostCharts), {
  loading: () => <div className="h-[300px] w-full animate-pulse bg-surface-elevated/30 rounded-none border border-dashed border-border/20" />
});

const EfficiencyScatterplot = dynamic(() => import("@/components/charts/EfficiencyScatterplot").then(m => m.EfficiencyScatterplot), {
  loading: () => <div className="h-[350px] w-full animate-pulse bg-surface-elevated/30 rounded-none border border-dashed border-border/20" />
});

const FeeBlobScatter = dynamic(() => import("@/components/charts/FeeBlobScatter").then(m => m.FeeBlobScatter), {
  loading: () => <div className="h-[300px] w-full animate-pulse bg-surface-elevated/30 rounded-none border border-dashed border-border/20" />
});

const FeePercentilesChart = dynamic(() => import("@/components/charts/FeePercentilesChart").then(m => m.FeePercentilesChart), {
  loading: () => <div className="h-[300px] w-full animate-pulse bg-surface-elevated/30 rounded-none border border-dashed border-border/20" />
});

const HistoricalBlobCostChart = dynamic(() => import("@/components/charts/HistoricalBlobCostChart").then(m => m.HistoricalBlobCostChart), {
  loading: () => <div className="h-[350px] w-full animate-pulse bg-surface-elevated/30 rounded-none border border-dashed border-border/20" />
});

const HistoricalBlobVolumeChart = dynamic(() => import("@/components/charts/HistoricalBlobVolumeChart").then(m => m.HistoricalBlobVolumeChart), {
  loading: () => <div className="h-[350px] w-full animate-pulse bg-surface-elevated/30 rounded-none border border-dashed border-border/20" />
});

const MarketRegimeTimeline = dynamic(() => import("@/components/charts/MarketRegimeTimeline").then(m => m.MarketRegimeTimeline), {
  loading: () => <div className="h-[300px] w-full animate-pulse bg-surface-elevated/30 rounded-none border border-dashed border-border/20" />
});

const RegimeHeatmap = dynamic(() => import("@/components/charts/RegimeHeatmap").then(m => m.RegimeHeatmap), {
  loading: () => <div className="h-[350px] w-full animate-pulse bg-surface-elevated/30 rounded-none border border-dashed border-border/20" />
});

const RollupActivityLineChart = dynamic(() => import("@/components/charts/RollupActivityLineChart").then(m => m.RollupActivityLineChart), {
  loading: () => <div className="h-[300px] w-full animate-pulse bg-surface-elevated/30 rounded-none border border-dashed border-border/20" />
});

const RollupMetricLineChart = dynamic(() => import("@/components/charts/RollupMetricLineChart").then(m => m.RollupMetricLineChart), {
  loading: () => <div className="h-[300px] w-full animate-pulse bg-surface-elevated/30 rounded-none border border-dashed border-border/20" />
});

const RollupShareDonut = dynamic(() => import("@/components/charts/RollupShareDonut").then(m => m.RollupShareDonut), {
  loading: () => <div className="h-[350px] w-full animate-pulse bg-surface-elevated/30 rounded-none border border-dashed border-border/20" />
});

const RollupVolumeAreaChart = dynamic(() => import("@/components/charts/RollupVolumeAreaChart").then(m => m.RollupVolumeAreaChart), {
  loading: () => <div className="h-[300px] w-full animate-pulse bg-surface-elevated/30 rounded-none border border-dashed border-border/20" />
});

const SlotUtilizationChart = dynamic(() => import("@/components/charts/SlotUtilizationChart").then(m => m.SlotUtilizationChart), {
  loading: () => <div className="h-[300px] w-full animate-pulse bg-surface-elevated/30 rounded-none border border-dashed border-border/20" />
});

const SubmissionTimingHeatmap = dynamic(() => import("@/components/charts/SubmissionTimingHeatmap").then(m => m.SubmissionTimingHeatmap), {
  loading: () => <div className="h-[350px] w-full animate-pulse bg-surface-elevated/30 rounded-none border border-dashed border-border/20" />
});

import { EfficiencyComparisonTable } from "@/components/charts/EfficiencyComparisonTable";
import { PageHeader, PageSection } from "@/components/shared/PageHeader";
import { RegimeBadge } from "@/components/shared/RegimeBadge";
import { TimeRangePicker } from "@/components/shared/TimeRangePicker";
import { getEthPrice } from "@/lib/ethPrice";
import {
  getDaDailyBreakdown,
  getDaFeePercentiles,
  getDaLeaderboard,
  getDaMarketActivity,
  getDaRollupActivity,
  getDaRollupFee,
  getDaSubmissionTiming,
  getForecastData,
  getHistoricalDailyStats,
} from "@/lib/queries";
import { classifyRegime, formatNumber } from "@/lib/utils";

export const revalidate = 30;

const HOURS_LABEL: Record<number, string> = {
  24:   "24 hours",
  168:  "7 days",
  720:  "30 days",
  2160: "90 days",
};

const REGIME_DESC: Record<string, string> = {
  undersaturated: "Blob demand is low. Rollups can submit with minimal fee pressure.",
  healthy:        "Blob market is balanced. Target utilisation is being met efficiently.",
  congested:      "Demand exceeds target. Fee pressure building — monitor submission timing.",
  spike:          "Blob demand is at maximum capacity. Fees are elevated; expect competition.",
};

export default async function DaInsightsPage({
  searchParams,
}: {
  searchParams: Promise<{ hours?: string }>;
}) {
  const { hours: hoursParam } = await searchParams;
  const hours = [24, 168, 720, 2160].includes(Number(hoursParam)) ? Number(hoursParam) : 24;
  const days = Math.ceil(hours / 24);

  const [
    market, leaderboard, forecast, ethUsd,
    percentiles, rollupActivity, rollupFee,
    dailyBreakdown, timing, historical,
  ] = await Promise.all([
    getDaMarketActivity(hours).catch(() => []),
    getDaLeaderboard(hours).catch(() => []),
    getForecastData().catch(() => null),
    getEthPrice(),
    getDaFeePercentiles(hours).catch(() => []),
    getDaRollupActivity(hours, 8).catch(() => []),
    getDaRollupFee(hours, 8).catch(() => []),
    getDaDailyBreakdown(days, 8).catch(() => []),
    getDaSubmissionTiming(Math.min(hours, 720), 8).catch(() => []),
    getHistoricalDailyStats().catch(() => []),
  ]);

  const latest      = market[market.length - 1];
  const regime       = latest ? classifyRegime(latest.max_blobs_in_block) : "healthy";
  const totalBlobs   = leaderboard.reduce((s, r) => s + Number(r.total_blobs), 0);
  const networkAvgGwei = leaderboard.length
    ? leaderboard.reduce((s, r) => s + Number(r.cost_per_blob_gwei), 0) / leaderboard.length
    : 0;
  const topEfficient = [...leaderboard].sort(
    (a, b) => Number(b.efficiency_score) - Number(a.efficiency_score)
  )[0];
  const avgPacking = leaderboard.length
    ? Math.round(leaderboard.reduce((s, r) => s + Number(r.packing_score), 0) / leaderboard.length)
    : 0;
  const avgTiming = leaderboard.length
    ? Math.round(leaderboard.reduce((s, r) => s + Number(r.timing_score), 0) / leaderboard.length)
    : 0;

  return (
    <div className="animate-page-in space-y-8">
      <PageHeader
        meta="DA Market Intelligence"
        title="Blob Data Availability Insights"
        summary="Per-rollup DA cost-efficiency scoring and live blob fee market health, in one place — packing/timing/composite scores, cost per byte, regime classification, and congestion forecasting."
      >
        <div className="flex flex-col items-start md:items-end gap-2.5">
          <Suspense fallback={<div className="h-9 w-56 rounded-none bg-border/30 animate-pulse" />}>
            <TimeRangePicker basePath="/da-insights" current={hours} />
          </Suspense>
          <div className="flex items-center gap-3 text-[11px] text-text-secondary font-mono">
            <Link href="/leaderboard" className="hover:text-primary transition-colors inline-flex items-center gap-0.5 font-bold">
              Full Leaderboard <ArrowUpRight className="w-3 h-3" />
            </Link>
            <span className="opacity-30">·</span>
            <Link href="/market" className="hover:text-primary transition-colors inline-flex items-center gap-0.5 font-bold">
              Market Overview <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>
        </div>
      </PageHeader>

      {/* ── Orientation strip: where the market stands right now ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        <div className="surface-elevated p-5 flex flex-col justify-between rounded-none border border-dashed border-border bg-surface/30">
          <span className="caption text-[11px] uppercase tracking-wider mb-2 block font-mono">Current Regime</span>
          <RegimeBadge maxBlobsInBlock={latest?.max_blobs_in_block ?? 0} size="sm" />
          <p className="text-[11px] text-text-secondary mt-3 opacity-70 leading-snug font-mono">{REGIME_DESC[regime]}</p>
        </div>
        <StatCard
          label="Avg Utilisation"
          value={latest ? `${Math.round(Number(latest.avg_utilization))}%` : "—"}
          note={`Hourly avg · ${HOURS_LABEL[hours]}`}
        />
        <StatCard
          label="Total Blobs"
          value={totalBlobs ? formatNumber(totalBlobs) : "—"}
          note={`Canonical txs · ${HOURS_LABEL[hours]}`}
        />
        <StatCard
          label="Network Avg Fee"
          value={networkAvgGwei ? `${networkAvgGwei.toFixed(2)} Gwei` : "—"}
          note="Per blob, all rollups"
        />
        <StatCard
          label="Top Efficiency"
          value={topEfficient?.rollup ?? "—"}
          note={topEfficient ? `Score ${Math.round(Number(topEfficient.efficiency_score))} / 100 · ${leaderboard.length} active` : "No data"}
        />
      </div>

      {/* ─── Strategic Network Share & Efficiency Overview ─── */}
      <PageSection
        id="network-share-efficiency"
        label="Attribution"
        title="Network Share & Efficiency Overview"
        description={`Blob volume distribution across active rollups and overall network efficiency metrics over the last ${HOURS_LABEL[hours]}.`}
        interpretation="The donut chart displays the share of total blobs submitted by each rollup network sequencer. The average packing and timing scores reflect the overall network efficiency in bundling data and timing submissions to avoid peak fees."
      >
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-6 flex justify-center py-4">
            {leaderboard.length ? <RollupShareDonut data={leaderboard} /> : <Empty />}
          </div>
          <div className="lg:col-span-6 grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="surface border border-dashed border-border rounded-none p-5 bg-surface/20 flex flex-col justify-between min-h-[180px]">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-primary opacity-80 font-mono mb-1">Avg Packing Score</p>
                <p className="text-3xl font-bold text-text-primary font-mono">{avgPacking ? `${avgPacking}` : "—"}</p>
              </div>
              <p className="text-[11px] text-text-secondary opacity-70 font-mono leading-relaxed mt-2">
                Blobs per transaction compared to the theoretical maximum of 6. Higher scores reward rollups that maximize data bundling to save transaction overhead.
              </p>
            </div>
            <div className="surface border border-dashed border-border rounded-none p-5 bg-surface/20 flex flex-col justify-between min-h-[180px]">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-primary opacity-80 font-mono mb-1">Avg Timing Score</p>
                <p className="text-3xl font-bold text-text-primary font-mono">{avgTiming ? `${avgTiming}` : "—"}</p>
              </div>
              <p className="text-[11px] text-text-secondary opacity-70 font-mono leading-relaxed mt-2">
                Posting performance during low-fee windows compared to the network average. Higher scores indicate successful cost avoidance strategies.
              </p>
            </div>
          </div>
        </div>
      </PageSection>

      {/* ─── Full-width Market Dynamics ─── */}
      <PageSection
        id="fee-dynamics"
        label="Market Dynamics"
        title="Blob Fee & Base Rate Trends"
        description={`Statistical distribution of blob base fees over the last ${HOURS_LABEL[hours]}.`}
        interpretation="The percentile band shows how spread out fees were within each hour — a wide band or a P95 that detaches from the median signals bursty, uncoordinated submissions. The line chart shows the hourly base fee rate in both Gwei and USD."
      >
        <div className="space-y-8">
          <div>
            <h4 className="text-[10px] font-bold uppercase tracking-widest text-text-secondary mb-4 opacity-60 font-mono">Fee Percentile Bands (P25 / P50 / P75 / P95)</h4>
            {percentiles.length ? <FeePercentilesChart data={percentiles} /> : <Empty />}
          </div>
          <div className="border-t border-dashed border-border/20 pt-8">
            <h4 className="text-[10px] font-bold uppercase tracking-widest text-text-secondary mb-4 opacity-60 font-mono">Blob Base Fee Trend</h4>
            {market.length ? <BlobFeeLineChart data={market} ethUsd={ethUsd ?? undefined} /> : <Empty />}
          </div>
        </div>
      </PageSection>

      {/* ─── Full-width Capacity Observability ─── */}
      <PageSection
        id="congestion-capacity"
        label="Capacity Observability"
        title="Market Congestion & Slot Utilisation"
        description={`Predictive modeling of blob base fees and block space utilization.`}
        interpretation="The slot utilisation tracks the percentage of block space filled by blobs. The congestion forecast projects the base fee over the next 50 blocks using the EIP-4844 exponential formula."
      >
        <div className="space-y-8">
          <div>
            <h4 className="text-[10px] font-bold uppercase tracking-widest text-text-secondary mb-4 opacity-60 font-mono">Slot Utilisation Trend</h4>
            {market.length ? <SlotUtilizationChart data={market} /> : <Empty />}
          </div>
          <div className="border-t border-dashed border-border/20 pt-8">
            <h4 className="text-[10px] font-bold uppercase tracking-widest text-text-secondary mb-4 opacity-60 font-mono">4–12 Slot Congestion Forecast</h4>
            {forecast ? <CongestionForecast data={forecast} /> : <Empty />}
          </div>
        </div>
      </PageSection>

      {/* ─── Full-width Regime Classification ─── */}
      <PageSection
        id="regime-analysis"
        label="Regime Classification"
        title="Market Fee Regimes & Timeline"
        description={`Hourly distribution of fee regimes and chronological regime transitions.`}
        interpretation="Fee regimes categorize market conditions into Quiet, Healthy, Congested, or Spike. The heatmap visualizes the hourly distribution of these regimes, and the timeline shows how they changed chronologically."
      >
        <div className="space-y-8">
          <div>
            <h4 className="text-[10px] font-bold uppercase tracking-widest text-text-secondary mb-4 opacity-60 font-mono">Regime Heatmap (24h × {Math.min(days, 7)}d)</h4>
            {market.length ? <RegimeHeatmap data={market} daysCount={Math.min(days, 7)} /> : <Empty />}
          </div>
          <div className="border-t border-dashed border-border/20 pt-8">
            <h4 className="text-[10px] font-bold uppercase tracking-widest text-text-secondary mb-4 opacity-60 font-mono">Regime Timeline</h4>
            {market.length ? <MarketRegimeTimeline data={market} /> : <Empty />}
          </div>
        </div>
      </PageSection>

      {/* ─── Full-width Growth & Demand ─── */}
      <PageSection
        id="demand-dynamics"
        label="Growth & Demand"
        title="Cumulative Growth & Fee-Volume Correlation"
        description={`Cumulative data growth and scatter correlation between fees and blob volume.`}
        interpretation="Cumulative blobs track total data posted over the period. The fee-volume scatter plot maps transaction fee levels against the number of blobs in each block, showing the elasticity of demand."
      >
        <div className="space-y-8">
          <div>
            <h4 className="text-[10px] font-bold uppercase tracking-widest text-text-secondary mb-4 opacity-60 font-mono">Cumulative Blobs</h4>
            {market.length ? <CumulativeBlobGrowth data={market} /> : <Empty />}
          </div>
          <div className="border-t border-dashed border-border/20 pt-8">
            <h4 className="text-[10px] font-bold uppercase tracking-widest text-text-secondary mb-4 opacity-60 font-mono">Fee vs Blob Volume</h4>
            {market.length ? <FeeBlobScatter data={market} ethUsd={ethUsd} /> : <Empty />}
          </div>
        </div>
      </PageSection>

      {/* ─── Full-width Cost Heatmap ─── */}
      <PageSection
        id="cost-scheduling"
        label="Cost Optimization"
        title="Blob Cost Heatmap — Hour of Day × Day"
        description="Average blob cost by hour of day and day of week (UTC)."
        interpretation="Darker cells indicate more expensive times. Use this heatmap to schedule batch postings during low-activity windows to minimize data availability costs."
      >
        {market.length && ethUsd ? <CostHeatmap data={market} ethUsd={ethUsd} /> : <Empty />}
      </PageSection>

      {/* ─── Rollup DA Cost & Activity (Full-width sections) ─── */}
      <PageSection
        id="rollup-activity"
        label="Rollup Telemetry"
        title="Hourly Blob Activity — Top 8 Rollups"
        description={`Hourly count of blobs submitted per rollup over the last ${HOURS_LABEL[hours]}.`}
        interpretation="Tracks the hourly intensity of blob postings per rollup. Multiple spikes across different rollups in the same hour indicate network congestion."
      >
        {rollupActivity.length ? <RollupActivityLineChart data={rollupActivity} /> : <Empty />}
      </PageSection>

      <PageSection
        id="rollup-volume"
        label="Data Growth"
        title="Daily Blob Volume by Rollup"
        description="Cumulative daily blob volume breakdown by network sequencer."
        interpretation="Shows the distribution of daily blob volumes per rollup. Large area blocks indicate high-throughput sequencers driving the bulk of the DA demand."
      >
        {dailyBreakdown.length ? <RollupVolumeAreaChart data={dailyBreakdown} /> : <Empty />}
      </PageSection>

      {/* ─── Rollup DA Cost & Fee Trends (Full-width sections) ─── */}
      <PageSection
        id="rollup-da-costs"
        label="DA Economics"
        title="DA Cost per Rollup"
        description="Total gas fees paid for blob submissions in both ETH and USD."
        interpretation="Total aggregate fees paid to Ethereum L1 for data availability. Helps compare the economic footprints of different rollup networks."
      >
        {leaderboard.length ? <DACostCharts leaderboard={leaderboard} ethUsd={ethUsd} /> : <Empty />}
      </PageSection>

      <PageSection
        id="rollup-fee-trends"
        label="Fee Observability"
        title="Per-Rollup Fee Trend"
        description="Average transaction fee paid per blob by individual rollups."
        interpretation="Shows the average fee paid per blob over time. Spikes indicate times when specific rollups were overpaying or competing aggressively in the fee market."
      >
        {rollupFee.length ? <RollupMetricLineChart data={rollupFee} mode="fee-wei" ethUsd={ethUsd ?? undefined} /> : <Empty />}
      </PageSection>

      {/* ─── Efficiency Scatterplot (Full-width) ─── */}
      <PageSection
        id="efficiency-scatter"
        label="Efficiency Analysis"
        title="Efficiency Scatter — Packing vs Timing"
        description="Scattering rollups based on their transaction packing efficiency (x-axis) vs fee timing efficiency (y-axis)."
        interpretation="Packing score rewards rollups that fill blobs close to the 6-blob max per tx. Timing score rewards posting when network fees are below average. The top-right quadrant represents optimal DA strategy."
      >
        {leaderboard.length ? <EfficiencyScatterplot data={leaderboard} /> : <Empty />}
      </PageSection>

      {/* ─── Efficiency Comparison Leaderboard (Full-width) ─── */}
      <PageSection
        id="da-cost-efficiency"
        label="DA Cost-Efficiency Scoring"
        title="Rollup Cost-Efficiency Leaderboard"
        description="Packing, timing, and composite efficiency scores per rollup compared to the network averages."
      >
        {leaderboard.length ? (
          <EfficiencyComparisonTable leaderboard={leaderboard} networkAvgGwei={networkAvgGwei} ethUsd={ethUsd ?? undefined} />
        ) : (
          <Empty label="No rollup data for this period" />
        )}
      </PageSection>

      {/* ─── Rollup Submission Timing (Full-width) ─── */}
      <PageSection
        id="submission-timing"
        label="Coordination"
        title="Rollup Submission Timing Heatmap"
        description="Distribution of blob submissions relative to the UTC hour."
        interpretation="Darker cells mean more blobs posted in that UTC hour. Rollups clustering in the same hours compete for the same fee window — gaps in the grid are low-competition windows worth targeting for cheaper DA."
      >
        {timing.length ? <SubmissionTimingHeatmap data={timing} /> : <Empty />}
      </PageSection>

      {/* ─── Long-Term Network History (Full-width sections) ─── */}
      <PageSection
        id="long-term-volume"
        label="History"
        title="Long-Term Network Trends — Daily Blob Volume"
        description="All-time daily blob volume from the first EIP-4844 blob (Dencun, March 2024) to now."
        interpretation="Historical daily count of blobs posted to Ethereum. Shows the long-term growth and adoption of blob space across all rollups."
      >
        {historical.length ? <HistoricalBlobVolumeChart data={historical} /> : <Empty />}
      </PageSection>

      <PageSection
        id="long-term-cost"
        label="History"
        title="Long-Term Network Trends — Daily Avg Blob Cost"
        description="All-time daily average blob cost (Gwei) from the Dencun upgrade to now."
        interpretation="Historical daily average fee per blob. Visualizes fee regimes and how hard forks (like Pectra or Fusaka) or demand spikes impacted overall DA costs."
      >
        {historical.length ? <HistoricalBlobCostChart data={historical} /> : <Empty />}
      </PageSection>
    </div>
  );
}

// ── Shared helpers ─────────────────────────────────────────────────────────────

function StatCard({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="surface-elevated p-5 flex flex-col justify-between rounded-none border border-dashed border-border bg-surface/30">
      <span className="caption text-[11px] uppercase tracking-wider mb-2 block font-mono">{label}</span>
      <span
        className="font-mono font-bold text-text-primary text-2xl leading-tight truncate"
        title={value}
      >
        {value}
      </span>
      <p className="text-[11px] text-text-secondary mt-3 opacity-70 truncate font-mono">{note}</p>
    </div>
  );
}

function MiniStat({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="surface border border-dashed border-border rounded-none p-3 bg-surface/20">
      <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-text-secondary opacity-60 font-mono">{label}</p>
      <p className="text-base font-bold text-text-primary mt-0.5 font-mono">{value}</p>
      <p className="text-[10px] text-text-secondary opacity-60 font-mono">{sub}</p>
    </div>
  );
}

function Empty({ label = "No data for this period" }: { label?: string }) {
  return (
    <div className="flex items-center justify-center py-10 text-xs text-text-secondary opacity-50 italic font-mono">
      {label}
    </div>
  );
}


