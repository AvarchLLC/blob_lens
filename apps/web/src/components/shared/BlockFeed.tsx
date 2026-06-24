"use client";

import { RollupBadge } from "@/components/shared/RollupBadge";
import { Skeleton } from "@/components/ui/skeleton";
import { blobCostUsd, formatUsd } from "@/lib/ethPrice";
import { useEthPrice } from "@/lib/useEthPrice";
import { timeAgo } from "@/lib/utils";
import type { BlockRow } from "@/types";
import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((r) => r.json());
const REFRESH_MS = Number(process.env.NEXT_PUBLIC_MARKET_REFRESH_MS ?? 12000);

function UtilizationBar({ pct }: { pct: number }) {
  const clamped = Math.min(100, Math.max(0, pct));
  const activeBlocks = Math.round((clamped / 100) * 5);
  const color =
    clamped >= 90 ? "text-status-critical bg-status-critical" : clamped >= 60 ? "text-status-warning bg-status-warning" : clamped >= 30 ? "text-status-healthy bg-status-healthy" : "text-text-secondary bg-text-secondary";
  
  return (
    <div className="flex items-center gap-2 font-mono">
      <div className="flex gap-0.5 select-none">
        {Array.from({ length: 5 }).map((_, idx) => {
          const isActive = idx < activeBlocks;
          return (
            <div
              key={idx}
              className={`h-2 w-2.5 rounded-none border-t border-b border-black/25 ${
                isActive ? `${color} shadow-[0_0_2px_currentColor]` : "bg-text-secondary/15"
              }`}
            />
          );
        })}
      </div>
      <span className="w-8 text-right text-[10px] font-bold" style={{ color: clamped >= 90 ? "var(--status-critical)" : clamped >= 60 ? "var(--status-warning)" : clamped >= 30 ? "var(--status-healthy)" : "var(--text-secondary)" }}>
        {clamped.toFixed(0)}%
      </span>
    </div>
  );
}

export function BlockFeed() {
  const ethUsd = useEthPrice();
  const { data, isLoading } = useSWR<{ data: BlockRow[] }>(
    "/api/blocks",
    fetcher,
    { refreshInterval: REFRESH_MS }
  );

  if (isLoading && !data) {
    return (
      <div className="p-6 space-y-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full bg-surface-elevated" />
        ))}
      </div>
    );
  }

  const blocks = data?.data ?? [];

  if (!blocks.length) {
    return <p className="py-20 text-center text-xs text-text-secondary opacity-50 italic">No block data available.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-sidebar/50 border-b border-border">
          <tr>
            <th className="px-6 py-4 text-left text-[10px] font-bold uppercase tracking-[0.15em] text-text-secondary">Block</th>
            <th className="px-6 py-4 text-left text-[10px] font-bold uppercase tracking-[0.15em] text-text-secondary">Age</th>
            <th className="px-6 py-4 text-right text-[10px] font-bold uppercase tracking-[0.15em] text-text-secondary">Blobs</th>
            <th className="px-6 py-4 text-left text-[10px] font-bold uppercase tracking-[0.15em] text-text-secondary">Utilization</th>
            <th className="px-6 py-4 text-right text-[10px] font-bold uppercase tracking-[0.15em] text-text-secondary">Cost / Blob</th>
            <th className="px-6 py-4 text-left text-[10px] font-bold uppercase tracking-[0.15em] text-text-secondary">Rollups</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/30">
          {blocks.map((b) => (
            <tr key={b.block_number} className="hover:bg-surface-elevated transition-colors group">
              <td className="px-6 py-4">
                <a
                  href={`https://etherscan.io/block/${b.block_number}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-xs font-bold text-text-primary hover:text-primary transition-colors underline underline-offset-4 decoration-border/50"
                >
                  #{b.block_number.toLocaleString()}
                </a>
              </td>
              <td className="px-6 py-4 text-xs text-text-secondary opacity-60">
                {timeAgo(b.created_at)}
              </td>
              <td className="px-6 py-4 text-right font-mono text-xs font-bold text-text-primary">
                {b.blob_count}
              </td>
              <td className="px-6 py-4">
                <UtilizationBar pct={b.utilization} />
              </td>
              <td className="px-6 py-4 text-right font-mono text-xs font-bold text-text-primary">
                {Number(b.blob_base_fee) === 0
                  ? <span className="text-text-secondary opacity-40">—</span>
                  : ethUsd != null
                    ? formatUsd(blobCostUsd(b.blob_base_fee, ethUsd))
                    : `${(Number(b.blob_base_fee) / 1e9).toFixed(4)} G`}
              </td>
              <td className="px-6 py-4">
                <div className="flex -space-x-1.5 overflow-hidden group-hover:space-x-1 transition-all duration-300">
                  {b.rollups?.slice(0, 5).map((r, i) => (
                    <div key={i} className="transition-transform hover:scale-105 hover:z-10">
                      <RollupBadge rollup={r} />
                    </div>
                  ))}
                  {b.rollups?.length > 5 && (
                    <div className="flex items-center justify-center h-5 px-1 bg-surface-elevated border border-border text-[8px] font-bold text-text-secondary font-mono rounded-none select-none">
                      +{b.rollups.length - 5}
                    </div>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
