import { BlobFeeLineChart } from "@/components/charts/BlobFeeLineChart";
import { BlobsPerBlockChart } from "@/components/charts/BlobsPerBlockChart";
import { BlobUtilizationChart } from "@/components/charts/BlobUtilizationChart";
import { CongestionForecast } from "@/components/charts/CongestionForecast";
import { L1vsBlobFeeChart } from "@/components/charts/L1vsBlobFeeChart";
import { RegimeHeatmap } from "@/components/charts/RegimeHeatmap";
import { RollupActivityLineChart } from "@/components/charts/RollupActivityLineChart";
import { RollupMetricLineChart } from "@/components/charts/RollupMetricLineChart";
import { RollupNetworkGraphD3 } from "@/components/charts/RollupNetworkGraphD3";
import { InfoTooltip } from "@/components/shared/InfoTooltip";
import { RegimeAlertPanel } from "@/components/shared/RegimeAlertPanel";
import { RegimeBadge } from "@/components/shared/RegimeBadge";
import { StatCard } from "@/components/shared/StatCard";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { blobCostUsd, formatUsd, getEthPrice } from "@/lib/ethPrice";
import { getHourlyL1Fee } from "@/lib/l1Fee";
import {
  getForecastData,
  getHourlyRollupActivity,
  getHourlyRollupFee,
  getHourlyRollupUtilization,
  getLeaderboard,
  getMarketActivity,
  getRollupNetworkGraph,
} from "@/lib/queries";
import { classifyRegime, formatNumber } from "@/lib/utils";

export const revalidate = 30;

