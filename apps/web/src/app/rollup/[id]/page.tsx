import { BlobFeeLineChart } from "@/components/charts/BlobFeeLineChart";
import { RollupActivityHeatmap } from "@/components/charts/RollupActivityHeatmap";
import { RollupBadge } from "@/components/shared/RollupBadge";
import { RollupTxTable } from "@/components/shared/RollupTxTable";
import { StatCard } from "@/components/shared/StatCard";
import { TopBar } from "@/components/shared/TopBar";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getEthPrice } from "@/lib/ethPrice";
import { getRollupTransactions } from "@/lib/queries";
import { formatNumber, timeAgo } from "@/lib/utils";
import type { BlobTransaction, MarketHour } from "@/types";
import { notFound } from "next/navigation";

export const revalidate = 30;

interface Props {
  params: Promise<{ id: string }>;
}

function toMarketHours(txs: BlobTransaction[]): MarketHour[] {
  const map = new Map<string, MarketHour>();
  for (const tx of txs) {
    const d = new Date(tx.created_at);
    d.setMinutes(0, 0, 0);
    const key = d.toISOString();
    const existing = map.get(key);
    const fee = Number(tx.max_fee_per_blob_gas);
    if (existing) {
      existing.tx_count += 1;
      existing.blob_count += tx.num_blobs;
      existing.max_blobs_in_block = Math.max(existing.max_blobs_in_block, tx.num_blobs);
      existing.avg_fee = String((Number(existing.avg_fee) * (existing.tx_count - 1) + fee) / existing.tx_count);
    } else {
      map.set(key, {
        hour: key,
        tx_count: 1,
        blob_count: tx.num_blobs,
        max_blobs_in_block: tx.num_blobs,
        avg_fee: String(fee),
        avg_utilization: 0,
      });
    }
  }
  return Array.from(map.values()).sort((a, b) => a.hour.localeCompare(b.hour));
}

export default async function RollupPage({ params }: Props) {
  const { id } = await params;
  const rollupName = decodeURIComponent(id);

  const [txs, ethUsd] = await Promise.all([
    getRollupTransactions(rollupName).catch(() => null),
    getEthPrice(),
  ]);
  if (!txs || txs.length === 0) notFound();

  const totalBlobs = txs.reduce((s, t) => s + t.num_blobs, 0);
  const avgBlobsPerTx = totalBlobs / txs.length;
  const firstSeen = txs[txs.length - 1].created_at;
  const lastSeen = txs[0].created_at;
  const marketHours = toMarketHours(txs);

  return (
    <div className="flex flex-col">
      <TopBar
        title={rollupName}
        subtitle="Per-rollup blob analytics · last 500 transactions"
        right={<RollupBadge rollup={rollupName} linkable={false} />}
      />

      <div className="space-y-6 px-6 py-4">
        <Separator />

        <section className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatCard label="Total Blobs" value={formatNumber(totalBlobs)} />
          <StatCard label="Transactions" value={formatNumber(txs.length)} />
          <StatCard label="Avg Blobs / TX" value={avgBlobsPerTx.toFixed(2)} />
          <StatCard label="Last Active" value={timeAgo(lastSeen)} sub={new Date(lastSeen).toLocaleString()} />
        </section>

        <Tabs defaultValue="activity">
          <TabsList>
            <TabsTrigger value="activity">Activity</TabsTrigger>
            <TabsTrigger value="transactions">Transactions</TabsTrigger>
            <TabsTrigger value="fees">Fees</TabsTrigger>
          </TabsList>

          <TabsContent value="activity" className="space-y-6">
            <Card>
              <CardHeader>
                <h2 className="section-title">Hourly Blob Activity</h2>
              </CardHeader>
              <CardContent>
                <BlobFeeLineChart data={marketHours} ethUsd={ethUsd ?? undefined} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <h2 className="section-title">Rollup Activity Heatmap</h2>
              </CardHeader>
              <CardContent>
                <RollupActivityHeatmap txs={txs} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="transactions">
            <Card>
              <CardHeader>
                <h2 className="section-title">Recent Transactions (last 500)</h2>
              </CardHeader>
              <CardContent>
                <RollupTxTable txs={txs} ethUsd={ethUsd} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="fees">
            <Card>
              <CardHeader>
                <h2 className="section-title">Fee History</h2>
              </CardHeader>
              <CardContent>
                <BlobFeeLineChart data={marketHours} ethUsd={ethUsd ?? undefined} />
                <p className="mt-3 text-xs text-[#9D93B8]">
                  First seen: {new Date(firstSeen).toLocaleString()} - Last seen: {new Date(lastSeen).toLocaleString()}
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
