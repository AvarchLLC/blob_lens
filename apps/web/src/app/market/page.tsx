import { BlobFeeLineChart } from "@/components/charts/BlobFeeLineChart";
import { BlobsPerBlockChart } from "@/components/charts/BlobsPerBlockChart";
import { BlobUtilizationChart } from "@/components/charts/BlobUtilizationChart";
import { FeeBlobScatter } from "@/components/charts/FeeBlobScatter";
import { RegimeHeatmap } from "@/components/charts/RegimeHeatmap";
import { AppHeader } from "@/components/shared/AppHeader";
import { RegimeBadge } from "@/components/shared/RegimeBadge";
import { StatCard } from "@/components/shared/StatCard";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { getLeaderboard, getMarketActivity } from "@/lib/queries";
import { formatFee, formatNumber } from "@/lib/utils";

export const revalidate = 30;

export default async function MarketPage() {
  const [market, leaderboard] = await Promise.all([
    getMarketActivity(24).catch(() => []),
    getLeaderboard(1).catch(() => []),
  ]);

  const latest = market[market.length - 1];
  const topRollup = leaderboard[0]?.rollup ?? "—";
  const totalBlobsLastHour = market.slice(-1).reduce((s, m) => s + Number(m.blob_count), 0);
  const avgUtilization = market.length
    ? (market.reduce((s, m) => s + Number(m.avg_utilization), 0) / market.length).toFixed(1)
    : "—";

  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader active="market" regimeBadge={<RegimeBadge maxBlobsInBlock={latest?.max_blobs_in_block ?? 0} size="sm" />} />

      <main className="mx-auto w-full max-w-7xl flex-1 space-y-8 px-4 py-8 sm:px-6 lg:px-8">
        <section className="flex items-center justify-end gap-2 text-xs text-[#9D93B8]">
          <span className="pulse-dot" />
          Auto-refreshes every 30s
        </section>

        <section className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatCard
            label="Base Fee (last hr)"
            value={latest ? formatFee(latest.avg_fee) : "—"}
            sub="actual blob base fee"
          />
          <StatCard label="Blobs (last hr)" value={formatNumber(totalBlobsLastHour)} />
          <StatCard
            label="Avg Utilization (24h)"
            value={avgUtilization === "—" ? "—" : `${avgUtilization}%`}
            sub="target: 50%"
          />
          <StatCard label="Most Active" value={topRollup} />
        </section>

        <Card>
          <CardHeader>
            <h2 className="section-title">Regime Heatmap</h2>
          </CardHeader>
          <CardContent>
            <RegimeHeatmap data={market} />
          </CardContent>
        </Card>

        <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <h2 className="section-title">Blob Base Fee Trend</h2>
            </CardHeader>
            <CardContent>
              <BlobFeeLineChart data={market} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <h2 className="section-title">Blob Slot Utilization</h2>
            </CardHeader>
            <CardContent>
              <BlobUtilizationChart data={market} />
            </CardContent>
          </Card>
        </section>

        <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <h2 className="section-title">Blobs per Block</h2>
            </CardHeader>
            <CardContent>
              <BlobsPerBlockChart data={market} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <h2 className="section-title">Fee vs Blob Count</h2>
            </CardHeader>
            <CardContent>
              <FeeBlobScatter data={market} />
            </CardContent>
          </Card>
        </section>
      </main>
    </div>
  );
}
