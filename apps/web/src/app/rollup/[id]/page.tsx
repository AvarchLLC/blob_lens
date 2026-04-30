import { BlobFeeLineChart } from "@/components/charts/BlobFeeLineChart";
import { RollupBadge } from "@/components/shared/RollupBadge";
import { StatCard } from "@/components/shared/StatCard";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getRollupTransactions } from "@/lib/queries";
import { formatFee, formatNumber, shortHash, timeAgo } from "@/lib/utils";
import type { BlobTransaction, MarketHour } from "@/types";
import Link from "next/link";
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
      existing.max_blobs_in_block = Math.max(
        existing.max_blobs_in_block,
        tx.num_blobs
      );
      existing.avg_fee = String(
        (Number(existing.avg_fee) * (existing.tx_count - 1) + fee) /
          existing.tx_count
      );
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
  return Array.from(map.values()).sort((a, b) =>
    a.hour.localeCompare(b.hour)
  );
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
    <div className="flex flex-col flex-1">
      <header className="border-b border-border bg-card">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8 flex items-center justify-between">
          <Link href="/" className="text-lg font-bold text-foreground tracking-tight">
            BlobLens
          </Link>
          <nav className="hidden sm:flex items-center gap-4 text-sm">
            <Link href="/" className="text-muted-foreground hover:text-foreground transition-colors">Overview</Link>
            <Link href="/leaderboard" className="text-muted-foreground hover:text-foreground transition-colors">Leaderboard</Link>
            <Link href="/market" className="text-muted-foreground hover:text-foreground transition-colors">Market</Link>
          </nav>
        </div>
      </header>

      <main className="flex-1 mx-auto max-w-7xl w-full px-4 py-8 sm:px-6 lg:px-8 space-y-8">
        {/* Rollup header */}
        <div className="flex items-center gap-3">
          <RollupBadge rollup={rollupName} />
          <h1 className="text-2xl font-bold text-foreground">{rollupName}</h1>
        </div>

        <Separator />

        {/* Stats */}
        <section className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatCard label="Total Blobs" value={formatNumber(totalBlobs)} />
          <StatCard label="Transactions" value={formatNumber(txs.length)} />
          <StatCard label="Avg Blobs / TX" value={avgBlobsPerTx.toFixed(2)} />
          <StatCard
            label="Last Active"
            value={timeAgo(lastSeen)}
            sub={new Date(lastSeen).toLocaleString()}
          />
        </section>

        {/* Tabs */}
        <Tabs defaultValue="activity">
          <TabsList>
            <TabsTrigger value="activity">Activity</TabsTrigger>
            <TabsTrigger value="transactions">Transactions</TabsTrigger>
            <TabsTrigger value="fees">Fees</TabsTrigger>
          </TabsList>

          <TabsContent value="activity">
            <Card>
              <CardHeader>
                <p className="text-sm font-semibold text-foreground">Hourly Blob Activity</p>
              </CardHeader>
              <CardContent>
                <BlobFeeLineChart data={marketHours} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="transactions">
            <Card>
              <CardHeader>
                <p className="text-sm font-semibold text-foreground">Recent Transactions (last 500)</p>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        <th className="pb-3 pr-4">Tx Hash</th>
                        <th className="pb-3 pr-4">Block</th>
                        <th className="pb-3 pr-4 text-right">Blobs</th>
                        <th className="pb-3 pr-4 text-right">Fee</th>
                        <th className="pb-3 text-right">Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {txs.map((tx) => (
                        <tr
                          key={tx.tx_hash}
                          className="border-b border-border last:border-0 hover:bg-accent/30 transition-colors"
                        >
                          <td className="py-2.5 pr-4 font-mono text-xs text-muted-foreground">
                            <a
                              href={`https://etherscan.io/tx/${tx.tx_hash}`}
                              target="_blank"
                              rel="noreferrer"
                              className="hover:text-primary transition-colors"
                            >
                              {shortHash(tx.tx_hash)}
                            </a>
                          </td>
                          <td className="py-2.5 pr-4 text-muted-foreground text-xs">
                            #{tx.block_number.toLocaleString()}
                          </td>
                          <td className="py-2.5 pr-4 text-right text-foreground">{tx.num_blobs}</td>
                          <td className="py-2.5 pr-4 text-right font-mono text-xs text-muted-foreground">
                            {formatFee(tx.max_fee_per_blob_gas)}
                          </td>
                          <td className="py-2.5 text-right text-xs text-muted-foreground">
                            {timeAgo(tx.created_at)}
                          </td>
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
                <p className="text-sm font-semibold text-foreground">Fee History</p>
              </CardHeader>
              <CardContent>
                <BlobFeeLineChart data={marketHours} />
                <p className="mt-3 text-xs text-muted-foreground">
                  First seen: {new Date(firstSeen).toLocaleString()} &mdash;
                  Last seen: {new Date(lastSeen).toLocaleString()}
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
