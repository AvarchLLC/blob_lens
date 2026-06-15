import { Suspense } from "react";
import Link from "next/link";
import { Activity, BarChart3, Bell, Clock, TrendingUp, Zap } from "lucide-react";

import { BlobFeeLineChart } from "@/components/charts/BlobFeeLineChart";
import { CongestionForecast } from "@/components/charts/CongestionForecast";
import { CostHeatmap } from "@/components/charts/CostHeatmap";
import { CumulativeBlobGrowth } from "@/components/charts/CumulativeBlobGrowth";
import { DACostCharts } from "@/components/charts/DACostCharts";
import { EfficiencyComparisonTable } from "@/components/charts/EfficiencyComparisonTable";
import { EfficiencyScatterplot } from "@/components/charts/EfficiencyScatterplot";
import { FeeBlobScatter } from "@/components/charts/FeeBlobScatter";
import { FeePercentilesChart } from "@/components/charts/FeePercentilesChart";
import { HistoricalBlobCostChart } from "@/components/charts/HistoricalBlobCostChart";
import { HistoricalBlobVolumeChart } from "@/components/charts/HistoricalBlobVolumeChart";
import { MarketRegimeTimeline } from "@/components/charts/MarketRegimeTimeline";
import { RegimeHeatmap } from "@/components/charts/RegimeHeatmap";
import { RollupActivityLineChart } from "@/components/charts/RollupActivityLineChart";
import { RollupMetricLineChart } from "@/components/charts/RollupMetricLineChart";
import { RollupShareDonut } from "@/components/charts/RollupShareDonut";
import { RollupVolumeAreaChart } from "@/components/charts/RollupVolumeAreaChart";
import { SlotUtilizationChart } from "@/components/charts/SlotUtilizationChart";
import { SubmissionTimingHeatmap } from "@/components/charts/SubmissionTimingHeatmap";
import { RegimeAlertPanel } from "@/components/shared/RegimeAlertPanel";
import { RegimeBadge } from "@/components/shared/RegimeBadge";
import { TimeRangePicker } from "@/components/shared/TimeRangePicker";
import { PageHeader } from "@/components/shared/PageHeader";
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
import { classifyRegime } from "@/lib/utils";

export const revalidate = 30;

