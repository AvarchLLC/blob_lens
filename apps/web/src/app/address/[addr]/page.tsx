import { getAddressSummary, getAddressTxs } from "@/lib/queries";
import { PageHeader } from "@/components/shared/PageHeader";
import { MetricCard } from "@/components/shared/MetricCard";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { shortHash, timeAgo } from "@/lib/utils";
import { notFound } from "next/navigation";
import Link from "next/link";
import type { AddressTx } from "@/types";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ addr: string }>;
  searchParams: Promise<{ page?: string }>;
}

function weiToEth(wei: string): string {
  const n = Number(BigInt(wei || "0")) / 1e18;
  return n === 0 ? "0 ETH" : `${n.toFixed(6)} ETH`;
}

export default async function AddressPage({ params, searchParams }: Props) {
  const { addr } = await params;
  const { page: pageStr } = await searchParams;
  const page = Math.max(1, parseInt(pageStr ?? "1", 10));

  const [summary, txs] = await Promise.all([
    getAddressSummary(addr),
    getAddressTxs(addr, page, 25),
  ]);

  if (summary === null) {
    return (
      <main className="max-w-5xl mx-auto px-4 py-8">
        <div className="surface border border-border rounded-lg p-8 text-center space-y-2">
          <p className="text-text-secondary text-sm">Data temporarily unavailable — ClickHouse unreachable</p>
          <p className="font-mono text-xs text-text-secondary/60 break-all">{addr}</p>
        </div>
      </main>
    );
  }

  if (summary.tx_total === 0) {
    notFound();
  }

  return (
    <main className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      <PageHeader title="Address" summary={addr} />

      {/* Flags */}
      {(summary.ofac_flagged || summary.whale_flagged) && (
        <div className="flex gap-2">
          {summary.ofac_flagged && (
            <span className="text-xs px-3 py-1 rounded-full border border-red-700 bg-red-950 text-red-300 font-semibold">
              ⚠ OFAC Flagged
            </span>
          )}
          {summary.whale_flagged && (
            <span className="text-xs px-3 py-1 rounded-full border border-yellow-700 bg-yellow-950 text-yellow-300 font-semibold">
              🐋 Whale
            </span>
          )}
        </div>
      )}

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard label="Total Txs" value={summary.tx_total.toLocaleString()} />
        <MetricCard label="Sent" value={summary.tx_sent.toLocaleString()} />
        <MetricCard label="Received" value={summary.tx_received.toLocaleString()} />
        <MetricCard label="Blob Txs" value={summary.blob_tx_count.toLocaleString()} />
      </div>

      {/* Meta row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
        {summary.top_rollup && (
          <div className="surface-elevated p-4 rounded-lg">
            <p className="text-text-secondary text-xs uppercase tracking-wider mb-1">Top Rollup</p>
            <p className="font-semibold">{summary.top_rollup}</p>
          </div>
        )}
        {summary.first_seen && (
          <div className="surface-elevated p-4 rounded-lg">
            <p className="text-text-secondary text-xs uppercase tracking-wider mb-1">First Seen</p>
            <p>{timeAgo(summary.first_seen)}</p>
          </div>
        )}
        {summary.last_seen && (
          <div className="surface-elevated p-4 rounded-lg">
            <p className="text-text-secondary text-xs uppercase tracking-wider mb-1">Last Active</p>
            <p>{timeAgo(summary.last_seen)}</p>
          </div>
        )}
      </div>

      {/* Transaction list */}
      <Card>
        <CardHeader className="pb-2">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-text-secondary">
            Transactions (page {page})
          </h2>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-text-secondary text-xs uppercase tracking-wider">
                  <th className="text-left p-3">Hash</th>
                  <th className="text-left p-3">Block</th>
                  <th className="text-left p-3">Age</th>
                  <th className="text-left p-3">Dir</th>
                  <th className="text-left p-3">From / To</th>
                  <th className="text-right p-3">Value</th>
                  <th className="text-right p-3">Blobs</th>
                </tr>
              </thead>
              <tbody>
                {txs.map((tx) => (
                  <TxRow key={tx.tx_hash} tx={tx} currentAddr={addr.toLowerCase()} />
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Pagination */}
      <div className="flex justify-between items-center text-sm">
        {page > 1 ? (
          <Link href={`/address/${addr}?page=${page - 1}`} className="text-blue-400 hover:underline">
            ← Prev
          </Link>
        ) : <span />}
        {txs.length === 25 && (
          <Link href={`/address/${addr}?page=${page + 1}`} className="text-blue-400 hover:underline">
            Next →
          </Link>
        )}
      </div>
    </main>
  );
}

function TxRow({ tx, currentAddr }: { tx: AddressTx; currentAddr: string }) {
  const isOut = tx.from_address.toLowerCase() === currentAddr;
  const counterpart = isOut ? tx.to_address : tx.from_address;
  const dirColor = isOut ? "text-orange-400" : "text-green-400";
  const dirLabel = isOut ? "OUT" : "IN";

  return (
    <tr className="border-b border-border hover:bg-white/5 transition-colors">
      <td className="p-3 font-mono text-xs">
        <Link href={`/tx/${tx.tx_hash}`} className="text-blue-400 hover:underline">
          {shortHash(tx.tx_hash)}
        </Link>
      </td>
      <td className="p-3 font-mono text-xs">
        <Link href={`/block/${tx.block_number}`} className="text-text-secondary hover:underline">
          {tx.block_number.toLocaleString()}
        </Link>
      </td>
      <td className="p-3 text-text-secondary text-xs">{timeAgo(tx.block_timestamp)}</td>
      <td className={`p-3 font-semibold text-xs ${dirColor}`}>{dirLabel}</td>
      <td className="p-3 font-mono text-xs">
        <Link href={`/address/${counterpart}`} className="text-blue-400 hover:underline">
          {shortHash(counterpart)}
        </Link>
        {tx.rollup && (
          <span className="ml-2 text-text-secondary text-xs">({tx.rollup})</span>
        )}
      </td>
      <td className="p-3 text-right font-mono text-xs">
        {tx.value === "0" ? "—" : `${(Number(BigInt(tx.value)) / 1e18).toFixed(4)} ETH`}
      </td>
      <td className="p-3 text-right">
        {tx.num_blobs > 0 && (
          <span className="text-xs px-2 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800">
            {tx.num_blobs}
          </span>
        )}
      </td>
    </tr>
  );
}
