import { BlobsPerBlockChart } from "@/components/charts/BlobsPerBlockChart";
import { RollupVolumeAreaChart } from "@/components/charts/RollupVolumeAreaChart";
import { LiveBlobFeed } from "@/components/shared/LiveBlobFeed";
import { RegimeBadge } from "@/components/shared/RegimeBadge";
import { StatCard } from "@/components/shared/StatCard";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  getLeaderboard,
  getMarketActivity,
  getOverviewStats,
} from "@/lib/queries";
import { formatNumber } from "@/lib/utils";
import { Activity, BarChart3, Layers, Zap } from "lucide-react";
import Link from "next/link";

export const revalidate = 60;

export default async function OverviewPage() {
  const [stats, leaderboard, market] = await Promise.all([
    getOverviewStats().catch(() => null),
    getLeaderboard(24).catch(() => []),
    getMarketActivity(24).catch(() => []),
  ]);

  const latestMaxBlobs =
    market.length > 0
      ? Math.max(...market.map((m) => m.max_blobs_in_block))
      : 0;

  return (
    <div className="flex flex-col flex-1">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-foreground tracking-tight">BlobLens</h1>
            <p className="text-xs text-muted-foreground">EIP-4844 Analytics</p>
          </div>
          <div className="flex items-center gap-6">
            <nav className="hidden sm:flex items-center gap-4 text-sm">
              <Link href="/" className="text-foreground font-medium">Overview</Link>
              <Link href="/leaderboard" className="text-muted-foreground hover:text-foreground transition-colors">Leaderboard</Link>
              <Link href="/market" className="text-muted-foreground hover:text-foreground transition-colors">Market</Link>
            </nav>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              Live
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 mx-auto max-w-7xl w-full px-4 py-8 sm:px-6 lg:px-8 space-y-8">
        {/* Stat cards */}
        <section className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatCard
            label="Total Blobs"
            value={stats ? formatNumber(Number(stats.total_blobs)) : "—"}
          />
          <StatCard
            label="Transactions"
            value={stats ? formatNumber(Number(stats.total_txs)) : "—"}
          />
          <StatCard
            label="Rollups Tracked"
            value={stats ? String(stats.rollup_count) : "—"}
          />
          <StatCard
            label="Last Block"
            value={stats ? `#${formatNumber(Number(stats.last_block))}` : "—"}
            sub={
              stats?.last_indexed
                ? new Date(stats.last_indexed).toLocaleTimeString()
                : undefined
            }
          />
        </section>

        {/* Current regime */}
        <section className="flex items-center gap-3">
          <Zap className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Current regime:</span>
          <RegimeBadge maxBlobsInBlock={latestMaxBlobs} size="sm" />
        </section>

        <Separator />

        {/* Charts */}
        <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <BarChart3 className="h-4 w-4" /> Blob Volume by Rollup (24h)
              </div>
            </CardHeader>
            <CardContent>
              <RollupVolumeAreaChart data={leaderboard} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <Activity className="h-4 w-4" /> Blobs per Block (24h)
              </div>
            </CardHeader>
            <CardContent>
              <BlobsPerBlockChart data={market} />
            </CardContent>
          </Card>
        </section>

        {/* Live feed */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Layers className="h-4 w-4" /> Live Blob Feed
            </div>
          </CardHeader>
          <CardContent>
            <LiveBlobFeed />
          </CardContent>
        </Card>
      </main>

      <footer className="border-t border-border py-6 text-center text-xs text-muted-foreground">
        BlobLens v0.2.0 &mdash;{" "}
        <a href="https://eips.ethereum.org/EIPS/eip-4844" target="_blank" rel="noreferrer" className="text-primary hover:underline">
          EIP-4844
        </a>
      </footer>
    </div>
  );
}
