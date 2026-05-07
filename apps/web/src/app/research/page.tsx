import { BlobsPerBlockChart } from "@/components/charts/BlobsPerBlockChart";
import { CumulativeBlobGrowth } from "@/components/charts/CumulativeBlobGrowth";
import { MarketRegimeTimeline } from "@/components/charts/MarketRegimeTimeline";
import { RegimeHeatmap } from "@/components/charts/RegimeHeatmap";
import { RollupShareDonut } from "@/components/charts/RollupShareDonut";
import { RollupVolumeAreaChart } from "@/components/charts/RollupVolumeAreaChart";
import { SlotUtilizationChart } from "@/components/charts/SlotUtilizationChart";
import { TopBar } from "@/components/shared/TopBar";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { getDailyRollupBreakdown, getLeaderboard, getMarketActivity } from "@/lib/queries";
import { Activity, BarChart3, FlaskConical, PieChart, TrendingUp } from "lucide-react";

export const revalidate = 60;

export default async function ResearchPage() {
  const [market7d, market30d, leaderboard30d, dailyBreakdown] = await Promise.all([
    getMarketActivity(168).catch(() => []),
    getMarketActivity(720).catch(() => []),
    getLeaderboard(720).catch(() => []),
    getDailyRollupBreakdown(30).catch(() => []),
  ]);

  const totalBlobs30d = leaderboard30d.reduce((s, r) => s + Number(r.total_blobs), 0);
  const totalTxs30d = leaderboard30d.reduce((s, r) => s + Number(r.tx_count), 0);
  const rollupCount = leaderboard30d.filter((r) => r.rollup !== "UNKNOWN").length;

  return (
    <div className="flex flex-col">
      <TopBar
        title="Research"
        subtitle="Long-horizon blob economics · 30-day window"
        right={
          <div className="flex items-center gap-1.5 caption text-[#10B981]">
            <FlaskConical className="h-3.5 w-3.5" />
            analytical view
          </div>
        }
      />

      <div className="space-y-6 px-6 py-4">
        {/* Summary strip */}
        <section className="grid grid-cols-3 gap-4 sm:grid-cols-3">
          <div className="rounded-lg border border-border bg-card px-4 py-3">
            <p className="caption">Blobs (30d)</p>
            <p className="font-mono text-xl font-bold text-foreground">{totalBlobs30d.toLocaleString()}</p>
          </div>
          <div className="rounded-lg border border-border bg-card px-4 py-3">
            <p className="caption">Transactions (30d)</p>
            <p className="font-mono text-xl font-bold text-foreground">{totalTxs30d.toLocaleString()}</p>
          </div>
          <div className="rounded-lg border border-border bg-card px-4 py-3">
            <p className="caption">Active rollups</p>
            <p className="font-mono text-xl font-bold text-foreground">{rollupCount}</p>
          </div>
        </section>

        {/* Row 1: growth + share */}
        <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2 text-sm text-[#9D93B8]">
                <TrendingUp className="h-4 w-4" />
                <h2 className="section-title">Cumulative Blob Growth (7d)</h2>
              </div>
            </CardHeader>
            <CardContent>
              <CumulativeBlobGrowth data={market7d} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2 text-sm text-[#9D93B8]">
                <PieChart className="h-4 w-4" />
                <h2 className="section-title">Rollup Market Share (30d)</h2>
              </div>
            </CardHeader>
            <CardContent>
              <RollupShareDonut data={leaderboard30d} />
            </CardContent>
          </Card>
        </section>

        {/* Row 2: volume stacked area */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2 text-sm text-[#9D93B8]">
              <BarChart3 className="h-4 w-4" />
              <h2 className="section-title">Daily Blob Volume by Rollup (30d)</h2>
            </div>
          </CardHeader>
          <CardContent>
            <RollupVolumeAreaChart data={dailyBreakdown} />
          </CardContent>
        </Card>

        {/* Row 3: utilization + blobs per block */}
        <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2 text-sm text-[#9D93B8]">
                <BarChart3 className="h-4 w-4" />
                <h2 className="section-title">Slot Utilization (7d)</h2>
              </div>
            </CardHeader>
            <CardContent>
              <SlotUtilizationChart data={market7d} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2 text-sm text-[#9D93B8]">
                <Activity className="h-4 w-4" />
                <h2 className="section-title">Blobs per Block (7d)</h2>
              </div>
            </CardHeader>
            <CardContent>
              <BlobsPerBlockChart data={market7d} />
            </CardContent>
          </Card>
        </section>

        {/* Row 4: regime timeline + heatmap */}
        <Card>
          <CardHeader>
            <h2 className="section-title">Market Regime Timeline (30d)</h2>
          </CardHeader>
          <CardContent>
            <MarketRegimeTimeline data={market30d} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="section-title">Regime Heatmap (7d)</h2>
          </CardHeader>
          <CardContent>
            <RegimeHeatmap data={market7d} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
