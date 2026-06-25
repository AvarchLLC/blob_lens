import { Suspense } from "react";
import { BlobFeeLineChart } from "@/components/charts/BlobFeeLineChart";
import { BlobUtilizationChart } from "@/components/charts/BlobUtilizationChart";
import { CongestionForecast } from "@/components/charts/CongestionForecast";
import { L1vsBlobFeeChart } from "@/components/charts/L1vsBlobFeeChart";
import { RegimeHeatmap } from "@/components/charts/RegimeHeatmap";
import { RollupActivityLineChart } from "@/components/charts/RollupActivityLineChart";
import { RollupMetricLineChart } from "@/components/charts/RollupMetricLineChart";
import { RollupNetworkGraphD3 } from "@/components/charts/RollupNetworkGraphD3";
import { RegimeAlertPanel } from "@/components/shared/RegimeAlertPanel";
import { RegimeBadge } from "@/components/shared/RegimeBadge";
import { L1CostComparisonTable } from "@/components/shared/L1CostComparisonTable";
import { PageHeader, PageSection } from "@/components/shared/PageHeader";
import { TimeRangePicker } from "@/components/shared/TimeRangePicker";
import { blobCostUsd, formatUsd, getEthPrice } from "@/lib/ethPrice";
import { getHourlyL1Fee } from "@/lib/l1Fee";
import {
  getForecastData,
  getHourlyRollupActivity,
  getHourlyRollupFee,
  getHourlyRollupUtilization,
  getL1Costs,
  getLeaderboard,
  getMarketActivity,
  getRollupNetworkGraph,
} from "@/lib/queries";
import { classifyRegime, formatNumber } from "@/lib/utils";
import { Activity, ShieldCheck, Zap } from "lucide-react";

export const revalidate = 30;

const HOURS_LABEL: Record<number, string> = {
  24:   "24 hours",
  168:  "7 days",
  720:  "30 days",
  2160: "90 days",
};

