import { Suspense } from "react";
import { ExplorerSearch } from "@/components/shared/ExplorerSearch";
import { getLatestBlobs, getRecentBlocks } from "@/lib/queries";
import { shortHash, timeAgo, formatFee } from "@/lib/utils";
import { Layers, Clock, ArrowRight } from "lucide-react";
import Link from "next/link";

export const revalidate = 15;

async function RecentBlobsSection() {
  let blobs: Awaited<ReturnType<typeof getLatestBlobs>> = [];
  try { blobs = await getLatestBlobs(10); } catch { /* CH unavailable */ }

  if (!blobs.length) return (
    <div className="surface border border-border rounded-xl p-6 text-center text-xs text-text-secondary">
      No recent data available
    </div>
  );

  return (
    <div className="surface border border-border rounded-xl overflow-hidden">
      {blobs.map((tx, i) => (
        <div key={tx.tx_hash} className={`flex items-center gap-3 px-4 py-3 hover:bg-white/[0.02] transition-colors ${i > 0 ? "border-t border-border" : ""}`}>
          <div className="h-7 w-7 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
            <Layers className="h-3.5 w-3.5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <Link href={`/tx/${tx.tx_hash}`} className="font-mono text-xs text-primary hover:underline block truncate">
              {shortHash(tx.tx_hash)}
            </Link>
            <div className="flex items-center gap-2 mt-0.5">
              <Link href={`/block/${tx.block_number}`} className="text-[11px] text-text-secondary hover:text-text-primary transition-colors">
                #{tx.block_number.toLocaleString()}
              </Link>
              {tx.rollup && (
                <>
                  <span className="text-text-secondary/30">·</span>
                  <span className="text-[11px] text-text-secondary">{tx.rollup}</span>
                </>
              )}
            </div>
          </div>
          <div className="text-right shrink-0 space-y-0.5">
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/15">
              {tx.num_blobs}×
            </span>
            <p className="text-[11px] text-text-secondary">{formatFee(tx.blob_base_fee)}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

async function RecentBlocksSection() {
  let blocks: Awaited<ReturnType<typeof getRecentBlocks>> = [];
  try { blocks = await getRecentBlocks(6); } catch { /* CH unavailable */ }

  if (!blocks.length) return (
    <div className="surface border border-border rounded-xl p-6 text-center text-xs text-text-secondary">
      No recent data available
    </div>
  );

  return (
    <div className="surface border border-border rounded-xl overflow-hidden">
      {blocks.map((b, i) => (
        <div key={b.block_number} className={`flex items-center gap-3 px-4 py-3 hover:bg-white/[0.02] transition-colors ${i > 0 ? "border-t border-border" : ""}`}>
          <div className="h-7 w-7 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
            <Clock className="h-3.5 w-3.5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <Link href={`/block/${b.block_number}`} className="font-mono text-xs text-primary hover:underline">
              #{b.block_number.toLocaleString()}
            </Link>
            <p className="text-[11px] text-text-secondary mt-0.5 truncate">
              {timeAgo(b.created_at)}
              {b.rollups?.length > 0 && ` · ${b.rollups.slice(0, 2).join(", ")}${b.rollups.length > 2 ? ` +${b.rollups.length - 2}` : ""}`}
            </p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-sm font-bold text-text-primary">{b.blob_count}</p>
            <p className="text-[11px] text-text-secondary">{Math.round(b.utilization)}% full</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function FeedSkeleton({ rows }: { rows: number }) {
  return (
    <div className="surface border border-border rounded-xl overflow-hidden">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className={`flex items-center gap-3 px-4 py-3 ${i > 0 ? "border-t border-border" : ""}`}>
          <div className="h-7 w-7 rounded-lg bg-border/30 animate-pulse shrink-0" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3 w-28 rounded bg-border/40 animate-pulse" />
            <div className="h-2.5 w-20 rounded bg-border/25 animate-pulse" />
          </div>
          <div className="h-5 w-12 rounded-md bg-border/30 animate-pulse" />
        </div>
      ))}
    </div>
  );
}

export default function ExplorePage() {
  return (
    <main className="max-w-5xl mx-auto px-4 py-12 space-y-12 animate-fade-up">

      {/* Hero */}
      <div className="text-center space-y-5">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/20 bg-primary/5 text-xs font-bold uppercase tracking-widest text-primary">
          BlobLens Explorer
        </div>
        <h1 className="text-4xl md:text-5xl font-bold text-text-primary leading-tight">
          Explore Every Blob<br />
          <span className="text-primary">Transaction</span>
        </h1>
        <p className="text-text-secondary max-w-md mx-auto leading-relaxed">
          Look up any Ethereum blob transaction, sequencer address, or block. Full history from Dencun to now.
        </p>
      </div>

      {/* Search box */}
      <ExplorerSearch className="max-w-2xl mx-auto" />

      {/* Quick links */}
      <div className="flex flex-wrap items-center justify-center gap-3 text-xs">
        <span className="text-text-secondary/50 font-semibold uppercase tracking-wider">Try</span>
        <Link href="/block/22431084"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-text-secondary hover:border-primary/40 hover:text-primary transition-all font-mono">
          Block #22431084
          <ArrowRight className="h-3 w-3" />
        </Link>
        <Link href="/address/0x000000633b68f5d8d3a86593ebb815b4663bcbe0"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-text-secondary hover:border-primary/40 hover:text-primary transition-all font-mono">
          0x0000…cbe0
          <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      {/* Search type cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { icon: "🔗", label: "Transaction", hint: "Paste a 66-char 0x hash", example: "0xabc123…ef", color: "border-primary/15 bg-primary/5" },
          { icon: "👤", label: "Address", hint: "Paste a 42-char 0x address", example: "0xd8dA…6045", color: "border-primary/15 bg-primary/5" },
          { icon: "📦", label: "Block", hint: "Enter a block number", example: "22431084", color: "border-status-warning/15 bg-status-warning/5" },
        ].map(({ icon, label, hint, example, color }) => (
          <div key={label} className={`surface-elevated border rounded-xl p-5 space-y-2 ${color}`}>
            <div className="flex items-center gap-2">
              <span className="text-lg">{icon}</span>
              <span className="font-semibold text-text-primary text-sm">{label}</span>
            </div>
            <p className="text-xs text-text-secondary">{hint}</p>
            <p className="font-mono text-xs text-text-secondary/50 bg-surface rounded-md px-2 py-1">{example}</p>
          </div>
        ))}
      </div>

      {/* Live feeds */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-60" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary" />
            </span>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-text-secondary">Recent Blob Transactions</p>
          </div>
          <Suspense fallback={<FeedSkeleton rows={10} />}>
            <RecentBlobsSection />
          </Suspense>
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-60" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary" />
            </span>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-text-secondary">Recent Blocks</p>
          </div>
          <Suspense fallback={<FeedSkeleton rows={6} />}>
            <RecentBlocksSection />
          </Suspense>
        </div>
      </div>
    </main>
  );
}
