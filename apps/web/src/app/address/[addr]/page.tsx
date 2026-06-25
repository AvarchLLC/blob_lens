import { getAddressSummary, getAddressTxs } from "@/lib/queries";
import { PageHeader } from "@/components/shared/PageHeader";
import { shortHash, timeAgo, rollupIcon } from "@/lib/utils";
import { notFound } from "next/navigation";
import { ShieldAlert, Layers, Clock, Activity, ExternalLink, ArrowRight } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
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
        <div className="border border-dashed border-border/50 bg-surface/10 rounded-none p-12 text-center space-y-3 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-status-critical" />
          <p className="text-text-secondary text-xs font-mono uppercase tracking-widest">Data temporarily unavailable</p>
          <p className="font-mono text-xs text-text-secondary/60 break-all">{addr}</p>
        </div>
      </main>
    );
  }

  if (summary.tx_total === 0) notFound();

  return (
    <main className="max-w-5xl mx-auto px-4 py-8 space-y-8 animate-fade-up">
      {/* ── Page Header ── */}
      <PageHeader
        meta="Address Registry"
        title={shortHash(addr)}
        summary={addr}
      >
        <a
          href={`https://etherscan.io/address/${addr}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-4 py-2 bg-primary/5 text-primary border border-dashed border-primary/30 rounded-none text-xs font-bold uppercase tracking-widest hover:bg-primary/10 transition-all font-mono"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          View on Etherscan
        </a>
      </PageHeader>

      {/* ── Flags ── */}
      {(summary.ofac_flagged || summary.whale_flagged) && (
        <div className="flex flex-wrap gap-3 font-mono">
          {summary.ofac_flagged && (
            <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-none border border-dashed border-status-critical/40 bg-status-critical/5 text-status-critical">
              <ShieldAlert className="h-4 w-4 animate-pulse" /> OFAC Sanctioned Entity
            </span>
          )}
          {summary.whale_flagged && (
            <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-none border border-dashed border-status-warning/40 bg-status-warning/5 text-status-warning">
              🐋 Whale Wallet Address
            </span>
          )}
        </div>
      )}

      {/* ── Stats Grid ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          icon={<Layers className="h-4 w-4 text-primary" />}
          label="Blob Txs"
          value={summary.blob_tx_count.toLocaleString()}
          accentColor="#9060FF"
        />
        <StatCard
          icon={<Activity className="h-4 w-4 text-[#00A7B5]" />}
          label="Top Rollup"
          value={summary.top_rollup ?? "—"}
          accentColor="#00A7B5"
        />
        <StatCard
          icon={<Clock className="h-4 w-4 text-[#00df81]" />}
          label="First Seen"
          value={summary.first_seen ? timeAgo(summary.first_seen) : "—"}
          accentColor="#00df81"
        />
        <StatCard
          icon={<Clock className="h-4 w-4 text-text-secondary opacity-60" />}
          label="Last Active"
          value={summary.last_seen ? timeAgo(summary.last_seen) : "—"}
          accentColor="#6B7280"
        />
      </div>

      {/* ── Transaction History Table ── */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 font-mono">
          <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-primary">
            Blob Transaction Telemetry History
          </p>
          <span className="text-[10px] text-text-secondary opacity-50 font-bold uppercase">Page {page}</span>
        </div>

        <div className="w-full border border-dashed border-border bg-surface/10 rounded-none overflow-hidden relative">
          {/* Top neon glow bar */}
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-primary shadow-[0_0_8px_rgba(139,92,246,0.5)]" />

          <div className="overflow-x-auto w-full">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-surface-elevated/40 border-b border-dashed border-border/30 text-[10px] font-mono uppercase tracking-widest text-text-secondary">
                  <th className="px-6 py-4 text-left font-bold opacity-60">Tx Hash</th>
                  <th className="px-6 py-4 text-left font-bold opacity-60">Block</th>
                  <th className="px-6 py-4 text-left font-bold opacity-60">Age</th>
                  <th className="px-6 py-4 text-left font-bold opacity-60">Rollup</th>
                  <th className="px-6 py-4 text-right font-bold opacity-60">Blobs</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dashed divide-border/25">
                {txs.map((tx) => (
                  <TxRow key={tx.tx_hash} tx={tx} />
                ))}
                {txs.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-xs font-mono text-text-secondary opacity-50 uppercase tracking-wider">
                      No transactions indexed for this address
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination */}
        <div className="flex justify-between items-center mt-4 font-mono">
          {page > 1 ? (
            <Link href={`/address/${addr}?page=${page - 1}`}
              className="text-xs font-bold text-primary hover:text-primary-hover flex items-center gap-1">
              ← [ PREV PAGE ]
            </Link>
          ) : <span />}
          {txs.length === 25 && (
            <Link href={`/address/${addr}?page=${page + 1}`}
              className="text-xs font-bold text-primary hover:text-primary-hover flex items-center gap-1">
              [ NEXT PAGE ] →
            </Link>
          )}
        </div>
      </div>
    </main>
  );
}

function StatCard({ icon, label, value, accentColor }: { icon: React.ReactNode; label: string; value: string; accentColor: string }) {
  return (
    <div className="relative overflow-hidden border border-dashed border-border/50 bg-surface/20 rounded-none p-5 group hover:-translate-y-1 hover:border-solid hover:bg-surface/30 transition-all duration-300">
      {/* Top neon glow bar */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-border group-hover:h-[3px] transition-all duration-300" style={{ backgroundColor: accentColor, boxShadow: `0 0 6px ${accentColor}` }} />
      <div className="flex items-center gap-2 mb-3">
        {icon}
        <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-text-secondary font-mono group-hover:text-text-primary transition-colors">{label}</span>
      </div>
      <p className="text-xl font-bold text-text-primary truncate font-mono tabular-nums">{value}</p>
      {/* Corner tech ticks */}
      <div className="absolute bottom-1 right-1 h-1.5 w-1.5 border-r border-b border-border/20 group-hover:border-solid transition-all" style={{ borderColor: accentColor }} />
    </div>
  );
}

function TxRow({ tx }: { tx: AddressTx }) {
  const logo = tx.rollup ? rollupIcon(tx.rollup) : null;

  return (
    <tr className="group hover:bg-surface-elevated/30 transition-all duration-300">
      {/* Hash */}
      <td className="px-6 py-4 font-mono text-xs font-bold">
        <Link href={`/tx/${tx.tx_hash}`} className="text-primary hover:text-primary-hover">
          {shortHash(tx.tx_hash)}
        </Link>
      </td>
      
      {/* Block */}
      <td className="px-6 py-4 font-mono text-xs text-text-secondary tabular-nums">
        <Link href={`/block/${tx.block_number}`} className="hover:text-primary transition-colors font-semibold">
          {tx.block_number.toLocaleString()}
        </Link>
      </td>
      
      {/* Age */}
      <td className="px-6 py-4 text-xs text-text-secondary font-mono">
        {timeAgo(tx.block_timestamp)}
      </td>
      
      {/* Rollup Name */}
      <td className="px-6 py-4 text-xs">
        {tx.rollup ? (
          <div className="flex items-center gap-2">
            {logo ? (
              <div className="relative h-3.5 w-3.5 overflow-hidden shrink-0">
                <Image
                  src={logo}
                  alt={tx.rollup}
                  fill
                  className="object-contain filter brightness-95 contrast-105"
                />
              </div>
            ) : (
              <div className="h-3.5 w-3.5 bg-primary/10 border border-dashed border-primary/30 rounded-none shrink-0" />
            )}
            <span className="inline-block rounded-none border border-dashed border-primary/20 bg-primary/5 px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-primary">
              {tx.rollup}
            </span>
          </div>
        ) : (
          <span className="text-text-secondary font-mono">—</span>
        )}
      </td>
      
      {/* Blob Count */}
      <td className="px-6 py-4 text-right">
        <span className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-0.5 rounded-none bg-primary/5 text-primary border border-dashed border-primary/35 font-mono">
          <Layers className="h-3 w-3" />
          {tx.num_blobs}
        </span>
      </td>
    </tr>
  );
}