export default async function MarketPage({
  searchParams,
}: {
  searchParams: Promise<{ hours?: string }>;
}) {
  const { hours: hoursParam } = await searchParams;
  const hours = [24, 168, 720, 2160].includes(Number(hoursParam)) ? Number(hoursParam) : 24;
  const days = Math.ceil(hours / 24);

  const [
    market, leaderboard, ethUsd, forecast, 
    rollupActivity, rollupFee, rollupUtil, 
    networkGraph, l1FeeData, l1HistoricalCosts
  ] = await Promise.all([
    getMarketActivity(hours).catch(() => []),
    getLeaderboard(1).catch(() => []),
    getEthPrice(),
    getForecastData().catch(() => null),
    getHourlyRollupActivity(hours, 10).catch(() => []),
    getHourlyRollupFee(hours, 10).catch(() => []),
    getHourlyRollupUtilization(hours, 10).catch(() => []),
    getRollupNetworkGraph(hours).catch(() => ({ nodes: [], edges: [] })),
    getHourlyL1Fee(hours).catch(() => []),
    getL1Costs(days).catch(() => []),
  ]);

  const latestL1Cost = l1HistoricalCosts[l1HistoricalCosts.length - 1] || null;
  const latest = market[market.length - 1];
  const topRollup = leaderboard[0]?.rollup ?? "—";
  const totalBlobsPeriod = market.reduce((s, m) => s + Number(m.blob_count), 0);
  const avgUtilization = market.length
    ? (market.reduce((s, m) => s + Number(m.avg_utilization), 0) / market.length).toFixed(1)
    : "—";

  return (
    <div className="animate-page-in space-y-8">
      <PageHeader
        meta="Market Intelligence"
        title="Blob Fee Economics"
        summary="Deep analysis of Ethereum's EIP-4844 blob market. Monitor real-time regimes, historical fee trends, and ecosystem-wide utilization patterns."
      >
        <div className="flex flex-col items-start md:items-end gap-2.5">
          <Suspense fallback={<div className="h-9 w-56 rounded-none bg-border/30 animate-pulse" />}>
            <TimeRangePicker basePath="/market" current={hours} />
          </Suspense>
          <div className="flex items-center gap-2 px-3 py-1 bg-status-healthy/10 border border-dashed border-status-healthy/30 rounded-none">
             <RegimeBadge maxBlobsInBlock={latest?.max_blobs_in_block ?? 0} size="sm" />
             <span className="text-[10px] font-bold uppercase tracking-widest text-text-primary font-mono ml-1">Regime Active</span>
          </div>
        </div>
      </PageHeader>

      {/* ── Orientation strip: metrics ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          label="Cost / Blob (Avg)"
          value={
            latest && Number(latest.avg_fee) > 0
              ? ethUsd != null
                ? formatUsd(blobCostUsd(latest.avg_fee, ethUsd))
                : `${(Number(latest.avg_fee) / 1e9).toFixed(4)} gwei`
              : "1 wei"
          }
          note="Average fee per 128KB blob (last hour)"
        />
        <StatCard
          label={`Total Blobs (${HOURS_LABEL[hours]})`}
          value={formatNumber(totalBlobsPeriod)}
          note="Combined blobs across all indexed blocks"
        />
        <StatCard
          label="Avg Utilization"
          value={avgUtilization === "—" ? "—" : `${avgUtilization}%`}
          note="Network usage relative to target capacity"
        />
        <StatCard
          label="Most Active Rollup"
          value={topRollup}
          note="Entity with highest volume in current window"
        />
      </div>

      {/* ── Section 1: Market State & Alerts side-by-side ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-7 flex flex-col">
          <PageSection
            label="Regime Analysis"
            title="Market State Classification"
            description={`Hour-by-hour market state over the last ${HOURS_LABEL[hours]}.`}
            interpretation="Regime classification is based on block fullness. 'Healthy' regimes indicate optimal fee-burning efficiency without congestion-induced price spikes."
            fullHeight
            className="flex-1"
          >
            <div className="flex-1 w-full min-h-[300px]">
              <RegimeHeatmap data={market} daysCount={Math.min(days, 7)} />
            </div>
          </PageSection>
        </div>

        <div className="lg:col-span-5 flex flex-col">
          <PageSection
            label="Alerts & Status"
            title="Surveillance Panel"
            description="Active congestion warnings and system state parameters."
            interpretation="The surveillance panel monitors real-time fee spikes. During high congestion regimes, rollup operators should adjust batch submission intervals to prevent cost overheads."
            fullHeight
            className="flex-1"
          >
            <div className="space-y-4">
              <RegimeAlertPanel borderless={true} />
            </div>
          </PageSection>
        </div>
      </div>

      {/* ── Section 2: Pricing & Cost Dynamics (Full width stacked charts) ── */}
      <PageSection
        label="Pricing"
        title={`Historical Cost Benchmarking — Last ${HOURS_LABEL[hours]}`}
        description="Comparison of blob base fees, calldata rates, and transaction efficiency."
        interpretation="The comparison charts illustrate the economic divergence between execution-layer calldata and dedicated blob space. Blobs consistently reduce data availability overhead by orders of magnitude."
      >
        <div className="space-y-8">
          <div>
            <h4 className="text-[10px] font-bold uppercase tracking-widest text-text-secondary mb-4 opacity-60 font-mono">
              Blob Base Fee Trend
            </h4>
            <BlobFeeLineChart data={market} ethUsd={ethUsd ?? undefined} />
          </div>

          {ethUsd != null && l1FeeData.length > 0 && (
            <div className="pt-8 border-t border-dashed border-border/20">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                <div className="lg:col-span-7">
                  <h4 className="text-[10px] font-bold uppercase tracking-widest text-text-secondary mb-4 opacity-60 font-mono">
                    DA vs Calldata Cost Comparison (USD)
                  </h4>
                  <L1vsBlobFeeChart blobData={market} l1Data={l1FeeData} ethUsd={ethUsd} />
                </div>
                <div className="lg:col-span-5">
                  <h4 className="text-[10px] font-bold uppercase tracking-widest text-text-secondary mb-4 opacity-60 font-mono">
                    L2 Transaction Efficiency (vs. L1)
                  </h4>
                  <L1CostComparisonTable latestL1={latestL1Cost} avgBlobUsd={latest ? Number(latest.avg_fee) * 131_072 / 1e18 * (ethUsd || 0) : null} />
                </div>
              </div>
            </div>
          )}
        </div>
      </PageSection>

      {/* ── Section 3: Capacity & Forecast side-by-side ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-7 flex flex-col">
          <PageSection
            label="Capacity"
            title="Slot Utilization Trend"
            description="Percentage of block space filled by blobs relative to target capacity."
            interpretation="Consistent utilization above the 50% target (3 blobs per block in Dencun, higher in Pectra/Fusaka) triggers the exponential EIP-4844 fee escalator."
            fullHeight
            className="flex-1"
          >
            <BlobUtilizationChart data={market} />
          </PageSection>
        </div>

        <div className="lg:col-span-5 flex flex-col">
          {forecast && forecast.current_fee_wei > 0 ? (
            <PageSection
              label="Prediction"
              title="4–12 Slot Congestion Forecast"
              description="Predictive modeling of blob base fees over the next 50 blocks."
              interpretation="The predictive model uses the EIP-4844 exponential formula to project fee adjustments based on the accumulated excess blob gas. A steep upward curve signals imminent competition."
              fullHeight
              className="flex-1"
            >
              <CongestionForecast data={forecast} />
            </PageSection>
          ) : (
            <div className="flex-1 flex items-center justify-center p-8 border border-dashed border-border text-xs text-text-secondary opacity-50 italic font-mono">
              Forecast metrics calculating...
            </div>
          )}
        </div>
      </div>

      {/* ── Section 4: Rollup Activity & Behavior (Full width stacked charts) ── */}
      <PageSection
        label="Rollup Activity"
        title={`Ecosystem Behavior — Last ${HOURS_LABEL[hours]}`}
        description="Detailed breakdown of blob counts and average transaction fees paid per rollup sequencer."
        interpretation="Ecosystem telemetry tracks individual sequencer intensities. Diverging fee-per-rollup trends highlight how different networks optimize batch sizes to avoid high congestion fee windows."
      >
        <div className="space-y-8">
          <div>
            <h4 className="text-[10px] font-bold uppercase tracking-widest text-text-secondary mb-4 opacity-60 font-mono">
              Top 10 Rollups by Blob Volume
            </h4>
            <RollupActivityLineChart data={rollupActivity} />
          </div>

          <div className="pt-8 border-t border-dashed border-border/20">
            <h4 className="text-[10px] font-bold uppercase tracking-widest text-text-secondary mb-4 opacity-60 font-mono">
              Average Fee Paid per Rollup
            </h4>
            <RollupMetricLineChart data={rollupFee} mode="fee-wei" />
          </div>
        </div>
      </PageSection>

      {/* ── Section 5: Network Co-occurrence Graph (Spacious full-width) ── */}
      <PageSection
        label="Network Relationships"
        title="Ecosystem Co-occurrence Graph"
        description="Force-directed graph mapping which rollups share block space in the same transaction bundles."
        interpretation="Node size represents relative blob volume. Connected edges represent co-occurrence in the same blocks. Tight clusters highlight networks that submit transactions concurrently, driving short-term gas congestion."
      >
        <div className="h-[500px] w-full">
          {networkGraph.nodes.length > 0 ? (
            <RollupNetworkGraphD3 data={networkGraph} />
          ) : (
            <div className="h-full flex items-center justify-center text-text-secondary opacity-50 italic text-xs font-mono">
              No relationship data available in this window
            </div>
          )}
        </div>
      </PageSection>
    </div>
  );
}

// ── Shared brutalist components ──

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