const HOURS_LABEL: Record<number, string> = {
  24:   "last 24 hours",
  168:  "last 7 days",
  720:  "last 30 days",
  2160: "last 90 days",
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

  const latest    = market[market.length - 1];
  const regime    = latest ? classifyRegime(latest.max_blobs_in_block) : "healthy";
  const totalBlobs = leaderboard.reduce((s, r) => s + Number(r.total_blobs), 0);
  const networkAvgGwei = leaderboard.length
    ? leaderboard.reduce((s, r) => s + Number(r.cost_per_blob_gwei), 0) / leaderboard.length
    : 0;
  const topEfficient = [...leaderboard].sort(
    (a, b) => Number(b.efficiency_score) - Number(a.efficiency_score)
  )[0];
  const avgPacking = leaderboard.length
    ? Math.round(leaderboard.reduce((s, r) => s + Number(r.packing_score), 0) / leaderboard.length)
    : 0;

  return (
    <main className="max-w-6xl mx-auto px-4 py-10 space-y-14">
      <PageHeader
        title="DA Market Intelligence"
        meta="Blob fee market health · per-rollup cost efficiency · submission timing analysis"
      />

      {/* Time range + links */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <Suspense fallback={<div className="h-9 w-56 rounded-lg bg-border/30 animate-pulse" />}>
          <TimeRangePicker basePath="/da-insights" current={hours} />
        </Suspense>
        <div className="flex items-center gap-3 text-xs text-text-secondary">
          <Link href="/leaderboard" className="hover:text-primary transition-colors">Full Leaderboard →</Link>
          <span>·</span>
          <Link href="/market" className="hover:text-primary transition-colors">Market Overview →</Link>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════
          SECTION 1 · FEE MARKET HEALTH
      ═══════════════════════════════════════════════════════════ */}
      <section className="space-y-5">
        <SectionLabel icon={<Activity className="w-4 h-4" />} title="Blob Fee Market Health" />

        {/* Regime + Forecast */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="surface-elevated border border-border rounded-xl p-5 space-y-4">
            <Label>Current Regime</Label>
            <div className="flex items-start gap-4">
              {latest && <RegimeBadge maxBlobsInBlock={latest.max_blobs_in_block} size="lg" />}
              <p className="text-sm text-text-secondary leading-relaxed">{REGIME_DESC[regime]}</p>
            </div>
            <div className="grid grid-cols-3 gap-3 pt-3 border-t border-border">
              <MiniStat label="Avg Util" value={latest ? `${Math.round(Number(latest.avg_utilization))}%` : "—"} />
              <MiniStat label="Blobs/hr" value={latest ? latest.blob_count.toLocaleString() : "—"} />
              <MiniStat label="Txs/hr"   value={latest ? latest.tx_count.toLocaleString() : "—"} />
            </div>
          </div>

          <div className="surface-elevated border border-border rounded-xl p-5">
            <Label>4–12 Slot Congestion Forecast</Label>
            <div className="mt-4">
              {forecast
                ? <CongestionForecast data={forecast} />
                : <Empty />
              }
            </div>
          </div>
        </div>

        {/* Fee percentile band — full width */}
        <div className="surface-elevated border border-border rounded-xl p-5">
          <ChartHeader
            title="Fee Percentile Bands"
            sub={`P25 / P50 (median) / P75 / P95 · ${HOURS_LABEL[hours]}`}
            note="Shaded band = interquartile range. Dashed = 95th percentile spike."
          />
          {percentiles.length
            ? <FeePercentilesChart data={percentiles} />
            : <Empty />
          }
        </div>

        {/* Fee trend + Slot util */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="surface-elevated border border-border rounded-xl p-5">
            <ChartHeader title="Blob Base Fee Trend" sub={`Hourly avg · ${HOURS_LABEL[hours]}`} />
            {market.length ? <BlobFeeLineChart data={market} ethUsd={ethUsd ?? undefined} /> : <Empty />}
          </div>
          <div className="surface-elevated border border-border rounded-xl p-5">
            <ChartHeader title="Slot Utilisation" sub={`Hourly avg % of max blob capacity · ${HOURS_LABEL[hours]}`} />
            {market.length ? <SlotUtilizationChart data={market} /> : <Empty />}
          </div>
        </div>

        {/* Regime heatmap + Regime timeline + Cumulative growth */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 surface-elevated border border-border rounded-xl p-5">
            <ChartHeader title="Regime Heatmap" sub={`Hour-by-hour market state · ${HOURS_LABEL[hours]}`} />
            {market.length ? <RegimeHeatmap data={market} /> : <Empty />}
          </div>
          <div className="surface-elevated border border-border rounded-xl p-5">
            <ChartHeader title="Cumulative Blobs" sub="Running blob count (same window)" />
            {market.length ? <CumulativeBlobGrowth data={market} /> : <Empty />}
          </div>
        </div>

        {/* Regime bar + Fee-blob scatter */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="surface-elevated border border-border rounded-xl p-5">
            <ChartHeader title="Regime Timeline" sub="Compact block-by-block view" />
            {market.length ? <MarketRegimeTimeline data={market} /> : <Empty />}
          </div>
          <div className="surface-elevated border border-border rounded-xl p-5">
            <ChartHeader title="Fee vs Blob Volume Scatter" sub="Each point = 1 hour bucket" />
            {market.length ? <FeeBlobScatter data={market} ethUsd={ethUsd} /> : <Empty />}
          </div>
        </div>

        {/* Cost heatmap — hour of day × day */}
        <div className="surface-elevated border border-border rounded-xl p-5">
          <ChartHeader
            title="Blob Cost Heatmap"
            sub="Hour-of-day × day — find the cheapest submission windows"
            note="Darker = higher fee. Use this to optimise when your rollup submits blobs."
          />
          {market.length && ethUsd
            ? <CostHeatmap data={market} ethUsd={ethUsd} />
            : <Empty />
          }
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
          SECTION 2 · PER-ROLLUP DA BREAKDOWN
      ═══════════════════════════════════════════════════════════ */}
      <section className="space-y-5">
        <SectionLabel icon={<BarChart3 className="w-4 h-4" />} title="Per-Rollup DA Cost Breakdown" />

        {/* Summary cards + Donut */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="surface-elevated border border-border rounded-xl p-5">
            <Label>Network Share</Label>
            <div className="mt-3">
              {leaderboard.length ? <RollupShareDonut data={leaderboard} /> : <Empty />}
            </div>
          </div>
          <div className="lg:col-span-2 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4 gap-3 content-start">
            <SummaryCard
              label="Top Efficiency" accent="text-primary"
              value={topEfficient?.rollup ?? "—"}
              sub={topEfficient ? `Score ${Math.round(Number(topEfficient.efficiency_score))}` : ""}
            />
            <SummaryCard
              label="Avg Packing" accent="text-blue-400"
              value={avgPacking ? `${avgPacking}` : "—"}
              sub="blobs per tx vs max-6"
            />
            <SummaryCard
              label="Network Avg Fee" accent="text-orange-400"
              value={networkAvgGwei ? `${networkAvgGwei.toFixed(3)} Gwei` : "—"}
              sub="avg cost per blob"
            />
            <SummaryCard
              label="Active Rollups" accent="text-green-400"
              value={leaderboard.length.toString()}
              sub={HOURS_LABEL[hours]}
            />
            <SummaryCard
              label="Total Blobs" accent="text-purple-400"
              value={totalBlobs ? totalBlobs.toLocaleString() : "—"}
              sub="canonical blob txs"
            />
            <SummaryCard
              label="Avg Timing Score" accent="text-teal-400"
              value={leaderboard.length
                ? `${Math.round(leaderboard.reduce((s, r) => s + Number(r.timing_score), 0) / leaderboard.length)}`
                : "—"}
              sub="cost vs network avg"
            />
          </div>
        </div>

        {/* Hourly rollup activity stacked area */}
        <div className="surface-elevated border border-border rounded-xl p-5">
          <ChartHeader
            title="Hourly Blob Activity by Rollup"
            sub={`Top-8 rollups · ${HOURS_LABEL[hours]}`}
            note="Each line = blobs per hour. Identify traffic spikes and quiet windows per rollup."
          />
          {rollupActivity.length
            ? <RollupActivityLineChart data={rollupActivity} />
            : <Empty />
          }
        </div>

        {/* Daily stacked area + Per-rollup fee trend */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="surface-elevated border border-border rounded-xl p-5">
            <ChartHeader title="Daily Blob Volume by Rollup" sub={`Stacked area · ${days}d`} />
            {dailyBreakdown.length ? <RollupVolumeAreaChart data={dailyBreakdown} /> : <Empty />}
          </div>
          <div className="surface-elevated border border-border rounded-xl p-5">
            <ChartHeader title="Per-Rollup Blob Fee Trend" sub={`Hourly avg fee per rollup · ${HOURS_LABEL[hours]}`} />
            {rollupFee.length
              ? <RollupMetricLineChart data={rollupFee} mode="fee-wei" ethUsd={ethUsd ?? undefined} />
              : <Empty />
            }
          </div>
        </div>

        {/* Efficiency scatter + DA cost bar */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="surface-elevated border border-border rounded-xl p-5">
            <ChartHeader
              title="Efficiency Scatter"
              sub="Packing score vs timing score per rollup"
              note="Top-right = most efficient. Bubble size = total blobs."
            />
            {leaderboard.length ? <EfficiencyScatterplot data={leaderboard} /> : <Empty />}
          </div>
          <div className="surface-elevated border border-border rounded-xl p-5">
            <ChartHeader
              title="DA Cost per Rollup"
              sub="Total ETH spent on blob DA · cost per megabyte"
            />
            {leaderboard.length ? <DACostCharts leaderboard={leaderboard} ethUsd={ethUsd} /> : <Empty />}
          </div>
        </div>

        {/* Full efficiency table */}
        <div className="surface-elevated border border-border rounded-xl p-5">
          <ChartHeader
            title="Efficiency Leaderboard"
            sub={`Packing · timing · composite efficiency score · ${HOURS_LABEL[hours]}`}
          />
          {leaderboard.length
            ? <EfficiencyComparisonTable leaderboard={leaderboard} networkAvgGwei={networkAvgGwei} />
            : <Empty label="No rollup data for this period" />
          }
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
          SECTION 3 · SUBMISSION TIMING
      ═══════════════════════════════════════════════════════════ */}
      <section className="space-y-5">
        <SectionLabel icon={<Clock className="w-4 h-4" />} title="Rollup Submission Timing" />
        <p className="text-sm text-text-secondary max-w-2xl">
          When does each rollup post blobs relative to UTC hour? Darker cells = more blobs in that hour.
          Use this to identify coordination patterns and find low-competition windows for cheaper DA.
        </p>
        <div className="surface-elevated border border-border rounded-xl p-5">
          <ChartHeader
            title="Blob Submissions by Hour of Day"
            sub={`Top-8 rollups by volume · ${HOURS_LABEL[Math.min(hours, 720)]}`}
            note="X axis = UTC hour. Y axis = rollup. Color intensity = blob count."
          />
          {timing.length ? <SubmissionTimingHeatmap data={timing} /> : <Empty />}
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
          SECTION 4 · LONG-TERM TRENDS
      ═══════════════════════════════════════════════════════════ */}
      <section className="space-y-5">
        <SectionLabel icon={<TrendingUp className="w-4 h-4" />} title="Long-Term Network Trends" />
        <p className="text-sm text-text-secondary max-w-2xl">
          All-time daily statistics from the first EIP-4844 blob (Dencun, March 2024) to now.
        </p>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="surface-elevated border border-border rounded-xl p-5">
            <ChartHeader title="Daily Blob Volume" sub="All-time · blobs per day" />
            {historical.length ? <HistoricalBlobVolumeChart data={historical} /> : <Empty />}
          </div>
          <div className="surface-elevated border border-border rounded-xl p-5">
            <ChartHeader title="Daily Avg Blob Cost" sub="All-time · avg fee in Gwei per blob" />
            {historical.length ? <HistoricalBlobCostChart data={historical} /> : <Empty />}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
          SECTION 5 · ALERTS
      ═══════════════════════════════════════════════════════════ */}
      <section className="space-y-4">
        <SectionLabel icon={<Bell className="w-4 h-4" />} title="Regime Threshold Alerts" />
        <p className="text-sm text-text-secondary max-w-2xl">
          Subscribe your rollup ops team to webhook notifications when the blob market enters a
          congested or spike regime. Alerts fire within one epoch of the regime change.
        </p>
        <RegimeAlertPanel />
      </section>
    </main>
  );
}

// ── Shared helpers ─────────────────────────────────────────────────────────────

function SectionLabel({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-2 border-b border-border pb-3">
      <span className="text-primary">{icon}</span>
      <h2 className="text-sm font-bold uppercase tracking-[0.15em] text-text-primary">{title}</h2>
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-text-secondary">{children}</p>;
}

function ChartHeader({ title, sub, note }: { title: string; sub: string; note?: string }) {
  return (
    <div className="mb-4">
      <p className="text-sm font-semibold text-text-primary">{title}</p>
      <p className="text-xs text-text-secondary">{sub}</p>
      {note && <p className="text-[10px] text-text-secondary/60 mt-0.5 italic">{note}</p>}
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] text-text-secondary uppercase tracking-wide">{label}</p>
      <p className="text-sm font-semibold text-text-primary">{value}</p>
    </div>
  );
}

function SummaryCard({ label, value, sub, accent }: {
  label: string; value: string; sub: string; accent: string;
}) {
  return (
    <div className="surface border border-border rounded-xl p-4">
      <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-text-secondary">{label}</p>
      <p className={`text-base font-bold mt-1 truncate ${accent}`}>{value}</p>
      <p className="text-[10px] text-text-secondary mt-0.5">{sub}</p>
    </div>
  );
}

function Empty({ label = "No data for this period" }: { label?: string }) {
  return (
    <div className="flex items-center justify-center py-10 text-xs text-text-secondary">
      <Zap className="w-4 h-4 mr-2 opacity-40" />
      {label}
    </div>
  );
}
