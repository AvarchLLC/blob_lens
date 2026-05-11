import { BlobFeeGauge } from "@/components/charts/BlobFeeGauge";
import { BlobFeeLineChart } from "@/components/charts/BlobFeeLineChart";
import { CostHeatmap } from "@/components/charts/CostHeatmap";
import { RollupVolumeAreaChart } from "@/components/charts/RollupVolumeAreaChart";
import { RegimeBadge } from "@/components/shared/RegimeBadge";
import { RollupShareCard } from "@/components/shared/RollupShareCard";
import { getEthPrice } from "@/lib/ethPrice";
import {
  getDailyRollupBreakdown,
  getLeaderboard,
  getMarketActivity,
} from "@/lib/queries";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { TrendingDown, Zap } from "lucide-react";
import Link from "next/link";

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
    <div className="page-root py-8 space-y-4">
      {/* Page title row */}
      <div className="flex items-center justify-between mb-2">
        <div>
          <h1 className="topbar-title">Overview</h1>
          <p className="topbar-sub">EIP-4844 blob economics · Ethereum mainnet</p>
        </div>
        <div className="flex items-center gap-3">
          {ethUsd && (
            <span className="caption">
              1 ETH = <span className="font-mono text-muted-foreground">${ethUsd.toLocaleString()}</span>
            </span>
          )}
          <RegimeBadge maxBlobsInBlock={latestMaxBlobs} size="sm" />
        </div>
      </div>

      {/* Bento Row 1: Fee chart (2/3) + Gauge (1/3) */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <TrendingDown className="h-4 w-4" />
              <h2 className="section-title">Historical Blob Cost</h2>
              {ethUsd && <span className="ml-auto caption">24h · USD / blob</span>}
            </div>
          </CardHeader>
          <CardContent>
            <BlobFeeLineChart data={market24h} ethUsd={ethUsd ?? undefined} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Zap className="h-4 w-4" />
              <h2 className="section-title">Current Transaction Cost</h2>
            </div>
          </CardHeader>
          <CardContent>
            <BlobFeeGauge latestFeeWei={latestFeeWei} ethUsd={ethUsd} />
          </CardContent>
        </Card>
      </div>

      {/* Bento Row 2: Rollup Share (1/3) + Live CTA (2/3) */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <RollupShareCard initialData={leaderboard} />

        <Link href="/live" className="lg:col-span-2 group block">
          <Card className="border-glow h-full flex flex-col items-center justify-center gap-4 py-12 cursor-pointer">
            <div className="green-badge">
              <span className="pulse-dot" />
              Live Feed
            </div>
            <p className="section-title text-center shimmer-text">Real-time Blob &amp; Block Feed</p>
            <p className="caption text-center max-w-xs text-[#71717a]">
              Blocks, transactions, rollup tags and cost — refreshes every 12s
            </p>
            <span className="gradient-button mt-2">Open feed →</span>
          </Card>
        </Link>
      </div>

      {/* Bento Row 3: 30d Volume (full width) */}
      <Card>
        <CardHeader>
          <h2 className="section-title">Total Blobs — 30d</h2>
        </CardHeader>
        <CardContent>
          <RollupVolumeAreaChart data={dailyRollups} />
        </CardContent>
      </Card>

      {/* Cost Heatmap */}
      {ethUsd && (
        <Card>
          <CardHeader>
            <h2 className="section-title">Cost Heatmap · 7d × 24h</h2>
          </CardHeader>
          <CardContent>
            <CostHeatmap data={market} ethUsd={ethUsd} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
