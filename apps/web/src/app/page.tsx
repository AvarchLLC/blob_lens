import { BlobsPerBlockChart } from "@/components/charts/BlobsPerBlockChart";
import { CumulativeBlobGrowth } from "@/components/charts/CumulativeBlobGrowth";
import { RollupShareDonut } from "@/components/charts/RollupShareDonut";
import { RollupVolumeAreaChart } from "@/components/charts/RollupVolumeAreaChart";
import { AppHeader } from "@/components/shared/AppHeader";
import { LiveBlobFeed } from "@/components/shared/LiveBlobFeed";
import { RegimeBadge } from "@/components/shared/RegimeBadge";
import { StatCard } from "@/components/shared/StatCard";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { getLeaderboard, getMarketActivity, getOverviewStats } from "@/lib/queries";
import { formatNumber } from "@/lib/utils";
import { Activity, BarChart3, Layers, PieChart } from "lucide-react";

export const revalidate = 60;

export default async function OverviewPage() {
  const [stats, leaderboard, market] = await Promise.all([
    getOverviewStats().catch(() => null),
    getLeaderboard(24).catch(() => []),
    getMarketActivity(24).catch(() => []),
  ]);

  const latestMaxBlobs = market.length > 0 ? Math.max(...market.map((m) => m.max_blobs_in_block)) : 0;

  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader active="overview" regimeBadge={<RegimeBadge maxBlobsInBlock={latestMaxBlobs} size="sm" />} />

      <main className="mx-auto w-full max-w-7xl flex-1 space-y-8 px-4 py-8 sm:px-6 lg:px-8">
        <section className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatCard label="Total Blobs" value={stats ? formatNumber(Number(stats.total_blobs)) : "—"} />
          <StatCard label="Transactions" value={stats ? formatNumber(Number(stats.total_txs)) : "—"} />
          <StatCard label="Rollups Tracked" value={stats ? String(stats.rollup_count) : "—"} />
          <StatCard
            label="Last Block"
            value={stats ? `#${formatNumber(Number(stats.last_block))}` : "—"}
            sub={stats?.last_indexed ? new Date(stats.last_indexed).toLocaleTimeString() : undefined}
          />
        </section>

        <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2 text-sm text-[#9D93B8]">
                <BarChart3 className="h-4 w-4" />
                <h2 className="section-title">Blob Volume by Rollup</h2>
              </div>
            </CardHeader>
            <CardContent>
              <RollupVolumeAreaChart data={leaderboard} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2 text-sm text-[#9D93B8]">
                <PieChart className="h-4 w-4" />
                <h2 className="section-title">Rollup Share</h2>
              </div>
            </CardHeader>
            <CardContent>
              <RollupShareDonut data={leaderboard} />
            </CardContent>
          </Card>
        </section>

        <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2 text-sm text-[#9D93B8]">
                <Activity className="h-4 w-4" />
                <h2 className="section-title">Blobs per Block</h2>
              </div>
            </CardHeader>
            <CardContent>
              <BlobsPerBlockChart data={market} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <h2 className="section-title">Cumulative Blob Growth</h2>
            </CardHeader>
            <CardContent>
              <CumulativeBlobGrowth data={market} />
            </CardContent>
          </Card>
        </section>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2 text-sm text-[#9D93B8]">
              <Layers className="h-4 w-4" />
              <h2 className="section-title">Live Blob Feed</h2>
            </div>
          </CardHeader>
          <CardContent>
            <LiveBlobFeed />
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
