import { BlobFeeLineChart } from "@/components/charts/BlobFeeLineChart";
import { BlobsPerBlockChart } from "@/components/charts/BlobsPerBlockChart";
import { BlobUtilizationChart } from "@/components/charts/BlobUtilizationChart";
import { CongestionForecast } from "@/components/charts/CongestionForecast";
import { FeeBlobScatter } from "@/components/charts/FeeBlobScatter";
import { RegimeHeatmap } from "@/components/charts/RegimeHeatmap";
import { RollupActivityLineChart } from "@/components/charts/RollupActivityLineChart";
import { RollupMetricLineChart } from "@/components/charts/RollupMetricLineChart";
import { RegimeBadge } from "@/components/shared/RegimeBadge";
import { StatCard } from "@/components/shared/StatCard";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { blobCostUsd, formatUsd, getEthPrice } from "@/lib/ethPrice";
import { getForecastData, getHourlyRollupActivity, getHourlyRollupFee, getHourlyRollupUtilization, getLeaderboard, getMarketActivity } from "@/lib/queries";
import { classifyRegime, formatNumber } from "@/lib/utils";

export const revalidate = 30;

export default async function MarketPage() {
  const [market, leaderboard, ethUsd, forecast, rollupActivity, rollupFee, rollupUtil] = await Promise.all([
    getMarketActivity(24).catch(() => []),
    getLeaderboard(1).catch(() => []),
    getEthPrice(),
    getForecastData().catch(() => null),
    getHourlyRollupActivity(24, 10).catch(() => []),
    getHourlyRollupFee(24, 10).catch(() => []),
    getHourlyRollupUtilization(24, 10).catch(() => []),
  ]);

  const latest = market[market.length - 1];
  const topRollup = leaderboard[0]?.rollup ?? "—";
  const totalBlobsLastHour = market.slice(-1).reduce((s, m) => s + Number(m.blob_count), 0);
  const avgUtilization = market.length
    ? (market.reduce((s, m) => s + Number(m.avg_utilization), 0) / market.length).toFixed(1)
    : "—";

  const regimeName = classifyRegime(latest?.max_blobs_in_block ?? 0);
  const regimeColors: Record<string, { bg: string; border: string; text: string }> = {
    undersaturated: { bg: 'rgba(63,63,70,0.08)',   border: 'rgba(63,63,70,0.2)',    text: '#71717a' },
    healthy:        { bg: 'rgba(0,223,129,0.06)',   border: 'rgba(0,223,129,0.18)',  text: '#00df81' },
    congested:      { bg: 'rgba(252,187,0,0.06)',   border: 'rgba(252,187,0,0.18)',  text: '#fcbb00' },
    spike:          { bg: 'rgba(251,44,54,0.06)',   border: 'rgba(251,44,54,0.18)',  text: '#fb2c36' },
  };
  const rc = regimeColors[regimeName];

  return (
    <div className="page-root py-8 space-y-6">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h1 className="topbar-title">Market</h1>
          <p className="topbar-sub">Blob fee market · live · 24h window</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 caption text-[#10B981]">
            <span className="pulse-dot" />
            refreshes every 30s
          </span>
          <RegimeBadge maxBlobsInBlock={latest?.max_blobs_in_block ?? 0} size="sm" />
        </div>
      </div>

      {latest && (
        <div
          className="regime-banner"
          style={{ background: rc.bg, border: `1px solid ${rc.border}` }}
        >
          <span
            className="inline-block w-2 h-2 rounded-full flex-shrink-0"
            style={{ background: rc.text, boxShadow: `0 0 8px ${rc.text}` }}
          />
          <span className="text-sm font-medium" style={{ color: rc.text }}>
            Blob fee market is currently{' '}
            <span className="font-bold uppercase tracking-wide">{regimeName}</span>
          </span>
          <span className="text-sm text-[#4B5563] ml-auto hidden sm:block">
            {latest.max_blobs_in_block} blobs/block · Auto-refreshes every 30s
          </span>
        </div>
      )}

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
            {rollupFee.length > 0 ? (
              <RollupMetricLineChart data={rollupFee} mode="fee-wei" />
            ) : (
              <BlobFeeLineChart data={market} ethUsd={ethUsd ?? undefined} />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="section-title">Blob Slot Utilization</h2>
          </CardHeader>
          <CardContent>
            {rollupUtil.length > 0 ? (
              <RollupMetricLineChart data={rollupUtil} mode="utilization-pct" />
            ) : (
              <BlobUtilizationChart data={market} />
            )}
          </CardContent>
        </Card>
      </section>

      {rollupActivity.length > 0 && (
        <Card>
          <CardHeader>
            <h2 className="section-title">Blob Activity by Rollup (24h)</h2>
          </CardHeader>
          <CardContent>
            <RollupActivityLineChart data={rollupActivity} />
          </CardContent>
        </Card>
      )}

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
  );
}
