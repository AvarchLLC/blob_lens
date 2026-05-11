import { BlobFeeGauge } from "@/components/charts/BlobFeeGauge";
import { BlobFeeLineChartSelector } from "@/components/charts/BlobFeeLineChartSelector";
import { BlobsPerBlockChart } from "@/components/charts/BlobsPerBlockChart";
import { CostHeatmap } from "@/components/charts/CostHeatmap";
import { MarketRegimeTimeline } from "@/components/charts/MarketRegimeTimeline";
import { RollupVolumeAreaChart } from "@/components/charts/RollupVolumeAreaChart";
import { InfoTooltip } from "@/components/shared/InfoTooltip";
import { RegimeBadge } from "@/components/shared/RegimeBadge";
import { RollupShareCard } from "@/components/shared/RollupShareCard";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { getEthPrice } from "@/lib/ethPrice";
import {
  getDailyRollupBreakdown,
  getHourlyRollupFee,
  getLeaderboard,
  getMarketActivity,
} from "@/lib/queries";
import { classifyRegime, formatNumber } from "@/lib/utils";
import { Activity, Clock, TrendingDown, Zap } from "lucide-react";
import Link from "next/link";

export const revalidate = 60;

const REGIME_DOT: Record<string, string> = {
  undersaturated: "#3f3f46",
  healthy:        "#00df81",
  congested:      "#fcbb00",
  spike:          "#fb2c36",
};

