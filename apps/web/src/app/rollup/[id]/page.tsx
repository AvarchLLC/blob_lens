import { RollupActivityHeatmap } from "@/components/charts/RollupActivityHeatmap";
import { RollupMetricLineChart } from "@/components/charts/RollupMetricLineChart";
import { InfoTooltip } from "@/components/shared/InfoTooltip";
import { RollupBadge } from "@/components/shared/RollupBadge";
import { RollupTxTable } from "@/components/shared/RollupTxTable";
import { StatCard } from "@/components/shared/StatCard";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getEthPrice } from "@/lib/ethPrice";
import { getLeaderboard, getMarketActivity, getRollupTransactions } from "@/lib/queries";
import { formatNumber, timeAgo } from "@/lib/utils";
import type { BlobTransaction, HourlyRollupValue, MarketHour } from "@/types";
import { notFound } from "next/navigation";

export const revalidate = 30;

interface Props {
  params: Promise<{ id: string }>;
}

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
  const color = isHigh ? "#00df81" : isMid ? "#fcbb00" : "#f97316";
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-muted-foreground">{label}</span>
          <InfoTooltip content={tooltip} side="right" />
        </div>
        <div className="flex items-center gap-2 text-xs font-mono">
          <span style={{ color }}>{pct.toFixed(0)}</span>
          {peerAvg > 0 && (
            <span className="text-muted-foreground/60">vs {peerAvg.toFixed(0)} avg</span>
          )}
        </div>
      </div>
      <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-[#1E2D45]">
        {peerAvg > 0 && (
          <div
            className="absolute top-0 h-full w-0.5 bg-muted-foreground/30"
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

  const [txs, ethUsd, leaderboard, market72h] = await Promise.all([
    getRollupTransactions(rollupName).catch(() => null),
    getEthPrice(),
    getLeaderboard(168).catch(() => []),
    getMarketActivity(72).catch(() => []),
  ]);
  if (!txs || txs.length === 0) notFound();

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

  const effIsHigh = effScore != null && effScore >= 80;
  const effIsMid = effScore != null && effScore >= 50;
  const effColor = effIsHigh ? "#00df81" : effIsMid ? "#fcbb00" : "#f97316";
  const effBg = effIsHigh ? "rgba(0,223,129,0.08)" : effIsMid ? "rgba(252,187,0,0.08)" : "rgba(249,115,22,0.08)";
  const effBorder = effIsHigh ? "rgba(0,223,129,0.20)" : effIsMid ? "rgba(252,187,0,0.20)" : "rgba(249,115,22,0.20)";

  return (
    <div className="page-root py-8 space-y-6">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h1 className="topbar-title">{rollupName}</h1>
          <p className="topbar-sub">Per-rollup blob analytics · last 500 transactions</p>
        </div>
        <RollupBadge rollup={rollupName} linkable={false} />
      </div>

      <Separator />

      <section className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard
          label="Total Blobs"
          value={formatNumber(totalBlobs)}
          tooltip="Total blobs submitted by this rollup across the last 500 transactions. Each blob carries ~128 KB of L2 state data."
        />
        <StatCard
          label="Transactions"
          value={formatNumber(txs.length)}
          tooltip="Number of EIP-4844 type-3 transactions from this rollup's sequencer address in the dataset (capped at 500 most recent)."
        />
        <StatCard
          label="Avg Blobs / TX"
          value={avgBlobsPerTx.toFixed(2)}
          tooltip="Average number of blobs per transaction. Higher is more efficient — the theoretical maximum is 6 blobs per transaction. A score near 6 means the rollup is batching heavily."
        />
        <StatCard
          label="Last Active"
          value={timeAgo(lastSeen)}
          sub={new Date(lastSeen).toLocaleString()}
          tooltip="Time since this rollup's most recent blob transaction was indexed. Staleness may indicate a pause in L2 activity or a change in sequencer address."
        />
      </section>

      {/* DA Efficiency card */}
      {thisRollupLb && effScore != null && (
        <Card style={{ background: effBg, borderColor: effBorder }}>
          <CardHeader>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <h2 className="section-title">DA Efficiency</h2>
              <InfoTooltip
                content="Composite score (0–100) measuring how efficiently this rollup uses Ethereum's blob market. Formula: 70% packing score (blobs per tx relative to 6-blob max) + 30% timing score (submitting when fees are below network average). Higher = cheaper DA costs."
                side="bottom"
              />
              <span className="ml-auto text-[10px] text-muted-foreground/60">7-day window</span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              {/* Left: big score */}
              <div className="flex items-center gap-5">
                <div
                  className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl border text-3xl font-bold font-mono"
                  style={{ color: effColor, borderColor: effBorder, background: effBg }}
                >
                  {effScore.toFixed(0)}
                </div>
                <div className="space-y-0.5">
                  <p className="text-sm font-semibold" style={{ color: effColor }}>
                    {effIsHigh ? "High Efficiency" : effIsMid ? "Moderate Efficiency" : "Low Efficiency"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Peer avg: <span className="font-mono text-foreground">{peerAvgEfficiency.toFixed(0)}</span>
                  </p>
                  <p className="text-[10px] text-muted-foreground/60">
                    70% packing · 30% timing
                  </p>
                </div>
              </div>

              {/* Right: component bars */}
              <div className="space-y-4">
                <ScoreBar
                  label="Packing score"
                  value={packScore ?? 0}
                  peerAvg={peerAvgPacking}
                  tooltip="Measures how many blobs this rollup fits per transaction relative to the 6-blob maximum. A score of 100 = always sending 6 blobs per tx (maximum compression). Low score = many single-blob transactions."
                />
                <ScoreBar
                  label="Timing score"
                  value={timeScore ?? 0}
                  peerAvg={peerAvgTiming}
                  tooltip="Measures how well this rollup times its submissions relative to network fees. Score 50 = pays exactly the network average. Above 50 = pays less than average (good timing). Below 50 = pays more than average."
                />
                {costGwei != null && (
                  <div className="flex items-center justify-between pt-1 border-t border-border/30">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-muted-foreground">Cost / blob</span>
                      <InfoTooltip
                        content="Average blob base fee paid per blob in gwei, over the 7-day window. Compare to the peer average to see if this rollup is paying more or less than its competitors."
                        side="right"
                      />
                    </div>
                    <div className="text-right">
                      <span className="font-mono text-xs text-foreground">{costGwei.toFixed(5)} gwei</span>
                      {peerAvgCostGwei > 0 && (
                        <p className="font-mono text-[10px] text-muted-foreground/60">
                          vs {peerAvgCostGwei.toFixed(5)} avg
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="activity">
        <TabsList>
          <TabsTrigger value="activity">Activity</TabsTrigger>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
          <TabsTrigger value="fees">Fees</TabsTrigger>
        </TabsList>

        <TabsContent value="activity" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <h2 className="section-title">Hourly Blob Activity</h2>
                <InfoTooltip
                  content="Blob count and estimated cost per hour for this rollup, built from the last 500 transactions. Peaks show when the rollup batches most aggressively. The fee line reflects market conditions at submission time — compare to the market-wide fee to see if this rollup is timing well."
                  side="bottom"
                />
              </div>
            </CardHeader>
            <CardContent>
              <RollupMetricLineChart data={feeComparison} mode="fee-wei" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <h2 className="section-title">Rollup Activity Heatmap</h2>
                <InfoTooltip
                  content="Hour-of-day (x-axis) × day-of-week (y-axis) heatmap showing when this rollup submits blobs most frequently. Darker cells = more blobs. Reveals the sequencer's batching schedule — useful for predicting future submission windows."
                  side="bottom"
                />
              </div>
            </CardHeader>
            <CardContent>
              <RollupActivityHeatmap txs={txs} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="transactions">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <h2 className="section-title">Recent Transactions (last 500)</h2>
                <InfoTooltip
                  content="The 500 most recent EIP-4844 type-3 transactions from this rollup's sequencer address. Each row shows the transaction hash (links to Etherscan), block number, blob count, blob base fee paid, and timestamp. Sort or filter to explore submission patterns."
                  side="bottom"
                />
              </div>
            </CardHeader>
            <CardContent>
              <RollupTxTable txs={txs} ethUsd={ethUsd} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="fees">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <h2 className="section-title">Fee History vs Network Avg</h2>
                <InfoTooltip
                  content="This rollup's hourly blob base fee compared to the network-wide average. When the rollup line is below Network Avg, it is timing submissions during cheaper windows. Consistent divergence above average suggests suboptimal batching timing."
                  side="bottom"
                />
              </div>
            </CardHeader>
            <CardContent>
              {feeComparison.length > 0
                ? <RollupMetricLineChart data={feeComparison} mode="fee-wei" />
                : <p className="py-8 text-center text-sm text-muted-foreground">No fee data</p>}
              <p className="mt-3 text-xs text-muted-foreground">
                First seen: {new Date(firstSeen).toLocaleString()} · Last seen: {new Date(lastSeen).toLocaleString()}
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
