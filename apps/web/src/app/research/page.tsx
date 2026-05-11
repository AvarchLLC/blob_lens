import { BlobsPerBlockChart } from "@/components/charts/BlobsPerBlockChart";
import { CongestionForecast } from "@/components/charts/CongestionForecast";
import { CumulativeBlobGrowth } from "@/components/charts/CumulativeBlobGrowth";
import { MarketRegimeTimeline } from "@/components/charts/MarketRegimeTimeline";
import { RegimeHeatmap } from "@/components/charts/RegimeHeatmap";
import { RollupMetricLineChart } from "@/components/charts/RollupMetricLineChart";
import { RollupShareDonut } from "@/components/charts/RollupShareDonut";
import { RollupVolumeAreaChart } from "@/components/charts/RollupVolumeAreaChart";
import { SlotUtilizationChart } from "@/components/charts/SlotUtilizationChart";
import { InfoTooltip } from "@/components/shared/InfoTooltip";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  getDailyRollupBreakdown,
  getForecastData,
  getHourlyRollupFee,
  getLeaderboard,
  getMarketActivity,
} from "@/lib/queries";
import { Activity, BarChart3, FlaskConical, PieChart, TrendingUp, Zap } from "lucide-react";

export const revalidate = 60;

export default async function ResearchPage() {
  const [market7d, market30d, leaderboard30d, dailyBreakdown, forecast, rollupFee7d] =
    await Promise.all([
      getMarketActivity(168).catch(() => []),
      getMarketActivity(720).catch(() => []),
      getLeaderboard(720).catch(() => []),
      getDailyRollupBreakdown(30).catch(() => []),
      getForecastData().catch(() => null),
      getHourlyRollupFee(168, 10).catch(() => []),
    ]);

  const totalBlobs30d = leaderboard30d.reduce((s, r) => s + Number(r.total_blobs), 0);
  const totalTxs30d = leaderboard30d.reduce((s, r) => s + Number(r.tx_count), 0);
  const rollupCount = leaderboard30d.filter((r) => r.rollup !== "UNKNOWN").length;

  return (
    <div className="page-root py-8 space-y-6">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h1 className="topbar-title">Research</h1>
          <p className="topbar-sub">Long-horizon blob economics · 30-day window</p>
        </div>
        <div className="flex items-center gap-1.5 caption text-[#10B981]">
          <FlaskConical className="h-3.5 w-3.5" />
          analytical view
        </div>
      </div>

      {/* Summary strip */}
      <section className="grid grid-cols-3 gap-4">
        <div className="glass-card rounded-lg px-4 py-3">
          <div className="flex items-center gap-1.5 mb-1">
            <p className="caption">Blobs (30d)</p>
            <InfoTooltip content="Total EIP-4844 blobs across all rollups in the past 30 days. Each blob holds ~128 KB of L2 state data posted to Ethereum for data availability." side="bottom" />
          </div>
          <p className="font-mono text-xl font-bold text-foreground">{totalBlobs30d.toLocaleString()}</p>
        </div>
        <div className="glass-card rounded-lg px-4 py-3">
          <div className="flex items-center gap-1.5 mb-1">
            <p className="caption">Transactions (30d)</p>
            <InfoTooltip content="Count of EIP-4844 type-3 transactions in 30 days. One transaction can carry up to 6 blobs." side="bottom" />
          </div>
          <p className="font-mono text-xl font-bold text-foreground">{totalTxs30d.toLocaleString()}</p>
        </div>
        <div className="glass-card rounded-lg px-4 py-3">
          <div className="flex items-center gap-1.5 mb-1">
            <p className="caption">Active rollups</p>
            <InfoTooltip content="Distinct rollup sequencers that posted at least one blob in the past 30 days. Excludes unattributed senders." side="bottom" />
          </div>
          <p className="font-mono text-xl font-bold text-foreground">{rollupCount}</p>
        </div>
      </section>

      {/* ═══════════════════════════════════════
          SECTION 1: Growth Trends
      ═══════════════════════════════════════ */}
      <div className="space-y-4">
        <h2 className="text-xs uppercase tracking-[0.10em] text-muted-foreground font-semibold px-0.5">
          Growth Trends
        </h2>

        <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <TrendingUp className="h-4 w-4" />
                <h2 className="section-title">Cumulative Blob Growth (7d)</h2>
                <InfoTooltip
                  content="Running total of all blobs submitted over 7 days. The slope indicates submission velocity — a steepening curve means accelerating adoption."
                  side="bottom"
                />
              </div>
            </CardHeader>
            <CardContent>
              <CumulativeBlobGrowth data={market7d} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Activity className="h-4 w-4" />
                <h2 className="section-title">Blobs per Block (7d)</h2>
                <InfoTooltip
                  content="Average blobs per Ethereum block over 7 days. Protocol max is 9 (post-Pectra). Consistent 4–5 blobs/block = healthy demand; spikes near 9 = competition and rising fees."
                  side="bottom"
                />
              </div>
            </CardHeader>
            <CardContent>
              <BlobsPerBlockChart data={market7d} />
            </CardContent>
          </Card>
        </section>
      </div>

      {/* ═══════════════════════════════════════
          SECTION 2: Market Structure (30d)
      ═══════════════════════════════════════ */}
      <div className="space-y-4">
        <h2 className="text-xs uppercase tracking-[0.10em] text-muted-foreground font-semibold px-0.5">
          Market Structure · 30d
        </h2>

        <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <PieChart className="h-4 w-4" />
                <h2 className="section-title">Rollup Market Share (30d)</h2>
                <InfoTooltip
                  content="Each slice shows one rollup's share of total blobs over 30 days. A larger slice means greater reliance on Ethereum for data availability. Hover a slice for exact count and percentage."
                  side="bottom"
                />
              </div>
            </CardHeader>
            <CardContent>
              <RollupShareDonut data={leaderboard30d} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <BarChart3 className="h-4 w-4" />
                <h2 className="section-title">Slot Utilization (30d)</h2>
                <InfoTooltip
                  content="Average percentage of the 9-blob block capacity used per hour over 30 days. Sustained above 80% = persistent fee pressure. Macro trends reveal whether demand is growing into or away from saturation."
                  side="bottom"
                />
              </div>
            </CardHeader>
            <CardContent>
              <SlotUtilizationChart data={market30d} />
            </CardContent>
          </Card>
        </section>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <BarChart3 className="h-4 w-4" />
              <h2 className="section-title">Daily Blob Volume by Rollup (30d)</h2>
              <InfoTooltip
                content="Stacked area chart showing each rollup's daily blob count over 30 days. Total height = total blobs that day. Watch for step-changes indicating protocol upgrades or demand shifts."
                side="bottom"
              />
            </div>
          </CardHeader>
          <CardContent>
            <RollupVolumeAreaChart data={dailyBreakdown} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <TrendingUp className="h-4 w-4" />
              <h2 className="section-title">Blob Base Fee by Rollup (7d)</h2>
              <InfoTooltip
                content="Per-rollup blob base fee over 7 days. Shows whether rollup fees are converging (efficient market) or diverging (timing differences). Rollups consistently below average are timing submissions well."
                side="bottom"
              />
            </div>
          </CardHeader>
          <CardContent>
            {rollupFee7d.length > 0
              ? <RollupMetricLineChart data={rollupFee7d} mode="fee-wei" />
              : <p className="py-8 text-center text-sm text-muted-foreground">No rollup fee data</p>}
          </CardContent>
        </Card>
      </div>

      {/* ═══════════════════════════════════════
          SECTION 3: Regime Patterns & Forecast
      ═══════════════════════════════════════ */}
      <div className="space-y-4">
        <h2 className="text-xs uppercase tracking-[0.10em] text-muted-foreground font-semibold px-0.5">
          Regime Patterns &amp; Forecast
        </h2>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <h2 className="section-title">Market Regime Timeline (30d)</h2>
              <InfoTooltip
                content="Historical record of the blob fee market's state over 30 days. Each segment = 1 hour, classified into: Quiet (<20%), Healthy (20–80%), Congested (80–95%), Spike (>95%). Identifies macro congestion patterns and protocol changes."
                side="bottom"
              />
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            <MarketRegimeTimeline data={market30d} />
            <p className="text-[10px] text-muted-foreground">
              {market30d.length} hourly buckets · left = oldest
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <h2 className="section-title">Regime Heatmap (7d)</h2>
              <InfoTooltip
                content="7-day × 24-hour heatmap. Each cell = 1 hour, colored by market regime. Reveals repeating daily congestion patterns — useful for scheduling cost-optimal blob submissions."
                side="bottom"
              />
            </div>
          </CardHeader>
          <CardContent>
            <RegimeHeatmap data={market7d} />
          </CardContent>
        </Card>

        {forecast && forecast.current_fee_wei > 0 && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Zap className="h-4 w-4" />
                <h2 className="section-title">Fee Congestion Forecast</h2>
                <InfoTooltip
                  content="Short-term fee projection using the EIP-4844 exponential formula applied to the last 50 blocks. The excess_trend signal detects if fee pressure is building or easing. Each row shows projected fee and market regime at that time horizon."
                  side="bottom"
                />
              </div>
            </CardHeader>
            <CardContent>
              <CongestionForecast data={forecast} />
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
