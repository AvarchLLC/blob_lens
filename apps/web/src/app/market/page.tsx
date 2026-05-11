import { BlobFeeLineChart } from "@/components/charts/BlobFeeLineChart";
import { BlobsPerBlockChart } from "@/components/charts/BlobsPerBlockChart";
import { BlobUtilizationChart } from "@/components/charts/BlobUtilizationChart";
import { CongestionForecast } from "@/components/charts/CongestionForecast";
import { FeeBlobScatter } from "@/components/charts/FeeBlobScatter";
import { MarketRegimeTimeline } from "@/components/charts/MarketRegimeTimeline";
import { RegimeHeatmap } from "@/components/charts/RegimeHeatmap";
import { RollupActivityLineChart } from "@/components/charts/RollupActivityLineChart";
import { RollupMetricLineChart } from "@/components/charts/RollupMetricLineChart";
import { InfoTooltip } from "@/components/shared/InfoTooltip";
import { RegimeAlertPanel } from "@/components/shared/RegimeAlertPanel";
import { RegimeBadge } from "@/components/shared/RegimeBadge";
import { StatCard } from "@/components/shared/StatCard";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { blobCostUsd, formatUsd, getEthPrice } from "@/lib/ethPrice";
import {
  getForecastData,
  getHourlyRollupActivity,
  getHourlyRollupFee,
  getHourlyRollupUtilization,
  getLeaderboard,
  getMarketActivity,
} from "@/lib/queries";
import { classifyRegime, formatNumber } from "@/lib/utils";

export const revalidate = 30;

export default async function MarketPage() {
  const [market24h, market7d, leaderboard, ethUsd, forecast, rollupActivity, rollupFee, rollupUtil] =
    await Promise.all([
      getMarketActivity(24).catch(() => []),
      getMarketActivity(168).catch(() => []),
      getLeaderboard(1).catch(() => []),
      getEthPrice(),
      getForecastData().catch(() => null),
      getHourlyRollupActivity(24, 10).catch(() => []),
      getHourlyRollupFee(24, 10).catch(() => []),
      getHourlyRollupUtilization(24, 10).catch(() => []),
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

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <h2 className="section-title">Regime Timeline · 7d</h2>
              <InfoTooltip
                content="7-day continuous regime history. Each segment = 1 hour. Shows how often the market has been in each state and whether congestion is becoming more frequent over time."
                side="bottom"
              />
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            <MarketRegimeTimeline data={market7d} />
            <div className="flex items-center gap-4 pt-1">
              {(["healthy", "congested", "spike", "undersaturated"] as const).map((r) => {
                const color = { healthy: "#00df81", congested: "#fcbb00", spike: "#fb2c36", undersaturated: "#3f3f46" }[r];
                const count = market7d.filter((m) => classifyRegime(m.max_blobs_in_block) === r).length;
                return (
                  <span key={r} className="flex items-center gap-1.5 text-[10px] text-muted-foreground capitalize">
                    <span className="h-2 w-2 rounded-sm shrink-0" style={{ backgroundColor: color }} />
                    {r}
                    <span className="font-mono text-foreground">{count}h</span>
                  </span>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ═══════════════════════════════════════════
          SECTION 2: Market Structure (per-rollup)
      ═══════════════════════════════════════════ */}
      <div className="space-y-4">
        <h2 className="text-xs uppercase tracking-[0.10em] text-muted-foreground font-semibold px-0.5">
          Market Structure · Per-rollup
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
                <h2 className="section-title">Blob Base Fee by Rollup</h2>
                <InfoTooltip
                  content="Per-rollup blob base fee over 24 hours. Diverging lines indicate rollups timing the market differently — rollups that consistently pay less are choosing cheaper submission windows."
                  side="bottom"
                />
              </div>
            </CardHeader>
            <CardContent>
              {rollupFee.length > 0
                ? <RollupMetricLineChart data={rollupFee} mode="fee-wei" />
                : <BlobFeeLineChart data={market} ethUsd={ethUsd ?? undefined} />}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <h2 className="section-title">Slot Utilization by Rollup</h2>
                <InfoTooltip
                  content="Percentage of available blob slots each rollup filled per hour. Post-Pectra max is 9 blobs/block. Rollups above 80% are consuming a large share and may be driving fees higher."
                  side="bottom"
                />
              </div>
            </CardHeader>
            <CardContent>
              {rollupUtil.length > 0
                ? <RollupMetricLineChart data={rollupUtil} mode="utilization-pct" />
                : <BlobUtilizationChart data={market} />}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <h2 className="section-title">Blobs per Block</h2>
                <InfoTooltip
                  content="Blob count distribution across Ethereum blocks over 24 hours. Max is 9 (post-Pectra). Clusters near 9 = competitive market; near 0 = quiet periods. Color = regime."
                  side="bottom"
                />
              </div>
            </CardHeader>
            <CardContent>
              <BlobsPerBlockChart data={market} />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ═══════════════════════════════════════════
          SECTION 3: Relationships & Forecast
      ═══════════════════════════════════════════ */}
      <div className="space-y-4">
        <h2 className="text-xs uppercase tracking-[0.10em] text-muted-foreground font-semibold px-0.5">
          Relationships &amp; Forecast
        </h2>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {forecast && forecast.current_fee_wei > 0 && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <h2 className="section-title">Fee Congestion Forecast</h2>
                  <InfoTooltip
                    content="Short-term fee projection using the EIP-4844 exponential formula applied to the last 50 blocks. Excess trend detects if fee pressure is building or easing. Use this to decide whether to submit blobs now or wait."
                    side="bottom"
                  />
                </div>
              </CardHeader>
              <CardContent>
                <CongestionForecast data={forecast} />
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <h2 className="section-title">Fee vs Blob Count</h2>
                <InfoTooltip
                  content="Scatter plot of hourly blob count vs average fee. A positive correlation confirms the EIP-4844 mechanism. Outliers with high fees but low counts indicate sudden spikes followed by a quick cooldown."
                  side="bottom"
                />
              </div>
            </CardHeader>
            <CardContent>
              <FeeBlobScatter data={market} ethUsd={ethUsd} />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ═══════════════════════════════════════════
          SECTION 4: Operator Alerts (collapsed)
      ═══════════════════════════════════════════ */}
      <RegimeAlertPanel />
    </div>
  );
}
