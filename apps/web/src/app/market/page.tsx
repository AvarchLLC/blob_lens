import { BlobFeeLineChart } from "@/components/charts/BlobFeeLineChart";
import { BlobsPerBlockChart } from "@/components/charts/BlobsPerBlockChart";
import { BlobUtilizationChart } from "@/components/charts/BlobUtilizationChart";
import { CongestionForecast } from "@/components/charts/CongestionForecast";
import { L1vsBlobFeeChart } from "@/components/charts/L1vsBlobFeeChart";
import { RegimeHeatmap } from "@/components/charts/RegimeHeatmap";
import { RollupActivityLineChart } from "@/components/charts/RollupActivityLineChart";
import { RollupMetricLineChart } from "@/components/charts/RollupMetricLineChart";
import { RollupNetworkGraphD3 } from "@/components/charts/RollupNetworkGraphD3";
import { InfoTooltip } from "@/components/shared/InfoTooltip";
import { RegimeAlertPanel } from "@/components/shared/RegimeAlertPanel";
import { RegimeBadge } from "@/components/shared/RegimeBadge";
import { L1CostComparisonTable } from "@/components/shared/L1CostComparisonTable";
import { PageHeader, PageSection } from "@/components/shared/PageHeader";
import { MetricCard } from "@/components/shared/MetricCard";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
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

export const revalidate = 30;

const REGIME_COLOR: Record<string, string> = {
  undersaturated: "#71717A",
  healthy:        "#00A86B",
  congested:      "#F5A524",
  spike:          "#E5484D",
};

