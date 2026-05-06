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

const MAX_BLOB_GAS = 786_432;

function UtilizationBar({ pct }: { pct: number }) {
  const clamped = Math.min(100, Math.max(0, pct));
  const color =
    clamped >= 90 ? "#EF4444" : clamped >= 60 ? "#F59E0B" : clamped >= 30 ? "#10B981" : "#3D4F6B";
  return (
    <div className="flex items-center gap-2">
      <div className="relative h-1.5 w-24 overflow-hidden rounded-full bg-[#1E2D45]">
        <div
          className="absolute left-0 top-0 h-full rounded-full transition-all"
          style={{ width: `${clamped}%`, backgroundColor: color }}
        />
      </div>
      <span className="w-10 text-right font-mono text-xs" style={{ color }}>
        {clamped.toFixed(1)}%
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

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    );
  }

  const blocks = data?.data ?? [];

  if (!blocks.length) {
    return <p className="py-8 text-center text-[0.6875rem] text-[#4B5563]">No block data yet</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs font-medium uppercase tracking-[0.08em] text-[#6EE7B7]">
            <th className="pb-3 pr-4">Block</th>
            <th className="pb-3 pr-4">Age</th>
            <th className="pb-3 pr-4 text-right">Txs</th>
            <th className="pb-3 pr-4 text-right">Blobs</th>
            <th className="pb-3 pr-6">Blob Gas Usage</th>
            <th className="pb-3 pr-4 text-right">Cost / Blob</th>
            <th className="pb-3">Rollups</th>
          </tr>
        </thead>
        <tbody>
          {blocks.map((b) => (
            <tr
              key={b.block_number}
              className="border-b border-border last:border-0 transition-colors hover:bg-accent/30"
            >
              <td className="py-2.5 pr-4 font-mono text-xs text-[#6EE7B7]">
                <a
                  href={`https://etherscan.io/block/${b.block_number}`}
                  target="_blank"
                  rel="noreferrer"
                  className="transition-colors hover:text-primary"
                >
                  #{b.block_number.toLocaleString()}
                </a>
              </td>
              <td className="py-2.5 pr-4 text-xs text-[#4B5563]">{timeAgo(b.created_at)}</td>
              <td className="py-2.5 pr-4 text-right text-xs text-foreground">{b.tx_count}</td>
              <td className="py-2.5 pr-4 text-right text-xs text-foreground">{b.blob_count}</td>
              <td className="py-2.5 pr-6">
                <UtilizationBar pct={b.utilization} />
              </td>
              <td className="py-2.5 pr-4 text-right font-mono text-xs text-[#6EE7B7]">
                {Number(b.blob_base_fee) === 0
                  ? <span className="text-[#4B5563]">—</span>
                  : ethUsd != null
                    ? formatUsd(blobCostUsd(b.blob_base_fee, ethUsd))
                    : `${(Number(b.blob_base_fee) / 1e9).toFixed(4)} gwei`}
              </td>
              <td className="py-2.5">
                <div className="flex flex-wrap gap-1">
                  {b.rollups.length === 0 ? (
                    <span className="caption italic text-[#4B5563]">—</span>
                  ) : (
                    b.rollups.slice(0, 4).map((r) => (
                      <RollupBadge key={r} rollup={r} linkable />
                    ))
                  )}
                  {b.rollups.length > 4 && (
                    <span className="caption text-[#4B5563]">+{b.rollups.length - 4}</span>
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
