import { BlobFeeLineChart } from "@/components/charts/BlobFeeLineChart";
import { RollupActivityHeatmap } from "@/components/charts/RollupActivityHeatmap";
import { AppHeader } from "@/components/shared/AppHeader";
import { RollupBadge } from "@/components/shared/RollupBadge";
import { StatCard } from "@/components/shared/StatCard";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getRollupTransactions } from "@/lib/queries";
import { formatFee, formatNumber, shortHash, timeAgo } from "@/lib/utils";
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
      });
    }
  }
  return Array.from(map.values()).sort((a, b) => a.hour.localeCompare(b.hour));
}

export default async function RollupPage({ params }: Props) {
  const { id } = await params;
  const rollupName = decodeURIComponent(id);

  const txs = await getRollupTransactions(rollupName).catch(() => null);
  if (!txs || txs.length === 0) notFound();

  const totalBlobs = txs.reduce((s, t) => s + t.num_blobs, 0);
  const avgBlobsPerTx = totalBlobs / txs.length;
  const firstSeen = txs[txs.length - 1].created_at;
  const lastSeen = txs[0].created_at;
  const marketHours = toMarketHours(txs);

  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader active="rollup" />

      <main className="mx-auto w-full max-w-7xl flex-1 space-y-8 px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <RollupBadge rollup={rollupName} />
          <h1 className="section-title text-3xl">{rollupName}</h1>
        </div>

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
                <BlobFeeLineChart data={marketHours} />
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
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-left text-xs font-medium uppercase tracking-[0.08em] text-[#9D93B8]">
                        <th className="pb-3 pr-4">Tx Hash</th>
                        <th className="pb-3 pr-4">Block</th>
                        <th className="pb-3 pr-4 text-right">Blobs</th>
                        <th className="pb-3 pr-4 text-right">Fee</th>
                        <th className="pb-3 text-right">Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {txs.map((tx) => (
                        <tr key={tx.tx_hash} className="border-b border-border last:border-0 transition-colors hover:bg-accent/30">
                          <td className="py-2.5 pr-4 font-mono text-xs text-[#9D93B8]">
                            <a
                              href={`https://etherscan.io/tx/${tx.tx_hash}`}
                              target="_blank"
                              rel="noreferrer"
                              className="transition-colors hover:text-primary"
                            >
                              {shortHash(tx.tx_hash)}
                            </a>
                          </td>
                          <td className="py-2.5 pr-4 text-xs text-[#9D93B8]">#{tx.block_number.toLocaleString()}</td>
                          <td className="py-2.5 pr-4 text-right text-foreground">{tx.num_blobs}</td>
                          <td className="py-2.5 pr-4 text-right font-mono text-xs text-[#9D93B8]">{formatFee(tx.max_fee_per_blob_gas)}</td>
                          <td className="py-2.5 text-right text-xs text-[#5C5575]">{timeAgo(tx.created_at)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="fees">
            <Card>
              <CardHeader>
                <h2 className="section-title">Fee History</h2>
              </CardHeader>
              <CardContent>
                <BlobFeeLineChart data={marketHours} />
                <p className="mt-3 text-xs text-[#9D93B8]">
                  First seen: {new Date(firstSeen).toLocaleString()} - Last seen: {new Date(lastSeen).toLocaleString()}
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
