import { getAddressSummary, getAddressTxs } from "@/lib/queries";
import { PageHeader } from "@/components/shared/PageHeader";
import { shortHash, timeAgo } from "@/lib/utils";
import { notFound } from "next/navigation";
import { ShieldAlert, Layers, Clock, Activity } from "lucide-react";
import Link from "next/link";
import type { AddressTx } from "@/types";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ addr: string }>;
  searchParams: Promise<{ page?: string }>;
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
        <div className="surface border border-border rounded-xl p-12 text-center space-y-2">
          <p className="text-text-secondary text-sm">Data temporarily unavailable</p>
          <p className="font-mono text-xs text-text-secondary/60 break-all">{addr}</p>
        </div>
      </main>
    );
  }

  if (summary.tx_total === 0) notFound();

  return (
    <main className="max-w-5xl mx-auto px-4 py-8 space-y-6 animate-fade-up">
      <PageHeader
        meta="Address"
        title={shortHash(addr)}
        summary={addr}
      />

      {/* Flags */}
      {(summary.ofac_flagged || summary.whale_flagged) && (
        <div className="flex flex-wrap gap-2">
          {summary.ofac_flagged && (
            <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full border border-status-critical/40 bg-status-critical/10 text-status-critical">
              <ShieldAlert className="h-3.5 w-3.5" /> OFAC Sanctioned
            </span>
          )}
          {summary.whale_flagged && (
            <span className="text-xs font-bold px-3 py-1.5 rounded-full border border-status-warning/40 bg-status-warning/10 text-status-warning">
              🐋 Whale Wallet
            </span>
          )}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          icon={<Layers className="h-4 w-4 text-primary" />}
          label="Blob Txs"
          value={summary.blob_tx_count.toLocaleString()}
          bg="bg-primary/5 border-primary/15"
        />
        <StatCard
          icon={<Activity className="h-4 w-4 text-primary" />}
          label="Top Rollup"
          value={summary.top_rollup ?? "—"}
          bg="bg-primary/5 border-primary/15"
        />
        <StatCard
          icon={<Clock className="h-4 w-4 text-text-secondary" />}
          label="First Seen"
          value={summary.first_seen ? timeAgo(summary.first_seen) : "—"}
          bg="bg-surface-elevated border-border"
        />
        <StatCard
          icon={<Clock className="h-4 w-4 text-text-secondary" />}
          label="Last Active"
          value={summary.last_seen ? timeAgo(summary.last_seen) : "—"}
          bg="bg-surface-elevated border-border"
        />
      </div>

      {/* Tx history */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">
            Blob Transaction History
          </p>
          <span className="text-xs text-text-secondary">Page {page}</span>
        </div>

        <div className="surface border border-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-surface-elevated">
                  <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-text-secondary">Tx Hash</th>
                  <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-text-secondary">Block</th>
                  <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-text-secondary">Age</th>
                  <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-text-secondary">Rollup</th>
                  <th className="text-right px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-text-secondary">Blobs</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {txs.map((tx) => <TxRow key={tx.tx_hash} tx={tx} />)}
                {txs.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-sm text-text-secondary">
                      No transactions found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination */}
        <div className="flex justify-between items-center mt-4">
          {page > 1 ? (
            <Link href={`/address/${addr}?page=${page - 1}`}
              className="text-xs font-semibold text-primary hover:underline flex items-center gap-1">
              ← Previous
            </Link>
          ) : <span />}
          {txs.length === 25 && (
            <Link href={`/address/${addr}?page=${page + 1}`}
              className="text-xs font-semibold text-primary hover:underline flex items-center gap-1">
              Next →
            </Link>
          )}
        </div>
      </div>
    </main>
  );
}

function StatCard({ icon, label, value, bg }: { icon: React.ReactNode; label: string; value: string; bg: string }) {
  return (
    <div className={`surface-elevated border rounded-xl p-4 ${bg}`}>
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <span className="text-[10px] font-bold uppercase tracking-wider text-text-secondary">{label}</span>
      </div>
      <p className="text-lg font-bold text-text-primary truncate">{value}</p>
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
        <Link href={`/block/${tx.block_number}`} className="hover:text-primary transition-colors">
          {tx.block_number.toLocaleString()}
        </Link>
      </td>
      <td className="px-4 py-3 text-xs text-text-secondary">{timeAgo(tx.block_timestamp)}</td>
      <td className="px-4 py-3 text-xs">
        {tx.rollup
          ? <span className="px-2 py-0.5 rounded-md bg-primary/10 text-primary text-[11px] font-semibold">{tx.rollup}</span>
          : <span className="text-text-secondary">—</span>
        }
      </td>
      <td className="px-4 py-3 text-right">
        <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20">
          <Layers className="h-3 w-3" />
          {tx.num_blobs}
        </span>
      </td>
    </tr>
  );
}
