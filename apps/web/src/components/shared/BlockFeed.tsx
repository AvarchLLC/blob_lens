"use client";

import { RollupBadge } from "@/components/shared/RollupBadge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatFee, timeAgo } from "@/lib/utils";
import type { BlockRow } from "@/types";
import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((r) => r.json());
const REFRESH_MS = Number(process.env.NEXT_PUBLIC_MARKET_REFRESH_MS ?? 12000);

const MAX_BLOB_GAS = 786_432;

function UtilizationBar({ pct }: { pct: number }) {
  const clamped = Math.min(100, Math.max(0, pct));
  const color =
    clamped >= 90 ? "#C0394A" : clamped >= 60 ? "#C4822A" : clamped >= 30 ? "#1A8C6A" : "#3D3D4E";
  return (
    <div className="flex items-center gap-2">
      <div className="relative h-1.5 w-24 overflow-hidden rounded-full bg-[#1e1e2e]">
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
    return <p className="py-8 text-center text-[0.6875rem] text-[#5C5575]">No block data yet</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs font-medium uppercase tracking-[0.08em] text-[#9D93B8]">
            <th className="pb-3 pr-4">Block</th>
            <th className="pb-3 pr-4">Age</th>
            <th className="pb-3 pr-4 text-right">Txs</th>
            <th className="pb-3 pr-4 text-right">Blobs</th>
            <th className="pb-3 pr-6">Blob Gas Usage</th>
            <th className="pb-3 pr-4 text-right">Base Fee</th>
            <th className="pb-3">Rollups</th>
          </tr>
        </thead>
        <tbody>
          {blocks.map((b) => (
            <tr
              key={b.block_number}
              className="border-b border-border last:border-0 transition-colors hover:bg-accent/30"
            >
              <td className="py-2.5 pr-4 font-mono text-xs text-[#9D93B8]">
                <a
                  href={`https://etherscan.io/block/${b.block_number}`}
                  target="_blank"
                  rel="noreferrer"
                  className="transition-colors hover:text-primary"
                >
                  #{b.block_number.toLocaleString()}
                </a>
              </td>
              <td className="py-2.5 pr-4 text-xs text-[#5C5575]">{timeAgo(b.created_at)}</td>
              <td className="py-2.5 pr-4 text-right text-xs text-foreground">{b.tx_count}</td>
              <td className="py-2.5 pr-4 text-right text-xs text-foreground">{b.blob_count}</td>
              <td className="py-2.5 pr-6">
                <UtilizationBar pct={b.utilization} />
              </td>
              <td className="py-2.5 pr-4 text-right font-mono text-xs text-[#9D93B8]">
                {formatFee(b.blob_base_fee)}
              </td>
              <td className="py-2.5">
                <div className="flex flex-wrap gap-1">
                  {b.rollups.length === 0 ? (
                    <span className="caption italic text-[#5C5575]">—</span>
                  ) : (
                    b.rollups.slice(0, 4).map((r) => (
                      <RollupBadge key={r} rollup={r} linkable />
                    ))
                  )}
                  {b.rollups.length > 4 && (
                    <span className="caption text-[#5C5575]">+{b.rollups.length - 4}</span>
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