export default async function MarketPage() {
  const [market24h, market7d, leaderboard, ethUsd, forecast, rollupActivity, rollupFee, rollupUtil, networkGraph, l1FeeData, l1HistoricalCosts] =
    await Promise.all([
      getMarketActivity(720).catch(() => []), // 30 days
      getMarketActivity(2160).catch(() => []), // 90 days
      getLeaderboard(1).catch(() => []),
      getEthPrice(),
      getForecastData().catch(() => null),
      getHourlyRollupActivity(24, 10).catch(() => []),
      getHourlyRollupFee(24, 10).catch(() => []),
      getHourlyRollupUtilization(24, 10).catch(() => []),
      getRollupNetworkGraph(24).catch(() => ({ nodes: [], edges: [] })),
      getHourlyL1Fee(24).catch(() => []),
      getL1Costs(30).catch(() => []),
    ]);

  const latestL1Cost = l1HistoricalCosts[l1HistoricalCosts.length - 1] || null;
  const market = market24h;
  const latest = market[market.length - 1];
  const topRollup = leaderboard[0]?.rollup ?? "—";
  const totalBlobsLastHour = market.slice(-1).reduce((s, m) => s + Number(m.blob_count), 0);
  const avgUtilization = market.length
    ? (market.reduce((s, m) => s + Number(m.avg_utilization), 0) / market.length).toFixed(1)
    : "—";

  const regimeName = classifyRegime(latest?.max_blobs_in_block ?? 0);

  return (
    <div className="animate-page-in">
      <PageHeader
        meta="Market Intelligence"
        title="Blob Fee Economics"
        summary="Deep analysis of Ethereum's EIP-4844 blob market. Monitor real-time regimes, historical fee trends, and ecosystem-wide utilization patterns."
      >
        <div className="flex items-center gap-3">
          <div className="px-4 py-2 surface border border-border flex items-center gap-2">
            <span className="pulse-dot" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-text-secondary opacity-60 tracking-widest">Live 30s</span>
          </div>
          <RegimeBadge maxBlobsInBlock={latest?.max_blobs_in_block ?? 0} size="lg" />
        </div>
      </PageHeader>

      {/* ── Metric cards ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        <MetricCard
          label="Cost / Blob (Avg)"
          value={
            latest && Number(latest.avg_fee) > 0
              ? ethUsd != null
                ? formatUsd(blobCostUsd(latest.avg_fee, ethUsd))
                : `${(Number(latest.avg_fee) / 1e9).toFixed(4)} gwei`
              : "1 wei"
          }
          note="Average fee per 128KB blob (last hour)."
        />
        <MetricCard
          label="Total Blobs (1h)"
          value={formatNumber(totalBlobsLastHour)}
          note="Combined blobs across all indexed blocks."
        />
        <MetricCard
          label="Avg Utilization"
          value={avgUtilization === "—" ? "—" : `${avgUtilization}%`}
          note="Network usage relative to the 9-blob max."
        />
        <MetricCard
          label="Most Active Rollup"
          value={topRollup}
          note="Entity with highest volume in current window."
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
        
        {/* Left Column */}
        <div className="xl:col-span-8 space-y-12">
          
          <PageSection
            label="Regime Analysis"
            title="Market State Classification"
            description="Hour-by-hour market state over 24 hours."
            interpretation="Regime classification is based on block fullness. 'Healthy' regimes indicate optimal fee-burning efficiency without congestion-induced price spikes."
          >
            <div className="min-h-[300px]">
              <RegimeHeatmap data={market} />
            </div>
          </PageSection>

          <PageSection
            label="Pricing"
            title="Historical Cost Benchmarking"
            description="Comparison of blob base fees and alternative L1 data availability costs."
            interpretation="The 'Blob DA vs L1 Calldata' chart highlights the massive cost savings introduced by EIP-4844. Blobs are typically 10-100x cheaper than posting data as Calldata."
          >
            <div className="space-y-10">
              <div>
                <h4 className="text-[10px] font-bold uppercase tracking-widest text-text-secondary mb-4 opacity-60">
                  L2 Transaction Efficiency (vs. L1)
                </h4>
                <L1CostComparisonTable latestL1={latestL1Cost} avgBlobUsd={latest ? Number(latest.avg_fee) * 131_072 / 1e18 * (ethUsd || 0) : null} />
              </div>

              <div className="pt-10 border-t border-border/50">
                <h4 className="text-[10px] font-bold uppercase tracking-widest text-text-secondary mb-4 opacity-60">
                  Blob Base Fee Trend (24h)
                </h4>
                <BlobFeeLineChart data={market} ethUsd={ethUsd ?? undefined} />
              </div>
              {ethUsd != null && l1FeeData.length > 0 && (
                <div className="pt-10 border-t border-border/50">
                  <h4 className="text-[10px] font-bold uppercase tracking-widest text-text-secondary mb-4 opacity-60">
                    DA vs Calldata Cost Comparison (USD)
                  </h4>
                  <L1vsBlobFeeChart blobData={market} l1Data={l1FeeData} ethUsd={ethUsd} />
                </div>
              )}
            </div>
          </PageSection>

          <PageSection
            label="Capacity"
            title="Throughput & Slot Analysis"
            description="Detailed block utilization and per-slot analysis."
            interpretation="Consistent utilization above the 50% target (4.5 blobs) triggers the exponential fee mechanism. Sustained 'Congested' regimes indicate a growing demand for data availability."
          >
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
              <div>
                <h4 className="text-[10px] font-bold uppercase tracking-widest text-text-secondary mb-4 opacity-60">
                  Blobs per Block
                </h4>
                <BlobsPerBlockChart data={market} />
              </div>
              <div className="lg:border-l lg:border-border/50 lg:pl-10">
                <h4 className="text-[10px] font-bold uppercase tracking-widest text-text-secondary mb-4 opacity-60">
                  Slot Utilization (%)
                </h4>
                <BlobUtilizationChart data={market} />
              </div>
            </div>
          </PageSection>

          <PageSection
            label="Rollup Activity"
            title="Ecosystem Behavior"
            description="Analysis of how individual rollups utilize the blob market."
            interpretation="Bursts in 'Activity by Rollup' often correlate with major protocol upgrades or peak user demand periods. Diverging 'Fee by Rollup' lines show how rollups optimize their batching strategy."
          >
            <div className="space-y-10">
              <div>
                <h4 className="text-[10px] font-bold uppercase tracking-widest text-text-secondary mb-4 opacity-60">
                  Top 10 Rollups by Volume
                </h4>
                <RollupActivityLineChart data={rollupActivity} />
              </div>
              <div className="pt-10 border-t border-border/50">
                <h4 className="text-[10px] font-bold uppercase tracking-widest text-text-secondary mb-4 opacity-60">
                  Average Fee Paid per Rollup
                </h4>
                <RollupMetricLineChart data={rollupFee} mode="fee-wei" />
              </div>
            </div>
          </PageSection>
        </div>

        {/* Right Column */}
        <div className="xl:col-span-4 space-y-12">
          
          {forecast && forecast.current_fee_wei > 0 && (
            <PageSection
              label="Prediction"
              title="Congestion Forecast"
              description="Predictive modeling of blob base fees."
              interpretation="This model uses the EIP-4844 exponential formula to project fees over the next 50 blocks. High steepness suggests imminent fee escalation."
            >
              <CongestionForecast data={forecast} />
            </PageSection>
          )}

          <PageSection
            label="Network"
            title="Ecosystem Relationships"
            description="Force-directed graph of rollup DA co-occurrence."
            interpretation="Node size represents blob volume. Edges represent co-occurrence in the same block. Tightly clustered graphs indicate intense competition for block space."
          >
            <div className="h-[400px]">
              {networkGraph.nodes.length > 0 ? (
                <RollupNetworkGraphD3 data={networkGraph} />
              ) : (
                <div className="h-full flex items-center justify-center text-text-secondary opacity-40 italic text-xs">No relationship data available.</div>
              )}
            </div>
          </PageSection>

          <RegimeAlertPanel />
        </div>
      </div>
    </div>
  );
}
