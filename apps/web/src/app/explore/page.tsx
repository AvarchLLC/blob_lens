import { Suspense } from "react";
import { ExplorerSearch } from "@/components/shared/ExplorerSearch";
import { getLatestBlobs, getRecentBlocks } from "@/lib/queries";
import { shortHash, timeAgo, formatFee } from "@/lib/utils";
import Link from "next/link";

export const revalidate = 15;

// ── Async feed components — wrapped in Suspense so the hero renders immediately ──

async function RecentBlobsSection() {
  let blobs: Awaited<ReturnType<typeof getLatestBlobs>> = [];
  try {
    blobs = await getLatestBlobs(10);
  } catch {
    // ClickHouse unavailable — show empty state below
  }

  if (blobs.length === 0) {
    return (
      <div className="surface border border-border rounded-lg p-6 text-center text-xs text-text-secondary">
        No recent blob transactions available
      </div>
    );
  }

  return (
    <div className="surface border border-border rounded-lg divide-y divide-border">
      {blobs.map((tx) => (
        <div key={tx.tx_hash} className="flex items-center gap-3 p-3 hover:bg-white/5 transition-colors">
          <div className="flex-1 min-w-0">
            <Link href={`/tx/${tx.tx_hash}`} className="font-mono text-xs text-blue-400 hover:underline block truncate">
              {shortHash(tx.tx_hash)}
            </Link>
            <p className="text-xs text-text-secondary mt-0.5">
              <Link href={`/block/${tx.block_number}`} className="hover:underline">#{tx.block_number.toLocaleString()}</Link>
              {tx.rollup && <> · <span>{tx.rollup}</span></>}
            </p>
          </div>
          <div className="text-right shrink-0">
            <span className="text-xs px-1.5 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800">
              {tx.num_blobs} blob{tx.num_blobs !== 1 ? "s" : ""}
            </span>
            <p className="text-xs text-text-secondary mt-1">{formatFee(tx.blob_base_fee)}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

async function RecentBlocksSection() {
  let blocks: Awaited<ReturnType<typeof getRecentBlocks>> = [];
  try {
    blocks = await getRecentBlocks(6);
  } catch {
    // ClickHouse unavailable — show empty state below
  }

  if (blocks.length === 0) {
    return (
      <div className="surface border border-border rounded-lg p-6 text-center text-xs text-text-secondary">
        No recent blocks available
      </div>
    );
  }

  return (
    <div className="surface border border-border rounded-lg divide-y divide-border">
      {blocks.map((b) => (
        <div key={b.block_number} className="flex items-center gap-3 p-3 hover:bg-white/5 transition-colors">
          <div className="flex-1 min-w-0">
            <Link href={`/block/${b.block_number}`} className="font-mono text-xs text-blue-400 hover:underline">
              #{b.block_number.toLocaleString()}
            </Link>
            <p className="text-xs text-text-secondary mt-0.5">
              {timeAgo(b.created_at)} · {b.rollups?.slice(0, 3).join(", ")}
            </p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-xs font-semibold">{b.blob_count} blobs</p>
            <p className="text-xs text-text-secondary">{Math.round(b.utilization * 100)}% full</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function FeedSkeleton({ rows }: { rows: number }) {
  return (
    <div className="surface border border-border rounded-lg divide-y divide-border">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-3">
          <div className="flex-1 space-y-1.5">
            <div className="h-3 w-32 rounded bg-border/40 animate-pulse" />
            <div className="h-2.5 w-20 rounded bg-border/30 animate-pulse" />
          </div>
          <div className="h-5 w-14 rounded bg-border/30 animate-pulse" />
        </div>
      ))}
    </div>
  );
}

// ── Page shell — renders instantly, feeds stream in via Suspense ──

export default function ExplorePage() {
  return (
    <main className="max-w-5xl mx-auto px-4 py-12 space-y-12">

      {/* Hero */}
      <div className="text-center space-y-4">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">BlobLens Explorer</p>
        <h1 className="text-4xl font-bold text-text-primary">
          Explore Every Transaction
        </h1>
        <p className="text-text-secondary max-w-lg mx-auto">
          Look up any Ethereum transaction, address, or block. Full history from Dencun to now.
        </p>
      </div>

      {/* Search */}
      <ExplorerSearch className="max-w-2xl mx-auto" />

      {/* Quick examples */}
      <div className="flex flex-wrap justify-center gap-2 text-xs">
        <span className="text-text-secondary">Try:</span>
        <Link href="/block/22431084" className="text-primary hover:underline font-mono">Block #22431084</Link>
        <span className="text-text-secondary">·</span>
        <Link href="/address/0x000000633b68f5d8d3a86593ebb815b4663bcbe0" className="text-primary hover:underline font-mono">
          0x0000…cbe0
        </Link>
      </div>

      {/* What you can search */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <SearchTypeCard icon="🔗" label="Transaction" hint="Paste a 0x tx hash (66 chars)" example="0xabc123…" />
        <SearchTypeCard icon="👤" label="Address" hint="Paste a 0x wallet address (42 chars)" example="0xd8dA…" />
        <SearchTypeCard icon="📦" label="Block" hint="Enter a block number" example="22431084" />
      </div>

      {/* Recent activity — streams in without blocking the hero */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-text-secondary mb-3">
            Recent Blob Transactions
          </h2>
          <Suspense fallback={<FeedSkeleton rows={10} />}>
            <RecentBlobsSection />
          </Suspense>
        </div>

        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-text-secondary mb-3">
            Recent Blocks
          </h2>
          <Suspense fallback={<FeedSkeleton rows={6} />}>
            <RecentBlocksSection />
          </Suspense>
        </div>
      </div>
    </main>
  );
}

function SearchTypeCard({ icon, label, hint, example }: {
  icon: string; label: string; hint: string; example: string;
}) {
  return (
    <div className="surface-elevated border border-border rounded-xl p-5 space-y-2">
      <div className="flex items-center gap-2">
        <span className="text-xl">{icon}</span>
        <span className="font-semibold text-text-primary">{label}</span>
      </div>
      <p className="text-xs text-text-secondary">{hint}</p>
      <p className="font-mono text-xs text-text-secondary/60">{example}</p>
    </div>
  );
}
