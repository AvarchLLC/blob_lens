import { Suspense } from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

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
import { PageHeader, PageSection } from "@/components/shared/PageHeader";
import { RegimeAlertPanel } from "@/components/shared/RegimeAlertPanel";
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
    <div className="animate-page-in">
      <PageHeader
        meta="DA Market Intelligence"
        title="Blob Data Availability Insights"
        summary="Per-rollup DA cost-efficiency scoring and live blob fee market health, in one place — packing/timing/composite scores, cost per byte, regime classification, and congestion forecasting."
      >
        <div className="flex flex-col items-end gap-2.5">
          <Suspense fallback={<div className="h-9 w-56 rounded-lg bg-border/30 animate-pulse" />}>
            <TimeRangePicker basePath="/da-insights" current={hours} />
          </Suspense>
          <div className="flex items-center gap-3 text-[11px] text-text-secondary">
            <Link href="/leaderboard" className="hover:text-primary transition-colors inline-flex items-center gap-0.5">
              Full Leaderboard <ArrowUpRight className="w-3 h-3" />
            </Link>
            <span className="opacity-30">·</span>
            <Link href="/market" className="hover:text-primary transition-colors inline-flex items-center gap-0.5">
              Market Overview <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>
        </div>
      </PageHeader>

      {/* ── Orientation strip: where the market stands right now ── */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-5 mb-12">
        <div className="surface-elevated p-5 flex flex-col justify-between">
          <span className="caption text-[11px] uppercase tracking-wider mb-2 block">Current Regime</span>
          <RegimeBadge maxBlobsInBlock={latest?.max_blobs_in_block ?? 0} size="sm" />
          <p className="text-[11px] text-text-secondary mt-3 opacity-70 leading-snug">{REGIME_DESC[regime]}</p>
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

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">

        {/* ═══════════════ Left column — fee market health ═══════════════ */}
        <div className="xl:col-span-8">

          <PageSection
            id="fee-market-health"
            label="Market Health Monitoring"
            title="Blob Fee Market Health"
            description={`Regime classification, fee distribution and slot utilisation over the last ${HOURS_LABEL[hours]}.`}
            interpretation="The percentile band shows how spread out fees were within each hour — a wide band or a P95 that detaches from the median signals bursty, uncoordinated submissions. Use the cost heatmap below to find the cheapest hour-of-day / day-of-week window to post blobs."
          >
            <div className="space-y-10">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                <div className="lg:col-span-2">
                  <h4 className="text-[10px] font-bold uppercase tracking-widest text-text-secondary mb-4 opacity-60">
                    Fee Percentile Bands (P25 / P50 / P75 / P95)
                  </h4>
                  {percentiles.length ? <FeePercentilesChart data={percentiles} /> : <Empty />}
                </div>
                <div className="lg:border-l lg:border-border/50 lg:pl-10">
                  <h4 className="text-[10px] font-bold uppercase tracking-widest text-text-secondary mb-4 opacity-60">
                    4–12 Slot Congestion Forecast
                  </h4>
                  {forecast ? <CongestionForecast data={forecast} /> : <Empty />}
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 pt-10 border-t border-border/50">
                <div>
                  <h4 className="text-[10px] font-bold uppercase tracking-widest text-text-secondary mb-4 opacity-60">
                    Blob Base Fee Trend
                  </h4>
                  {market.length ? <BlobFeeLineChart data={market} ethUsd={ethUsd ?? undefined} /> : <Empty />}
                </div>
                <div className="lg:border-l lg:border-border/50 lg:pl-10">
                  <h4 className="text-[10px] font-bold uppercase tracking-widest text-text-secondary mb-4 opacity-60">
                    Slot Utilisation
                  </h4>
                  {market.length ? <SlotUtilizationChart data={market} /> : <Empty />}
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 pt-10 border-t border-border/50">
                <div className="lg:col-span-2">
                  <h4 className="text-[10px] font-bold uppercase tracking-widest text-text-secondary mb-4 opacity-60">
                    Regime Heatmap
                  </h4>
                  {market.length ? <RegimeHeatmap data={market} /> : <Empty />}
                </div>
                <div className="lg:border-l lg:border-border/50 lg:pl-10">
                  <h4 className="text-[10px] font-bold uppercase tracking-widest text-text-secondary mb-4 opacity-60">
                    Cumulative Blobs
                  </h4>
                  {market.length ? <CumulativeBlobGrowth data={market} /> : <Empty />}
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 pt-10 border-t border-border/50">
                <div>
                  <h4 className="text-[10px] font-bold uppercase tracking-widest text-text-secondary mb-4 opacity-60">
                    Regime Timeline
                  </h4>
                  {market.length ? <MarketRegimeTimeline data={market} /> : <Empty />}
                </div>
                <div className="lg:border-l lg:border-border/50 lg:pl-10">
                  <h4 className="text-[10px] font-bold uppercase tracking-widest text-text-secondary mb-4 opacity-60">
                    Fee vs Blob Volume
                  </h4>
                  {market.length ? <FeeBlobScatter data={market} ethUsd={ethUsd} /> : <Empty />}
                </div>
              </div>

              <div className="pt-10 border-t border-border/50">
                <h4 className="text-[10px] font-bold uppercase tracking-widest text-text-secondary mb-4 opacity-60">
                  Blob Cost Heatmap — Hour of Day × Day
                </h4>
                {market.length && ethUsd
                  ? <CostHeatmap data={market} ethUsd={ethUsd} />
                  : <Empty />
                }
              </div>
            </div>
          </PageSection>
        </div>

        {/* ═══════════════ Right column — supporting context for fee health ═══════════════ */}
        <div className="xl:col-span-4 space-y-12">

          <PageSection
            label="Attribution"
            title="Network Share"
            description={`Blob volume distribution across rollups · ${HOURS_LABEL[hours]}.`}
          >
            <div className="space-y-6">
              {leaderboard.length ? <RollupShareDonut data={leaderboard} /> : <Empty />}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <MiniStat label="Avg Packing" value={avgPacking ? `${avgPacking}` : "—"} sub="blobs/tx vs max 6" />
                <MiniStat label="Avg Timing" value={avgTiming ? `${avgTiming}` : "—"} sub="vs network avg fee" />
              </div>
            </div>
          </PageSection>

          <PageSection
            id="regime-alerts"
            label="Automation"
            title="Regime Threshold Alerts"
            description="Subscribe your rollup ops team to webhook notifications when the blob market shifts regime."
            interpretation="Alerts fire within one epoch of a regime change into 'congested' or 'spike' — early enough to adjust batching strategy before fees peak."
          >
            <RegimeAlertPanel />
          </PageSection>
        </div>
      </div>

      {/* ═══════════════ Full-width sections below — each needs its own breathing room ═══════════════ */}
      <div className="space-y-12 mt-12">

        <PageSection
          id="da-cost-efficiency"
          label="DA Cost-Efficiency Scoring"
          title="Per-Rollup DA Cost Breakdown"
          description="Packing, timing and composite efficiency scores per rollup — the metrics that don't exist anywhere else today."
          interpretation="Packing score rewards rollups that fill blobs close to the 6-blob max per tx (fewer, fuller batches = cheaper DA per byte). Timing score rewards posting when network fees are below average. Efficiency score blends both (70% packing / 30% timing) into one comparable number across rollups."
        >
          <div className="space-y-10">
            <div>
              <h4 className="text-[10px] font-bold uppercase tracking-widest text-text-secondary mb-4 opacity-60">
                Hourly Blob Activity — Top 8 Rollups
              </h4>
              {rollupActivity.length
                ? <RollupActivityLineChart data={rollupActivity} />
                : <Empty />
              }
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 pt-10 border-t border-border/50">
              <div>
                <h4 className="text-[10px] font-bold uppercase tracking-widest text-text-secondary mb-4 opacity-60">
                  Daily Blob Volume by Rollup
                </h4>
                {dailyBreakdown.length ? <RollupVolumeAreaChart data={dailyBreakdown} /> : <Empty />}
              </div>
              <div className="lg:border-l lg:border-border/50 lg:pl-10">
                <h4 className="text-[10px] font-bold uppercase tracking-widest text-text-secondary mb-4 opacity-60">
                  Per-Rollup Fee Trend
                </h4>
                {rollupFee.length
                  ? <RollupMetricLineChart data={rollupFee} mode="fee-wei" ethUsd={ethUsd ?? undefined} />
                  : <Empty />
                }
              </div>
            </div>

            <div className="pt-10 border-t border-border/50">
              <h4 className="text-[10px] font-bold uppercase tracking-widest text-text-secondary mb-4 opacity-60">
                Efficiency Scatter — Packing vs Timing
              </h4>
              {leaderboard.length ? <EfficiencyScatterplot data={leaderboard} /> : <Empty />}
            </div>

            <div className="pt-10 border-t border-border/50">
              <h4 className="text-[10px] font-bold uppercase tracking-widest text-text-secondary mb-4 opacity-60">
                DA Cost per Rollup
              </h4>
              {leaderboard.length ? <DACostCharts leaderboard={leaderboard} ethUsd={ethUsd} /> : <Empty />}
            </div>

            <div className="pt-10 border-t border-border/50">
              <h4 className="text-[10px] font-bold uppercase tracking-widest text-text-secondary mb-4 opacity-60">
                Efficiency Leaderboard
              </h4>
              {leaderboard.length
                ? <EfficiencyComparisonTable leaderboard={leaderboard} networkAvgGwei={networkAvgGwei} />
                : <Empty label="No rollup data for this period" />
              }
            </div>
          </div>
        </PageSection>

        <PageSection
          id="submission-timing"
          label="Coordination"
          title="Rollup Submission Timing"
          description="When does each rollup post blobs relative to UTC hour?"
          interpretation="Darker cells mean more blobs posted in that UTC hour. Rollups clustering in the same hours compete for the same fee window — gaps in the grid are low-competition windows worth targeting for cheaper DA."
        >
          {timing.length ? <SubmissionTimingHeatmap data={timing} /> : <Empty />}
        </PageSection>

        <PageSection
          id="long-term-trends"
          label="History"
          title="Long-Term Network Trends"
          description="All-time daily statistics from the first EIP-4844 blob (Dencun, March 2024) to now."
        >
          <div className="space-y-10">
            <div>
              <h4 className="text-[10px] font-bold uppercase tracking-widest text-text-secondary mb-4 opacity-60">
                Daily Blob Volume
              </h4>
              {historical.length ? <HistoricalBlobVolumeChart data={historical} /> : <Empty />}
            </div>
            <div className="pt-10 border-t border-border/50">
              <h4 className="text-[10px] font-bold uppercase tracking-widest text-text-secondary mb-4 opacity-60">
                Daily Avg Blob Cost
              </h4>
              {historical.length ? <HistoricalBlobCostChart data={historical} /> : <Empty />}
            </div>
          </div>
        </PageSection>
      </div>
    </div>
  );
}

// ── Shared helpers ─────────────────────────────────────────────────────────────

function StatCard({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="surface-elevated p-5 flex flex-col justify-between">
      <span className="caption text-[11px] uppercase tracking-wider mb-2 block">{label}</span>
      <span
        className="font-mono font-bold text-text-primary text-2xl leading-tight truncate"
        title={value}
      >
        {value}
      </span>
      <p className="text-[11px] text-text-secondary mt-3 opacity-70 truncate">{note}</p>
    </div>
  );
}

function MiniStat({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="surface border border-border rounded-md p-3">
      <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-text-secondary opacity-60">{label}</p>
      <p className="text-base font-bold text-text-primary mt-0.5">{value}</p>
      <p className="text-[10px] text-text-secondary opacity-60">{sub}</p>
    </div>
  );
}

function Empty({ label = "No data for this period" }: { label?: string }) {
  return (
    <div className="flex items-center justify-center py-10 text-xs text-text-secondary opacity-50 italic">
      {label}
    </div>
  );
}
