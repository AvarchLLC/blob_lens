import { getBlockDetail } from "@/lib/queries";
import { PageHeader } from "@/components/shared/PageHeader";
import { shortHash, formatFee, timeAgo } from "@/lib/utils";
import { notFound } from "next/navigation";
import { ChevronLeft, ChevronRight, Layers, Flame, Activity, BarChart2 } from "lucide-react";
import Link from "next/link";
import type { AddressTx } from "@/types";

export const dynamic = "force-dynamic";

interface Props { params: Promise<{ number: string }> }

export default async function BlockDetailPage({ params }: Props) {
  const { number } = await params;
  const blockNum = parseInt(number, 10);
  if (isNaN(blockNum)) notFound();

  const block = await getBlockDetail(blockNum);
  if (block === null) {
    return (
      <main className="max-w-5xl mx-auto px-4 py-8">
        <div className="surface border border-border rounded-xl p-12 text-center space-y-2">
          <p className="text-text-secondary text-sm">Block data temporarily unavailable</p>
          <p className="font-mono text-xs text-text-secondary/60">Block #{blockNum.toLocaleString()}</p>
        </div>
      </main>
    );
  }

  const utilizationPct = block.utilization;
  const utilizationColor = utilizationPct >= 80 ? "text-status-critical" :
                           utilizationPct >= 50 ? "text-status-warning" : "text-status-healthy";

  return (
    <main className="max-w-5xl mx-auto px-4 py-8 space-y-6 animate-fade-up">
      {/* Header + nav */}
      <div className="flex items-center justify-between">
        <PageHeader
          meta="Block"
          title={`#${blockNum.toLocaleString()}`}
          summary={block.block_timestamp ? new Date(block.block_timestamp).toUTCString() : ""}
        />
      </div>

      {/* Prev / Next */}
      <div className="flex items-center gap-3">
        <Link href={`/block/${blockNum - 1}`}
          className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border border-border text-text-secondary hover:border-primary/40 hover:text-primary transition-all">
          <ChevronLeft className="h-3.5 w-3.5" />
          Block {(blockNum - 1).toLocaleString()}
        </Link>
        <Link href={`/block/${blockNum + 1}`}
          className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border border-border text-text-secondary hover:border-primary/40 hover:text-primary transition-all">
          Block {(blockNum + 1).toLocaleString()}
          <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          icon={<Layers className="h-4 w-4 text-primary" />}
          label="Blob Count"
          value={block.blob_count.toString()}
          sub={`of 9 max`}
          bg="border-primary/15 bg-primary/5"
        />
        <StatCard
          icon={<BarChart2 className="h-4 w-4 text-blue-400" />}
          label="Blob Gas Used"
          value={(block.blob_gas_used / 1000).toFixed(0) + "K"}
          bg="border-blue-500/15 bg-blue-500/5"
        />
        <StatCard
          icon={<Flame className="h-4 w-4 text-orange-400" />}
          label="Base Fee"
          value={formatFee(block.blob_base_fee)}
          bg="border-orange-500/15 bg-orange-500/5"
        />
        <StatCard
          icon={<Activity className="h-4 w-4" style={{ color: `var(--status-${utilizationPct >= 80 ? 'critical' : utilizationPct >= 50 ? 'warning' : 'healthy'})` }} />}
          label="Utilization"
          value={`${utilizationPct}%`}
          valueClass={utilizationColor}
          bg="border-border bg-surface-elevated"
        />
      </div>

      {/* Rollup pills */}
      {block.rollups.length > 0 && (
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary mb-3">Rollups in Block</p>
          <div className="flex flex-wrap gap-2">
            {block.rollups.map(r => (
              <Link key={r} href={`/rollup/${encodeURIComponent(r)}`}
                className="text-xs px-3 py-1.5 rounded-full border border-primary/20 bg-primary/5 text-primary font-semibold hover:bg-primary/10 transition-colors">
                {r}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Blob tx table */}
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary mb-3">
          Blob Transactions ({block.tx_count})
        </p>
        <div className="surface border border-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-surface-elevated">
                  <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-text-secondary">Hash</th>
                  <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-text-secondary">From</th>
                  <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-text-secondary">To</th>
                  <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-text-secondary">Rollup</th>
                  <th className="text-right px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-text-secondary">Blobs</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {block.txs.map(tx => <TxRow key={tx.tx_hash} tx={tx} />)}
                {block.txs.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-sm text-text-secondary">
                      No blob transactions in this block
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
  );
}

function StatCard({ icon, label, value, sub, valueClass, bg }: {
  icon: React.ReactNode; label: string; value: string;
  sub?: string; valueClass?: string; bg: string;
}) {
  return (
    <div className={`surface-elevated border rounded-xl p-4 ${bg}`}>
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <span className="text-[10px] font-bold uppercase tracking-wider text-text-secondary">{label}</span>
      </div>
      <p className={`text-xl font-bold ${valueClass ?? "text-text-primary"}`}>{value}</p>
      {sub && <p className="text-xs text-text-secondary mt-0.5">{sub}</p>}
    </div>
  );
}

function TxRow({ tx }: { tx: AddressTx }) {
  return (
    <tr className="hover:bg-white/[0.02] transition-colors">
      <td className="px-4 py-3 font-mono text-xs">
        <Link href={`/tx/${tx.tx_hash}`} className="text-primary hover:underline">
          {shortHash(tx.tx_hash)}
        </Link>
      </td>
      <td className="px-4 py-3 font-mono text-xs text-text-secondary">
        <Link href={`/address/${tx.from_address}`} className="hover:text-primary transition-colors">
          {shortHash(tx.from_address)}
        </Link>
      </td>
      <td className="px-4 py-3 font-mono text-xs text-text-secondary">
        {tx.to_address
          ? <Link href={`/address/${tx.to_address}`} className="hover:text-primary transition-colors">{shortHash(tx.to_address)}</Link>
          : <span className="italic">deploy</span>
        }
      </td>
      <td className="px-4 py-3 text-xs">
        {tx.rollup
          ? <span className="px-2 py-0.5 rounded-md bg-primary/10 text-primary text-[11px] font-semibold">{tx.rollup}</span>
          : <span className="text-text-secondary">—</span>
        }
      </td>
      <td className="px-4 py-3 text-right">
        <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-400 border border-blue-500/20">
          <Layers className="h-3 w-3" />
          {tx.num_blobs}
        </span>
      </td>
    </tr>
  );
}
