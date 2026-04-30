"use client";

import { RollupBadge } from "@/components/shared/RollupBadge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatFee, shortHash, timeAgo } from "@/lib/utils";
import type { BlobTransaction } from "@/types";
import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const REFRESH_MS = Number(
  process.env.NEXT_PUBLIC_MARKET_REFRESH_MS ?? 12000
);

export function LiveBlobFeed() {
  const { data, isLoading } = useSWR<{ data: BlobTransaction[] }>(
    "/api/blobs",
    fetcher,
    { refreshInterval: REFRESH_MS }
  );

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    );
  }

  const blobs = data?.data ?? [];

  return (
    <div className="space-y-1">
      {blobs.map((b) => (
        <div
          key={b.tx_hash}
          className="flex items-center justify-between gap-4 rounded-md px-3 py-2 text-sm hover:bg-accent/50 transition-colors"
        >
          <span className="font-mono text-muted-foreground text-xs w-28 shrink-0">
            {shortHash(b.tx_hash)}
          </span>
          <span className="text-muted-foreground text-xs w-24 shrink-0">
            #{b.block_number.toLocaleString()}
          </span>
          <span className="shrink-0">
            <RollupBadge rollup={b.rollup ?? "UNKNOWN"} linkable />
          </span>
          <span className="text-xs text-muted-foreground ml-auto shrink-0">
            {b.num_blobs} blobs
          </span>
          <span className="font-mono text-xs text-muted-foreground w-28 text-right shrink-0">
            {formatFee(b.max_fee_per_blob_gas)}
          </span>
          <span className="text-xs text-muted-foreground w-16 text-right shrink-0">
            {timeAgo(b.created_at)}
          </span>
        </div>
      ))}
    </div>
  );
}
