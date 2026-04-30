import { BlobFeeLineChart } from "@/components/charts/BlobFeeLineChart";
import { BlobsPerBlockChart } from "@/components/charts/BlobsPerBlockChart";
import { MarketRegimeTimeline } from "@/components/charts/MarketRegimeTimeline";
import { RegimeBadge } from "@/components/shared/RegimeBadge";
import { StatCard } from "@/components/shared/StatCard";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { getLeaderboard, getMarketActivity } from "@/lib/queries";
import { classifyRegime, formatFee, formatNumber } from "@/lib/utils";
import { TrendingUp } from "lucide-react";
import Link from "next/link";
import { MarketLiveWrapper } from "./MarketLiveWrapper";

export const revalidate = 30;

export default async function MarketPage() {
  const [market, leaderboard] = await Promise.all([
    getMarketActivity(24).catch(() => []),
    getLeaderboard(1).catch(() => []),
  ]);

  const latest = market[market.length - 1];
  const latestRegime = latest ? classifyRegime(latest.max_blobs_in_block) : "undersaturated";
  const topRollup = leaderboard[0]?.rollup ?? "—";
  const totalBlobsLastHour = market
    .slice(-1)
    .reduce((s, m) => s + Number(m.blob_count), 0);

  return (
    <div className="flex flex-col flex-1">
      <header className="border-b border-border bg-card">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8 flex items-center justify-between">
          <Link href="/" className="text-lg font-bold text-foreground tracking-tight">
            BlobLens
          </Link>
          <nav className="hidden sm:flex items-center gap-4 text-sm">
            <Link href="/" className="text-muted-foreground hover:text-foreground transition-colors">Overview</Link>
            <Link href="/leaderboard" className="text-muted-foreground hover:text-foreground transition-colors">Leaderboard</Link>
            <Link href="/market" className="text-foreground font-medium">Market</Link>
          </nav>
        </div>
      </header>

      <main className="flex-1 mx-auto max-w-7xl w-full px-4 py-8 sm:px-6 lg:px-8 space-y-8">
        {/* Regime + live stats */}
        <section className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <TrendingUp className="h-5 w-5 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Blob fee market:</span>
            <RegimeBadge maxBlobsInBlock={latest?.max_blobs_in_block ?? 0} size="lg" />
          </div>
          <p className="text-xs text-muted-foreground">Auto-refreshes every 12s</p>
        </section>

        <section className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatCard
            label="Avg Fee (last hr)"
            value={latest ? formatFee(latest.avg_fee) : "—"}
          />
          <StatCard
            label="Blobs (last hr)"
            value={formatNumber(totalBlobsLastHour)}
          />
          <StatCard label="Market Regime" value={latestRegime} />
          <StatCard label="Most Active" value={topRollup} />
        </section>

        {/* Regime timeline */}
        <Card>
          <CardHeader>
            <p className="text-sm font-semibold text-foreground">Regime Timeline (24h)</p>
          </CardHeader>
          <CardContent>
            <MarketRegimeTimeline data={market} />
            <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-slate-600 inline-block" /> Undersaturated</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-emerald-500 inline-block" /> Healthy</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-amber-500 inline-block" /> Congested</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-red-500 inline-block" /> Spike</span>
            </div>
          </CardContent>
        </Card>

        {/* Live charts (SWR refreshed) */}
        <MarketLiveWrapper initialData={market} />

        {/* Server-rendered fee chart */}
        <Card>
          <CardHeader>
            <p className="text-sm font-semibold text-foreground">Blob Base Fee Trend (24h)</p>
          </CardHeader>
          <CardContent>
            <BlobFeeLineChart data={market} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <p className="text-sm font-semibold text-foreground">Blobs per Block (24h)</p>
          </CardHeader>
          <CardContent>
            <BlobsPerBlockChart data={market} />
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