export default async function MarketPage() {
  const [market24h, market7d, leaderboard, ethUsd, forecast, rollupActivity, rollupFee, rollupUtil, networkGraph, l1FeeData] =
    await Promise.all([
      getMarketActivity(24).catch(() => []),
      getMarketActivity(168).catch(() => []),
      getLeaderboard(1).catch(() => []),
      getEthPrice(),
      getForecastData().catch(() => null),
      getHourlyRollupActivity(24, 10).catch(() => []),
      getHourlyRollupFee(24, 10).catch(() => []),
      getHourlyRollupUtilization(24, 10).catch(() => []),
      getRollupNetworkGraph(24).catch(() => ({ nodes: [], edges: [] })),
      getHourlyL1Fee(24).catch(() => []),
    ]);

  // Use market as alias for market24h where needed
  const market = market24h;

  const latest = market[market.length - 1];
  const topRollup = leaderboard[0]?.rollup ?? "—";
  const totalBlobsLastHour = market.slice(-1).reduce((s, m) => s + Number(m.blob_count), 0);
  const avgUtilization = market.length
    ? (market.reduce((s, m) => s + Number(m.avg_utilization), 0) / market.length).toFixed(1)
    : "—";

  const regimeName = classifyRegime(latest?.max_blobs_in_block ?? 0);
  const regimeColors: Record<string, { bg: string; border: string; text: string }> = {
    undersaturated: { bg: "rgba(63,63,70,0.08)",   border: "rgba(63,63,70,0.2)",    text: "#71717a" },
    healthy:        { bg: "rgba(0,223,129,0.06)",   border: "rgba(0,223,129,0.18)",  text: "#00df81" },
    congested:      { bg: "rgba(252,187,0,0.06)",   border: "rgba(252,187,0,0.18)",  text: "#fcbb00" },
    spike:          { bg: "rgba(251,44,54,0.06)",   border: "rgba(251,44,54,0.18)",  text: "#fb2c36" },
  };
  const rc = regimeColors[regimeName];

  return (
    <div className="page-root py-8 space-y-6">
      {/* ── Header ── */}
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

      {/* ── Regime banner ── */}
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
            Blob fee market is currently{" "}
            <span className="font-bold uppercase tracking-wide">{regimeName}</span>
          </span>
          <span className="text-sm text-[#4B5563] ml-auto hidden sm:block">
            {latest.max_blobs_in_block} blobs/block · Auto-refreshes every 30s
          </span>
        </div>
      )}

      {/* ── Stat cards ── */}
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
          tooltip="Average blob base fee in the most recent hour. EIP-4844 blob fees are set by the protocol — they rise exponentially when blocks fill above 4.5 blobs and fall when below."
        />
        <StatCard
          label="Blobs (last hr)"
          value={formatNumber(totalBlobsLastHour)}
          tooltip="Total EIP-4844 blobs submitted in the most recent hourly bucket. Each blob holds ~128 KB of L2 state data."
        />
        <StatCard
          label="Avg Utilization (24h)"
          value={avgUtilization === "—" ? "—" : `${avgUtilization}%`}
          sub="target: 50%"
          tooltip="Average percentage of the 9-blob block capacity used over 24 hours. 50% is the EIP-4844 equilibrium target. Above 80% means fee pressure is building."
        />
        <StatCard
          label="Most Active"
          value={topRollup}
          tooltip="Rollup with the most blob submissions in the last hour, by transaction count."
        />
      </section>

      {/* ═══════════════════════════════════════════
          SECTION 1: Regime Analysis
      ═══════════════════════════════════════════ */}
      <div className="space-y-4">
        <h2 className="text-xs uppercase tracking-[0.10em] text-muted-foreground font-semibold px-0.5">
          Regime Analysis
        </h2>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <h2 className="section-title">Regime Heatmap · 24h</h2>
              <InfoTooltip
                content="Hour-by-hour market state over 24 hours. Regimes: Quiet (<20%), Healthy (20–80%), Congested (80–95%), Spike (>95%). Use this to spot recurring congestion windows."
                side="bottom"
              />
            </div>
          </CardHeader>
          <CardContent>
            <RegimeHeatmap data={market} />
          </CardContent>
        </Card>

      </div>

      {/* ═══════════════════════════════════════════
          SECTION 2: Fee & Block Data
      ═══════════════════════════════════════════ */}
      <div className="space-y-4">
        <h2 className="text-xs uppercase tracking-[0.10em] text-muted-foreground font-semibold px-0.5">
          Fee &amp; Block Data
        </h2>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <h2 className="section-title">Blob Base Fee Trend</h2>
                <InfoTooltip
                  content="Hourly average blob base fee over 24 hours. The fee rises exponentially when blocks fill above 4.5 blobs and falls when below. Shows cost trends for rollup operators planning submissions."
                  side="bottom"
                />
              </div>
            </CardHeader>
            <CardContent>
              <BlobFeeLineChart data={market} ethUsd={ethUsd ?? undefined} />
            </CardContent>
          </Card>

          {ethUsd != null && l1FeeData.length > 0 && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <h2 className="section-title">Blob DA vs L1 Calldata Cost</h2>
                  <InfoTooltip
                    content="Cost comparison for posting 128 KB of data: blob DA (EIP-4844) vs equivalent L1 calldata (16 gas/byte). Both normalized to USD. The gap shows how much cheaper blobs are than pre-4844 rollup costs."
                    side="bottom"
                  />
                </div>
              </CardHeader>
              <CardContent>
                <L1vsBlobFeeChart blobData={market} l1Data={l1FeeData} ethUsd={ethUsd} />
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <h2 className="section-title">Blobs per Block</h2>
                <InfoTooltip
                  content="Blob count per hourly bucket. Max is 9 (post-Pectra). Color shows market regime: green = healthy, yellow = congested, red = spike."
                  side="bottom"
                />
              </div>
            </CardHeader>
            <CardContent>
              <BlobsPerBlockChart data={market} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <h2 className="section-title">Slot Utilization</h2>
                <InfoTooltip
                  content="Average blob slot utilization per hour. Dashed line = 50% EIP-4844 target. Above 80% = fee pressure building."
                  side="bottom"
                />
              </div>
            </CardHeader>
            <CardContent>
              <BlobUtilizationChart data={market} />
            </CardContent>
          </Card>

          {forecast && forecast.current_fee_wei > 0 && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <h2 className="section-title">Fee Congestion Forecast</h2>
                  <InfoTooltip
                    content="Short-term fee projection using the EIP-4844 exponential formula applied to the last 50 blocks. Use this to decide whether to submit blobs now or wait."
                    side="bottom"
                  />
                </div>
              </CardHeader>
              <CardContent>
                <CongestionForecast data={forecast} />
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* ═══════════════════════════════════════════
          SECTION 3: Rollup Activity
      ═══════════════════════════════════════════ */}
      <div className="space-y-4">
        <h2 className="text-xs uppercase tracking-[0.10em] text-muted-foreground font-semibold px-0.5">
          Rollup Activity
        </h2>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <h2 className="section-title">Blob Activity by Rollup</h2>
                <InfoTooltip
                  content="Hourly blob count per rollup over 24 hours. Reveals submission rhythm — some rollups batch at a steady cadence, others spike in bursts."
                  side="bottom"
                />
              </div>
            </CardHeader>
            <CardContent>
              {rollupActivity.length > 0
                ? <RollupActivityLineChart data={rollupActivity} />
                : <p className="py-8 text-center text-sm text-muted-foreground">No rollup data</p>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <h2 className="section-title">Fee by Rollup</h2>
                <InfoTooltip
                  content="Per-rollup blob base fee over 24 hours. Diverging lines indicate rollups timing the market differently."
                  side="bottom"
                />
              </div>
            </CardHeader>
            <CardContent>
              {rollupFee.length > 0
                ? <RollupMetricLineChart data={rollupFee} mode="fee-wei" />
                : <p className="py-8 text-center text-sm text-muted-foreground">No rollup fee data</p>}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ═══════════════════════════════════════════
          SECTION 4: Ecosystem Map
      ═══════════════════════════════════════════ */}
      <div className="space-y-4">
        <h2 className="text-xs uppercase tracking-[0.10em] text-muted-foreground font-semibold px-0.5">
          Ecosystem Map
        </h2>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <h2 className="section-title">Rollup Ecosystem Map</h2>
              <InfoTooltip
                content="Force-directed graph showing rollups and their DA market relationships. Node size = blob volume. Glow color = efficiency (green = excellent). Connections = co-occurrence in the same block."
                side="bottom"
              />
            </div>
          </CardHeader>
          <CardContent>
            {networkGraph.nodes.length > 0 ? (
              <RollupNetworkGraphD3 data={networkGraph} />
            ) : (
              <div className="h-[500px] flex items-center justify-center text-muted-foreground">No network data available</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ═══════════════════════════════════════════
          SECTION 4: Operator Alerts (collapsed)
      ═══════════════════════════════════════════ */}
      <RegimeAlertPanel />
    </div>
  );
}
