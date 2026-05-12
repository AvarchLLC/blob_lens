import { BlobsPerBlockChart } from "@/components/charts/BlobsPerBlockChart";
import { BlobUtilizationChart } from "@/components/charts/BlobUtilizationChart";
import { CongestionForecast } from "@/components/charts/CongestionForecast";
import { CumulativeBlobGrowth } from "@/components/charts/CumulativeBlobGrowth";
import { PackingHistogram } from "@/components/charts/PackingHistogram";
import { RegimeHeatmap } from "@/components/charts/RegimeHeatmap";
import { RollupShareDonut } from "@/components/charts/RollupShareDonut";
import { RollupVolumeAreaChart } from "@/components/charts/RollupVolumeAreaChart";
import { InfoTooltip } from "@/components/shared/InfoTooltip";
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
      getMarketActivity(168).catch(() => []),
      getMarketActivity(720).catch(() => []),
      getLeaderboard(720).catch(() => []),
      getDailyRollupBreakdown(30).catch(() => []),
      getForecastData().catch(() => null),
      getFullnessHistogram(7).catch(() => []),
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
                  content="Average percentage of the 9-blob block capacity used per hour over 30 days. Dashed line = EIP-4844 target (50%). Sustained above 80% = persistent fee pressure."
                  side="bottom"
                />
              </div>
            </CardHeader>
            <CardContent>
              <BlobUtilizationChart data={market30d} />
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

      </div>

      {/* ═══════════════════════════════════════
          SECTION 3: Blob Content Efficiency
      ═══════════════════════════════════════ */}
      <div className="space-y-4">
        <h2 className="text-xs uppercase tracking-[0.10em] text-muted-foreground font-semibold px-0.5">
          Blob Content Efficiency · 7d
        </h2>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <BarChart3 className="h-4 w-4" />
              <h2 className="section-title">Blob Fullness Distribution (7d)</h2>
              <InfoTooltip
                content="Distribution of blob content fullness across all indexed transactions in the past 7 days. Each bucket shows how many blob submissions fell in that fullness range. A left-heavy histogram (lots of 0–30% bars) indicates rollups paying for space they are not using. Data requires beacon sidecar indexing — bars appear as the indexer collects content metrics."
                side="bottom"
              />
            </div>
          </CardHeader>
          <CardContent>
            <PackingHistogram data={fullnessHistogram} />
          </CardContent>
        </Card>
      </div>

      {/* ═══════════════════════════════════════
          SECTION 4: Regime Patterns & Forecast
      ═══════════════════════════════════════ */}
      <div className="space-y-4">
        <h2 className="text-xs uppercase tracking-[0.10em] text-muted-foreground font-semibold px-0.5">
          Regime Patterns &amp; Forecast
        </h2>


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
