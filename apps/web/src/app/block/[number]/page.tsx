import { getBlockDetail } from "@/lib/queries";
import { PageHeader } from "@/components/shared/PageHeader";
import { MetricCard } from "@/components/shared/MetricCard";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { shortHash, formatFee, timeAgo } from "@/lib/utils";
import { notFound } from "next/navigation";
import Link from "next/link";
import type { AddressTx } from "@/types";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ number: string }>;
}

export default async function BlockDetailPage({ params }: Props) {
  const { number } = await params;
  const blockNum = parseInt(number, 10);
  if (isNaN(blockNum)) notFound();

  const block = await getBlockDetail(blockNum);
  if (block === null) {
    return (
      <main className="max-w-5xl mx-auto px-4 py-8">
        <div className="surface border border-border rounded-lg p-8 text-center space-y-2">
          <p className="text-text-secondary text-sm">Block data temporarily unavailable — ClickHouse unreachable</p>
          <p className="font-mono text-xs text-text-secondary/60">Block #{blockNum.toLocaleString()}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      <PageHeader
        title={`Block #${blockNum.toLocaleString()}`}
        summary={block.block_timestamp ? new Date(block.block_timestamp).toUTCString() : ""}
      />

      {/* Navigation */}
      <div className="flex gap-4 text-sm">
        <Link href={`/block/${blockNum - 1}`} className="text-blue-400 hover:underline">
          ← Block {(blockNum - 1).toLocaleString()}
        </Link>
        <Link href={`/block/${blockNum + 1}`} className="text-blue-400 hover:underline">
          Block {(blockNum + 1).toLocaleString()} →
        </Link>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard label="Blob Count" value={block.blob_count} />
        <MetricCard label="Blob Gas Used" value={block.blob_gas_used.toLocaleString()} />
        <MetricCard label="Utilization" value={`${block.utilization}%`} />
        <MetricCard label="Blob Base Fee" value={formatFee(block.blob_base_fee)} />
      </div>

      {/* Rollups in this block */}
      {block.rollups.length > 0 && (
        <div className="surface-elevated p-4 rounded-lg">
          <p className="text-text-secondary text-xs uppercase tracking-wider mb-3">Rollups in Block</p>
          <div className="flex flex-wrap gap-2">
            {block.rollups.map((r) => (
              <span key={r} className="text-xs px-3 py-1 rounded-full border border-border text-text-secondary">
                {r}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Transaction table */}
      <Card>
        <CardHeader className="pb-2">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-text-secondary">
            Transactions ({block.tx_count})
          </h2>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-text-secondary text-xs uppercase tracking-wider">
                  <th className="text-left p-3">Hash</th>
                  <th className="text-left p-3">From</th>
                  <th className="text-left p-3">To</th>
                  <th className="text-left p-3">Rollup</th>
                  <th className="text-right p-3">Value</th>
                  <th className="text-right p-3">Blobs</th>
                  <th className="text-right p-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {block.txs.map((tx) => (
                  <BlockTxRow key={tx.tx_hash} tx={tx} />
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}

function BlockTxRow({ tx }: { tx: AddressTx }) {
  return (
    <tr className="border-b border-border hover:bg-white/5 transition-colors">
      <td className="p-3 font-mono text-xs">
        <Link href={`/tx/${tx.tx_hash}`} className="text-blue-400 hover:underline">
          {shortHash(tx.tx_hash)}
        </Link>
      </td>
      <td className="p-3 font-mono text-xs">
        <Link href={`/address/${tx.from_address}`} className="text-blue-400 hover:underline">
          {shortHash(tx.from_address)}
        </Link>
      </td>
      <td className="p-3 font-mono text-xs">
        {tx.to_address ? (
          <Link href={`/address/${tx.to_address}`} className="text-blue-400 hover:underline">
            {shortHash(tx.to_address)}
          </Link>
        ) : (
          <span className="text-text-secondary italic">deploy</span>
        )}
      </td>
      <td className="p-3 text-xs text-text-secondary">{tx.rollup ?? "—"}</td>
      <td className="p-3 text-right font-mono text-xs">
        {tx.value === "0" ? "—" : `${(Number(BigInt(tx.value)) / 1e18).toFixed(4)}`}
      </td>
      <td className="p-3 text-right">
        {tx.num_blobs > 0 ? (
          <span className="text-xs px-2 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800">
            {tx.num_blobs}
          </span>
        ) : "—"}
      </td>
      <td className="p-3 text-right">
        <span className={`text-xs font-semibold ${tx.status ? "text-green-400" : "text-red-400"}`}>
          {tx.status ? "✓" : "✗"}
        </span>
      </td>
    </tr>
  );
}
