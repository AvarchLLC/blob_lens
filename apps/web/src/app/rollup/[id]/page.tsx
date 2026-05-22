import { RollupActivityHeatmap } from "@/components/charts/RollupActivityHeatmap";
import { RollupMetricLineChart } from "@/components/charts/RollupMetricLineChart";
import { InfoTooltip } from "@/components/shared/InfoTooltip";
import { RollupBadge } from "@/components/shared/RollupBadge";
import { RollupTxTable } from "@/components/shared/RollupTxTable";
import { PageHeader, PageSection } from "@/components/shared/PageHeader";
import { MetricCard } from "@/components/shared/MetricCard";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getEthPrice } from "@/lib/ethPrice";
import { getL1Costs, getLeaderboard, getMarketActivity, getRollupTransactions } from "@/lib/queries";
import { formatNumber, timeAgo } from "@/lib/utils";
import type { BlobTransaction, HourlyRollupValue, MarketHour } from "@/types";
import { notFound } from "next/navigation";

export const revalidate = 30;

interface Props {
  params: Promise<{ id: string }>;
}

const REGIME_COLOR: Record<string, string> = {
  undersaturated: "#71717A",
  healthy: "#00A86B",
  congested: "#F5A524",
  spike: "#E5484D",
};

function toMarketHours(txs: BlobTransaction[]): MarketHour[] {
  const map = new Map<string, { sum: number; count: number; blobs: number; maxBlobs: number }>();
  for (const tx of txs) {
    const d = new Date(tx.created_at);
    d.setMinutes(0, 0, 0);
    const key = d.toISOString();
    const fee = Number(tx.blob_base_fee);
    const e = map.get(key);
    if (e) {
      e.sum += fee;
      e.count += 1;
      e.blobs += tx.num_blobs;
      e.maxBlobs = Math.max(e.maxBlobs, tx.num_blobs);
    } else {
      map.set(key, { sum: fee, count: 1, blobs: tx.num_blobs, maxBlobs: tx.num_blobs });
    }
  }
  return Array.from(map.entries())
    .map(([hour, v]) => ({
      hour,
      tx_count: v.count,
      blob_count: v.blobs,
      max_blobs_in_block: v.maxBlobs,
      avg_fee: String(v.count > 0 ? v.sum / v.count : 0),
      avg_utilization: 0,
    }))
    .sort((a, b) => a.hour.localeCompare(b.hour));
}

function buildFeeComparison(
  rollupName: string,
  txs: BlobTransaction[],
  market: MarketHour[]
): HourlyRollupValue[] {
  const rollupMap = new Map<string, { sum: number; count: number }>();
  for (const tx of txs) {
    const fee = Number(tx.blob_base_fee);
    if (fee <= 0) continue;
    const d = new Date(tx.created_at);
    d.setMinutes(0, 0, 0);
    const key = d.toISOString();
    const e = rollupMap.get(key);
    if (e) { e.sum += fee; e.count += 1; }
    else rollupMap.set(key, { sum: fee, count: 1 });
  }
  const rollupSeries: HourlyRollupValue[] = Array.from(rollupMap.entries()).map(([hour, v]) => ({
    rollup: rollupName,
    hour,
    value: v.sum / v.count,
  }));
  const networkSeries: HourlyRollupValue[] = market
    .filter((m) => Number(m.avg_fee) > 0)
    .map((m) => ({ rollup: "Network Avg", hour: m.hour, value: Number(m.avg_fee) }));
  return [...rollupSeries, ...networkSeries].sort((a, b) => a.hour.localeCompare(b.hour));
}

