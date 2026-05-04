"use client";

import { RollupBadge } from "@/components/shared/RollupBadge";
import { Skeleton } from "@/components/ui/skeleton";
import { blobCostUsd, formatUsd } from "@/lib/ethPrice";
import { useEthPrice } from "@/lib/useEthPrice";
import { rollupColor, shortHash, timeAgo } from "@/lib/utils";
import type { BlobTransaction } from "@/types";
import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((r) => r.json());
const REFRESH_MS = Number(process.env.NEXT_PUBLIC_MARKET_REFRESH_MS ?? 12000);

export function LiveBlobFeed() {
  const ethUsd = useEthPrice();
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
    <div className="space-y-1.5">
      {blobs.map((b) => {
        const rollup = b.rollup ?? "UNKNOWN";
        const accent = rollupColor(rollup);
        return (
          <div
            key={b.tx_hash}
            className="feed-row"
            style={{ "--accent-color": accent } as React.CSSProperties}
          >
            <span
              className="absolute left-0 top-0 bottom-0 rounded-r-sm"
              style={{ width: "3px", backgroundColor: accent }}
            />
            <span className="w-28 shrink-0 font-mono text-xs text-[#6EE7B7] pl-1">
              {shortHash(b.tx_hash)}
            </span>
            <span className="w-24 shrink-0 caption font-mono text-[#6EE7B7]">#{b.block_number.toLocaleString()}</span>
            <span className="shrink-0">
              <RollupBadge rollup={rollup} linkable />
            </span>
            <span className="ml-auto shrink-0 text-xs text-[#9CA3AF]">{b.num_blobs} blobs</span>
            <span className="hidden sm:flex shrink-0 flex-col items-end w-28">
              <span className="font-mono text-xs text-[#6EE7B7]">
                {ethUsd != null
                  ? formatUsd(blobCostUsd(b.blob_base_fee, ethUsd))
                  : `${(Number(b.blob_base_fee) / 1e9).toFixed(4)} gwei`}
              </span>
              <span className="caption">{ethUsd != null ? "per blob" : "base fee"}</span>
            </span>
            <span className="w-16 shrink-0 text-right caption">{timeAgo(b.created_at)}</span>
          </div>
        );
      })}
    </div>
  );
}
