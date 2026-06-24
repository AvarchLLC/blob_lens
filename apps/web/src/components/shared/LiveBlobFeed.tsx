"use client";

import { RollupBadge } from "@/components/shared/RollupBadge";
import { Skeleton } from "@/components/ui/skeleton";
import { blobCostUsd, formatUsd } from "@/lib/ethPrice";
import { useEthPrice } from "@/lib/useEthPrice";
import { rollupColor, shortHash, timeAgo } from "@/lib/utils";
import type { BlobTransaction } from "@/types";
import { ExternalLink } from "lucide-react";
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

  if (isLoading && !data) {
    return (
      <div className="p-6 space-y-4">
        {Array.from({ length: 10 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full bg-surface-elevated" />
        ))}
      </div>
    );
  }

  const blobs = data?.data ?? [];

  if (!blobs.length) {
    return <p className="py-20 text-center text-xs text-text-secondary opacity-50 italic">No blob transactions available.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-sidebar/50 border-b border-border">
          <tr>
            <th className="px-6 py-4 text-left text-[10px] font-bold uppercase tracking-[0.15em] text-text-secondary">Transaction</th>
            <th className="px-6 py-4 text-left text-[10px] font-bold uppercase tracking-[0.15em] text-text-secondary">Rollup</th>
            <th className="px-6 py-4 text-right text-[10px] font-bold uppercase tracking-[0.15em] text-text-secondary">Blobs</th>
            <th className="px-6 py-4 text-right text-[10px] font-bold uppercase tracking-[0.15em] text-text-secondary">Base Fee</th>
            <th className="px-6 py-4 text-right text-[10px] font-bold uppercase tracking-[0.15em] text-text-secondary">Time</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/30">
          {blobs.map((b) => (
            <tr key={b.tx_hash} className="hover:bg-surface-elevated transition-colors group">
              <td className="px-6 py-4">
                <a
                  href={`https://etherscan.io/tx/${b.tx_hash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-xs font-bold text-text-primary hover:text-primary transition-colors flex items-center gap-1.5"
                >
                  {shortHash(b.tx_hash)}
                  <ExternalLink className="h-2.5 w-2.5 opacity-0 group-hover:opacity-40 transition-opacity" />
                </a>
              </td>
              <td className="px-6 py-4">
                <RollupBadge rollup={b.rollup ?? 'UNKNOWN'} />
              </td>
              <td className="px-6 py-4 text-right">
                <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-none bg-primary/5 border border-primary/20">
                   <span className="font-mono text-[10px] font-bold text-primary">{b.num_blobs}</span>
                </div>
              </td>
              <td className="px-6 py-4 text-right font-mono text-xs font-bold text-text-primary">
                {ethUsd ? formatUsd(blobCostUsd(b.blob_base_fee, ethUsd)) : `${(Number(b.blob_base_fee) / 1e9).toFixed(4)} G`}
              </td>
              <td className="px-6 py-4 text-right text-xs text-text-secondary opacity-60">
                {timeAgo(b.created_at)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