export default async function OverviewPage() {
  const [leaderboard, market, dailyRollups, ethUsd, rollupFeeData] = await Promise.all([
    getLeaderboard(24).catch(() => []),
    getMarketActivity(168).catch(() => []),
    getDailyRollupBreakdown(30, 16).catch(() => []),
    getEthPrice().catch(() => null),
    getHourlyRollupFee(24, 20).catch(() => []),
  ]);

  const market24h = market.slice(-24);
  const latestHour = market24h.length > 0 ? market24h[market24h.length - 1] : null;
  const latestMaxBlobs = market24h.length > 0 ? Math.max(...market24h.map((m) => m.max_blobs_in_block)) : 0;
  const latestFeeWei = latestHour ? Number(latestHour.avg_fee) : 0;

  // 24h snapshot stats
  const totalBlobs24h = leaderboard.reduce((s, r) => s + Number(r.total_blobs), 0);
  const avgUtil24h = market24h.length
    ? (market24h.reduce((s, m) => s + Number(m.avg_utilization), 0) / market24h.length).toFixed(1)
    : "—";
  const topRollup = leaderboard.find((r) => r.rollup !== "UNKNOWN")?.rollup ?? "—";
  const activeRollups = leaderboard.filter((r) => r.rollup !== "UNKNOWN").length;

  // Regime breakdown for the last 24h
  const regimeCounts = market24h.reduce((acc, m) => {
    const r = classifyRegime(m.max_blobs_in_block);
    acc[r] = (acc[r] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const REGIME_ORDER = ["spike", "congested", "healthy", "undersaturated"] as const;

  return (
    <div className="page-root py-8 space-y-4">
      {/* Page title */}
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

      {/* Row 1: Gauge (1/3) + Fee Chart (2/3) */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Zap className="h-4 w-4" />
              <h2 className="section-title">Current Fee</h2>
              <InfoTooltip
                content="Real-time blob base fee derived from the latest block's excess_blob_gas. Green = cheap, yellow = moderate, red = expensive."
                side="bottom"
              />
            </div>
          </CardHeader>
          <CardContent>
            <BlobFeeGauge latestFeeWei={latestFeeWei} ethUsd={ethUsd} />
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <TrendingDown className="h-4 w-4" />
              <h2 className="section-title">Historical Blob Cost</h2>
              <InfoTooltip
                content="24-hour rolling average of the blob base fee. Switch between network average and individual rollups to see how costs differ. The fee rises when demand exceeds 4.5 blobs/block and falls when below."
                side="bottom"
              />
              {ethUsd && <span className="ml-auto caption">24h · USD / blob</span>}
            </div>
          </CardHeader>
          <CardContent>
            <BlobFeeLineChartSelector
              networkData={market24h}
              rollups={leaderboard.filter(r => r.rollup !== "UNKNOWN").map(r => r.rollup)}
              rollupFeeData={rollupFeeData}
              ethUsd={ethUsd ?? undefined}
            />
          </CardContent>
        </Card>
      </div>

      {/* Row 2: Secondary 3-col — Blobs/Block + Rollup Share + Regime History */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <h2 className="section-title">Blobs per Block</h2>
              <InfoTooltip
                content="Blob count per hourly bucket over the last 24 hours. Post-Pectra max is 9 blobs/block. Color shows market regime: green = healthy, yellow = congested, red = spike."
                side="bottom"
              />
            </div>
          </CardHeader>
          <CardContent>
            <BlobsPerBlockChart data={market24h} />
          </CardContent>
        </Card>

        <RollupShareCard initialData={leaderboard} />

        {/* Regime History mini-card */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              <h2 className="section-title">Regime History</h2>
              <InfoTooltip
                content="Each colored segment = 1 hour. Shows how the blob fee market regime has shifted over the last 24 hours. Green = healthy, yellow = congested, red = spike, dark = quiet."
                side="bottom"
              />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <RegimeBadge maxBlobsInBlock={latestMaxBlobs} size="lg" />
            <MarketRegimeTimeline data={market24h} />
            <p className="text-[10px] text-muted-foreground">
              Last {market24h.length} hours
            </p>
            <div className="space-y-1.5">
              {REGIME_ORDER.filter((r) => regimeCounts[r]).map((regime) => (
                <div key={regime} className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 text-muted-foreground capitalize">
                    <span className="inline-block h-1.5 w-1.5 rounded-full shrink-0" style={{ backgroundColor: REGIME_DOT[regime] }} />
                    {regime}
                  </span>
                  <span className="font-mono text-foreground">{regimeCounts[regime]}h</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Row 3: 24h Snapshot stats strip */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Activity className="h-4 w-4" />
            <h2 className="section-title">24h Snapshot</h2>
            <InfoTooltip
              content="Key aggregate metrics for the last 24 hours across all rollups tracked by BlobLens."
              side="bottom"
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-x-8 gap-y-3 sm:grid-cols-4">
            {[
              { label: "Total blobs",      value: formatNumber(totalBlobs24h) },
              { label: "Avg utilization",  value: `${avgUtil24h}%` },
              { label: "Top rollup",        value: topRollup },
              { label: "Active rollups",   value: String(activeRollups) },
            ].map(({ label, value }) => (
              <div key={label}>
                <p className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground font-medium">{label}</p>
                <p className="mt-0.5 font-mono text-base font-semibold text-foreground truncate">{value}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Row 4: 30d Volume */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <h2 className="section-title">Total Blobs — 30d</h2>
            <InfoTooltip
              content="Stacked area chart of daily blob submissions by rollup over 30 days. Watch for step-changes indicating protocol upgrades or rollup launches."
              side="bottom"
            />
          </div>
        </CardHeader>
        <CardContent>
          <RollupVolumeAreaChart data={dailyRollups} />
        </CardContent>
      </Card>

      {/* Row 5: Cost Heatmap (conditional) */}
      {ethUsd && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <h2 className="section-title">Cost Heatmap · 7d × 24h</h2>
              <InfoTooltip
                content="Each cell = 1 hour across 7 days. Darker = more expensive. Use this to find recurring cheap submission windows — typically early morning UTC."
                side="bottom"
              />
            </div>
          </CardHeader>
          <CardContent>
            <CostHeatmap data={market} ethUsd={ethUsd} />
          </CardContent>
        </Card>
      )}

      {/* Row 6: Live Feed CTA */}
      <Link href="/live" className="group block">
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
  );
}
