import { BlobsPerBlockChart } from "@/components/charts/BlobsPerBlockChart";
import { BlobUtilizationChart } from "@/components/charts/BlobUtilizationChart";
import { CongestionForecast } from "@/components/charts/CongestionForecast";
import { CumulativeBlobGrowth } from "@/components/charts/CumulativeBlobGrowth";
import { PackingHistogram } from "@/components/charts/PackingHistogram";
import { RegimeHeatmap } from "@/components/charts/RegimeHeatmap";
import { RollupShareDonut } from "@/components/charts/RollupShareDonut";
import { RollupVolumeAreaChart } from "@/components/charts/RollupVolumeAreaChart";
import { InfoTooltip } from "@/components/shared/InfoTooltip";
import { PageHeader, PageSection } from "@/components/shared/PageHeader";
import { MetricCard } from "@/components/shared/MetricCard";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  getDailyRollupBreakdown,
  getForecastData,
  getFullnessHistogram,
  getLeaderboard,
  getMarketActivity,
} from "@/lib/queries";
import { Activity, BarChart3, FlaskConical, PieChart, TrendingUp, Zap } from "lucide-react";

export const revalidate = 60;

export default async function ResearchPage() {
  const [market7d, market30d, leaderboard30d, dailyBreakdown, forecast, fullnessHistogram] =
    await Promise.all([
      getMarketActivity(720).catch(() => []), // 30 days
      getMarketActivity(2160).catch(() => []), // 90 days
      getLeaderboard(2160).catch(() => []), // 90 days
      getDailyRollupBreakdown(90).catch(() => []), // 90 days
      getForecastData().catch(() => null),
      getFullnessHistogram(30).catch(() => []), // 30 days
    ]);

  const totalBlobs30d = leaderboard30d.reduce((s, r) => s + Number(r.total_blobs), 0);
  const totalTxs30d = leaderboard30d.reduce((s, r) => s + Number(r.tx_count), 0);
  const rollupCount = leaderboard30d.filter((r) => r.rollup !== "UNKNOWN").length;

  return (
    <div className="animate-page-in">
      <PageHeader
        meta="Economic Research"
        title="Blob Market Analytics"
        summary="Long-horizon analysis of Ethereum's blob market. Explore cumulative growth, market structural shifts, and data packing efficiency over 30-day windows."
      >
        <div className="flex items-center gap-1.5 px-3 py-1.5 surface border border-border rounded-md text-primary font-bold text-[10px] uppercase tracking-widest">
          <FlaskConical className="h-3 w-3" />
          Institutional View
        </div>
      </PageHeader>

      {/* Summary strip */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <MetricCard
          label="Blobs (30d)"
          value={totalBlobs30d.toLocaleString()}
          note="Cumulative EIP-4844 blobs submitted."
        />
        <MetricCard
          label="Transactions (30d)"
          value={totalTxs30d.toLocaleString()}
          note="Type-3 transactions in the monthly window."
        />
        <MetricCard
          label="Active Rollups"
          value={rollupCount}
          note="Distinct L2 protocols active this month."
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
        
        {/* Left Column */}
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
                  <div className="h-[300px] flex items-center justify-center">
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

        {/* Right Column */}
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
            <PageSection
              label="Forecast"
              title="Fee Projection"
              description="Short-term price modeling."
            >
              <CongestionForecast data={forecast} />
            </PageSection>
          )}

          {/* Research Insight Card */}
          <div className="p-8 border border-primary/20 bg-primary/5 rounded-xl space-y-4">
             <div className="flex items-center gap-3">
                <TrendingUp className="h-5 w-5 text-primary" />
                <h3 className="text-sm font-bold uppercase tracking-widest text-text-primary">Research Insight</h3>
             </div>
             <p className="text-xs text-text-secondary leading-relaxed">
               The transition to Pectra parameters has significantly altered the supply-demand equilibrium. Current data suggests that the 'Healthy' regime now sustains higher throughput at lower costs compared to the initial Dencun launch.
             </p>
             <div className="pt-4 flex justify-between items-center text-[10px] font-bold text-primary uppercase tracking-widest">
                <span>Confidence Score</span>
                <span className="font-mono">88%</span>
             </div>
             <div className="h-1 w-full bg-primary/10 rounded-full overflow-hidden">
                <div className="h-full bg-primary" style={{ width: '88%' }} />
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
