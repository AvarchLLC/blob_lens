import { BlobFeeLineChart } from "@/components/charts/BlobFeeLineChart";
import { BlobsPerBlockChart } from "@/components/charts/BlobsPerBlockChart";
import { BlobUtilizationChart } from "@/components/charts/BlobUtilizationChart";
import { CongestionForecast } from "@/components/charts/CongestionForecast";
import { FeeBlobScatter } from "@/components/charts/FeeBlobScatter";
import { RegimeHeatmap } from "@/components/charts/RegimeHeatmap";
import { RegimeBadge } from "@/components/shared/RegimeBadge";
import { StatCard } from "@/components/shared/StatCard";
import { TopBar } from "@/components/shared/TopBar";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { blobCostUsd, formatUsd, getEthPrice } from "@/lib/ethPrice";
import { getForecastData, getLeaderboard, getMarketActivity } from "@/lib/queries";
import { formatNumber } from "@/lib/utils";

export const revalidate = 30;

export default async function MarketPage() {
  const [market, leaderboard, ethUsd, forecast] = await Promise.all([
    getMarketActivity(24).catch(() => []),
    getLeaderboard(1).catch(() => []),
    getEthPrice(),
    getForecastData().catch(() => null),
  ]);

  const latest = market[market.length - 1];
  const topRollup = leaderboard[0]?.rollup ?? "—";
  const totalBlobsLastHour = market.slice(-1).reduce((s, m) => s + Number(m.blob_count), 0);
  const avgUtilization = market.length
    ? (market.reduce((s, m) => s + Number(m.avg_utilization), 0) / market.length).toFixed(1)
    : "—";

  return (
    <div className="flex flex-col">
      <TopBar
        title="Market"
        subtitle="Blob fee market · live · 24h window"
        right={
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 caption text-[#10B981]">
              <span className="pulse-dot" />
              refreshes every 30s
            </span>
            <RegimeBadge maxBlobsInBlock={latest?.max_blobs_in_block ?? 0} size="sm" />
          </div>
        }
      />

      <div className="space-y-6 px-6 py-4">
        <section className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatCard
            label="Cost / Blob (last hr)"
            value={
              latest && Number(latest.avg_fee) > 0
                ? ethUsd != null
                  ? formatUsd(blobCostUsd(latest.avg_fee, ethUsd))
                  : `${(Number(latest.avg_fee) / 1e9).toFixed(4)} gwei`
                : "—"
            }
            sub="avg blob base fee"
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
              <BlobFeeLineChart data={market} ethUsd={ethUsd ?? undefined} />
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
          {forecast && forecast.current_fee_wei > 0 && (
            <Card>
              <CardHeader>
                <h2 className="section-title">Fee Congestion Forecast</h2>
              </CardHeader>
              <CardContent>
                <CongestionForecast data={forecast} />
              </CardContent>
            </Card>
          )}

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
              <FeeBlobScatter data={market} ethUsd={ethUsd} />
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  );
}
