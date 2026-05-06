import { BlobFeeGauge } from "@/components/charts/BlobFeeGauge";
import { BlobFeeLineChart } from "@/components/charts/BlobFeeLineChart";
import { CostHeatmap } from "@/components/charts/CostHeatmap";
import { RollupVolumeAreaChart } from "@/components/charts/RollupVolumeAreaChart";
import { AppHeader } from "@/components/shared/AppHeader";
import { BlockFeed } from "@/components/shared/BlockFeed";
import { LiveBlobFeed } from "@/components/shared/LiveBlobFeed";
import { RegimeBadge } from "@/components/shared/RegimeBadge";
import { RollupShareCard } from "@/components/shared/RollupShareCard";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getEthPrice } from "@/lib/ethPrice";
import {
  getDailyRollupBreakdown,
  getLeaderboard,
  getMarketActivity,
} from "@/lib/queries";
import { Layers, TrendingDown, Zap } from "lucide-react";

export const revalidate = 60;

export default async function OverviewPage() {
  const [leaderboard, market, dailyRollups, ethUsd] = await Promise.all([
    getLeaderboard(24).catch(() => []),
    getMarketActivity(168).catch(() => []),
    getDailyRollupBreakdown(30, 16).catch(() => []),
    getEthPrice().catch(() => null),
  ]);

  const market24h = market.slice(-24);
  const latestHour = market.length > 0 ? market[market.length - 1] : null;
  const latestMaxBlobs = market.length > 0 ? Math.max(...market.map((m) => m.max_blobs_in_block)) : 0;

  const latestFeeWei = latestHour ? Number(latestHour.avg_fee) : 0;

  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader active="overview" regimeBadge={<RegimeBadge maxBlobsInBlock={latestMaxBlobs} size="sm" />} />

      <main className="mx-auto w-full max-w-7xl flex-1 space-y-8 px-4 py-8 sm:px-6 lg:px-8">

        {/* Hero Cards — Historical Cost + Current Cost */}
        <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2 text-sm text-[#9D93B8]">
                <TrendingDown className="h-4 w-4" />
                <h2 className="section-title">Historical Blob Cost</h2>
                {ethUsd && (
                  <span className="ml-auto caption">1 ETH = ${ethUsd.toLocaleString()}</span>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {ethUsd ? (
                <BlobFeeLineChart data={market24h} ethUsd={ethUsd} />
              ) : (
                <BlobFeeLineChart data={market24h} />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2 text-sm text-[#9D93B8]">
                <Zap className="h-4 w-4" />
                <h2 className="section-title">Current Transaction Cost</h2>
              </div>
            </CardHeader>
            <CardContent>
              <BlobFeeGauge latestFeeWei={latestFeeWei} ethUsd={ethUsd} />
            </CardContent>
          </Card>
        </section>

        {/* Live Feed */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2 text-sm text-[#9D93B8]">
              <Layers className="h-4 w-4" />
              <h2 className="section-title">Live Feed</h2>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="blocks">
              <TabsList className="mb-4">
                <TabsTrigger value="blocks">Blocks</TabsTrigger>
                <TabsTrigger value="transactions">Transactions</TabsTrigger>
              </TabsList>
              <TabsContent value="blocks">
                <BlockFeed />
              </TabsContent>
              <TabsContent value="transactions">
                <LiveBlobFeed />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Row 1: Total Blobs daily stacked + Rollup Share with time selector */}
        <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2 text-sm text-[#9D93B8]">
                <h2 className="section-title">Total Blobs</h2>
              </div>
            </CardHeader>
            <CardContent>
              <RollupVolumeAreaChart data={dailyRollups} />
            </CardContent>
          </Card>

          <RollupShareCard initialData={leaderboard} />
        </section>

        {/* Cost Heatmap — 7d × 24h */}
        {ethUsd && (
          <Card>
            <CardHeader>
              <h2 className="section-title">Cost Heatmap</h2>
            </CardHeader>
            <CardContent>
              <CostHeatmap data={market} ethUsd={ethUsd} />
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