function ScoreBar({ label, value, peerAvg, tooltip }: {
  label: string;
  value: number;
  peerAvg: number;
  tooltip: string;
}) {
  const pct = Math.min(100, Math.max(0, value));
  const isHigh = pct >= 80; const isMid = pct >= 50;
  const color = isHigh ? REGIME_COLOR.healthy : isMid ? REGIME_COLOR.congested : REGIME_COLOR.spike;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] uppercase font-bold tracking-wider text-text-secondary">{label}</span>
          <InfoTooltip content={tooltip} side="right" />
        </div>
        <div className="flex items-center gap-2 text-xs font-mono font-bold">
          <span style={{ color }}>{pct.toFixed(0)}</span>
          {peerAvg > 0 && (
            <span className="text-text-secondary opacity-50">/ {peerAvg.toFixed(0)} avg</span>
          )}
        </div>
      </div>
      <div className="relative h-2 w-full overflow-hidden rounded-full bg-surface-elevated">
        {peerAvg > 0 && (
          <div
            className="absolute top-0 h-full w-px bg-border z-10"
            style={{ left: `${Math.min(100, peerAvg)}%` }}
          />
        )}
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

export default async function RollupPage({ params }: Props) {
  const { id } = await params;
  const rollupName = decodeURIComponent(id);

  const [txs, ethUsd, leaderboard, market72h, l1Costs] = await Promise.all([
    getRollupTransactions(rollupName).catch(() => null),
    getEthPrice(),
    getLeaderboard(168).catch(() => []),
    getMarketActivity(72).catch(() => []),
    getL1Costs(7).catch(() => []),
  ]);
  if (!txs || txs.length === 0) notFound();

  const latestL1 = l1Costs[l1Costs.length - 1] || null;

  const totalBlobs = txs.reduce((s, t) => s + t.num_blobs, 0);
  const avgBlobsPerTx = totalBlobs / txs.length;
  const firstSeen = txs[txs.length - 1].created_at;
  const lastSeen = txs[0].created_at;
  const marketHours = toMarketHours(txs);
  const feeComparison = buildFeeComparison(rollupName, txs, market72h);

  // DA efficiency data from leaderboard
  const thisRollupLb = leaderboard.find((r) => r.rollup === rollupName);
  const peers = leaderboard.filter((r) => r.rollup !== "UNKNOWN" && r.rollup !== rollupName);
  const peerAvgEfficiency = peers.length
    ? peers.reduce((s, r) => s + Number(r.efficiency_score), 0) / peers.length
    : 0;
  const peerAvgPacking = peers.length
    ? peers.reduce((s, r) => s + Number(r.packing_score), 0) / peers.length
    : 0;
  const peerAvgTiming = peers.length
    ? peers.reduce((s, r) => s + Number(r.timing_score), 0) / peers.length
    : 0;
  const peerAvgCostGwei = peers.length
    ? peers.reduce((s, r) => s + Number(r.cost_per_blob_gwei), 0) / peers.length
    : 0;

  const effScore = thisRollupLb ? Number(thisRollupLb.efficiency_score) : null;
  const packScore = thisRollupLb ? Number(thisRollupLb.packing_score) : null;
  const timeScore = thisRollupLb ? Number(thisRollupLb.timing_score) : null;
  const costGwei = thisRollupLb ? Number(thisRollupLb.cost_per_blob_gwei) : null;
  const coordScore = thisRollupLb ? Number(thisRollupLb.coordination_score) : null;
  const costPerByte = thisRollupLb ? Number(thisRollupLb.cost_per_byte_eth) : null;

  const effIsHigh = effScore != null && effScore >= 80;
  const effIsMid = effScore != null && effScore >= 50;
  const effColor = effIsHigh ? REGIME_COLOR.healthy : effIsMid ? REGIME_COLOR.congested : REGIME_COLOR.spike;

  return (
    <div className="animate-page-in">
      <PageHeader
        meta="Rollup Performance"
        title={rollupName}
        summary={`Detailed analysis of ${rollupName}'s blob market performance. Track data availability efficiency, batching rhythm, and historical fee optimization.`}
      >
        <RollupBadge rollup={rollupName} linkable={false} />
      </PageHeader>

      {/* ── Metric cards ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        <MetricCard
          label="Total Blobs (500tx)"
          value={formatNumber(totalBlobs)}
          note="Combined volume across recent submissions."
        />
        <MetricCard
          label="Transactions"
          value={formatNumber(txs.length)}
          note="Number of indexed type-3 transactions."
        />
        <MetricCard
          label="Avg Blobs / TX"
          value={avgBlobsPerTx.toFixed(2)}
          note="Packing efficiency. Higher = better (max 6)."
        />
        <MetricCard
          label="Last Active"
          value={timeAgo(lastSeen)}
          note={`Latest: ${new Date(lastSeen).toLocaleTimeString()}`}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">

        {/* Left Column */}
        <div className="xl:col-span-8 space-y-12">

          <PageSection
            label="Performance"
            title="DA Efficiency Analysis"
            description="Composite scoring of market timing and packing efficiency."
            interpretation="A high efficiency score indicates that the rollup is both packing multiple blobs into each transaction and timing submissions during low-fee market regimes."
          >
            {thisRollupLb && effScore != null ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                <div className="flex items-center gap-8">
                  <div
                    className="flex h-24 w-24 shrink-0 items-center justify-center rounded-xl border-2 text-4xl font-bold font-mono bg-surface-elevated shadow-inner"
                    style={{ color: effColor, borderColor: effColor }}
                  >
                    {effScore.toFixed(0)}
                  </div>
                  <div>
                    <h4 className="text-lg font-bold mb-1" style={{ color: effColor }}>
                      {effIsHigh ? "Institutional Grade" : effIsMid ? "Optimal Efficiency" : "Needs Optimization"}
                    </h4>
                    <p className="text-xs text-text-secondary">
                      Peer Average: <span className="font-mono font-bold text-text-primary">{peerAvgEfficiency.toFixed(0)}</span>
                    </p>
                    <p className="text-[10px] text-text-secondary mt-2 opacity-50 uppercase tracking-widest font-bold">
                      70% Packing · 30% Timing
                    </p>
                  </div>
                </div>

                <div className="space-y-6">
                  <ScoreBar
                    label="Packing score"
                    value={packScore ?? 0}
                    peerAvg={peerAvgPacking}
                    tooltip="Efficiency of blob slot usage per transaction."
                  />
                  <ScoreBar
                    label="Timing score"
                    value={timeScore ?? 0}
                    peerAvg={peerAvgTiming}
                    tooltip="Market timing relative to network average fee."
                  />
                  <ScoreBar
                    label="Coordination"
                    value={coordScore ?? 0}
                    peerAvg={0}
                    tooltip="Average co-occurrence weight with peer rollups. Higher indicates more regular coordination in same blocks."
                  />
                  <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border/50">
                    {costGwei != null && (
                      <div className="flex flex-col gap-1">
                        <span className="text-[9px] uppercase font-bold tracking-[0.2em] text-text-secondary">Avg Cost / Blob</span>
                        <div className="flex flex-col">
                          <span className="font-mono text-sm font-bold text-text-primary">{costGwei.toFixed(5)} Gwei</span>
                          <p className="text-[10px] text-text-secondary opacity-40">vs {peerAvgCostGwei.toFixed(5)} avg</p>
                        </div>
                      </div>
                    )}
                    {costPerByte != null && (
                      <div className="flex flex-col gap-1">
                        <span className="text-[9px] uppercase font-bold tracking-[0.2em] text-text-secondary">DA Cost / KB</span>
                        <div className="flex flex-col">
                          <span className="font-mono text-sm font-bold text-text-primary">{costPerByte.toFixed(6)} ETH</span>
                          {ethUsd && <p className="text-[10px] text-text-secondary opacity-40">~ {formatUsd(costPerByte * ethUsd)}</p>}
                        </div>
                      </div>
                    )}
                    {costGwei != null && latestL1 && (
                      <div className="flex flex-col gap-1 col-span-2 pt-4 border-t border-border/20">
                         <span className="text-[9px] uppercase font-bold tracking-[0.2em] text-primary">Efficiency Gain (vs L1)</span>
                         <div className="flex items-center gap-2">
                            <span className="font-mono text-sm font-bold text-text-primary">
                               {((latestL1.avg_usd_per_tx / ((costGwei * 131072 / 1e18) * (ethUsd || 0))) || 0).toFixed(0)}x cheaper
                            </span>
                            <span className="text-[10px] text-text-secondary opacity-40">than standard L1 ETH transfer</span>
                         </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-10 text-center text-text-secondary opacity-40 italic text-sm">Insufficient data for scoring.</div>
            )}
          </PageSection>

          <PageSection
            label="Behavior"
            title="Activity & Fees"
            description="Operational rhythm and cost benchmarking."
            noPadding
          >
            <Tabs defaultValue="activity" className="w-full">
              <TabsList className="flex gap-1 p-2 bg-sidebar/50 border-b border-border rounded-none h-12">
                <TabsTrigger value="activity" className="flex-1 rounded-sm text-xs font-bold uppercase tracking-wider">Rhythm</TabsTrigger>
                <TabsTrigger value="fees" className="flex-1 rounded-sm text-xs font-bold uppercase tracking-wider">Benchmarking</TabsTrigger>
                <TabsTrigger value="transactions" className="flex-1 rounded-sm text-xs font-bold uppercase tracking-wider">Raw Feed</TabsTrigger>
              </TabsList>

              <div className="p-6">
                <TabsContent value="activity" className="space-y-10 animate-fade-up m-0">
                  <div>
                    <h4 className="text-[10px] font-bold uppercase tracking-widest text-text-secondary mb-4 opacity-60">Submission Intensity (7d)</h4>
                    <RollupActivityHeatmap txs={txs} />
                  </div>
                  <div className="pt-10 border-t border-border/50">
                    <h4 className="text-[10px] font-bold uppercase tracking-widest text-text-secondary mb-4 opacity-60">Hourly Submission Volume</h4>
                    <RollupMetricLineChart data={feeComparison} mode="fee-wei" />
                  </div>
                </TabsContent>

                <TabsContent value="fees" className="animate-fade-up m-0">
                  <div className="space-y-6">
                    <h4 className="text-[10px] font-bold uppercase tracking-widest text-text-secondary mb-4 opacity-60">Fee Paid vs. Network Average</h4>
                    <RollupMetricLineChart data={feeComparison} mode="fee-wei" />
                    <div className="p-4 bg-primary/5 border border-primary/10 rounded-md">
                      <p className="text-xs text-text-secondary leading-relaxed">
                        <span className="font-bold text-text-primary mr-1">Analysis:</span> When the rollup line persists below the Network Average, the sequencer is successfully avoiding congestion spikes and saving on DA costs.
                      </p>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="transactions" className="animate-fade-up m-0">
                  <div className="max-h-[600px] overflow-y-auto custom-scrollbar -mx-6">
                    <RollupTxTable txs={txs} ethUsd={ethUsd} />
                  </div>
                </TabsContent>
              </div>
            </Tabs>
          </PageSection>
        </div>

        {/* Right Column */}
        <div className="xl:col-span-4 space-y-8">
          <div className="p-8 surface border border-border space-y-6">
            <h3 className="text-sm font-bold uppercase tracking-widest text-text-primary">Sequencer Identity</h3>
            <div className="space-y-4">
              <div className="flex flex-col gap-1">
                <span className="text-[9px] font-bold text-text-secondary uppercase tracking-widest opacity-60">Registry Name</span>
                <span className="text-sm font-medium text-text-primary">{rollupName}</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[9px] font-bold text-text-secondary uppercase tracking-widest opacity-60">Status</span>
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-status-healthy animate-pulse" />
                  <span className="text-xs text-text-secondary font-medium">Tracking Active</span>
                </div>
              </div>
              <div className="pt-4 border-t border-border/50">
                <button className="w-full py-2.5 bg-surface-elevated border border-border hover:bg-surface transition-colors rounded-md text-[10px] font-bold uppercase tracking-widest text-text-primary">
                  Export Rollup Data (CSV)
                </button>
              </div>
            </div>
          </div>

          <div className="p-8 border border-primary/20 bg-primary/5 rounded-xl">
            <h3 className="text-sm font-bold uppercase tracking-widest text-text-primary mb-3">Governance Impact</h3>
            <p className="text-xs text-text-secondary leading-relaxed">
              {rollupName}&apos;s batching strategy accounts for roughly {thisRollupLb ? Number(thisRollupLb.network_share_pct).toFixed(1) : '—'}% of total Ethereum blob volume. Optimization here directly impacts L1 state growth and fee burning.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
