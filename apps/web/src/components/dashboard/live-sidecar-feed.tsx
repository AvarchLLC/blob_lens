"use client";

import React, { useState, useEffect } from "react";
import { Copy, Check, ExternalLink, RefreshCw, Terminal, Layers } from "lucide-react";
import { L2Icon } from "@/components/shared/l2-icon";
import { cn } from "@/lib/utils";

export interface SidecarItem {
  blockNumber: number;
  txHash: string;
  rollup: string;
  blobCount: number;
  sizeKB: number;
  baseFeeGwei: number;
  kzgPreview: string;
  timeAgo: string;
  tagColor: string;
}

const INITIAL_SIDECARS: SidecarItem[] = [
  {
    blockNumber: 19426892,
    txHash: "0x7a8f192b49c0d12e847fa10b98234156c78901ab",
    rollup: "Base",
    blobCount: 6,
    sizeKB: 768,
    baseFeeGwei: 0.00124,
    kzgPreview: "0x89b14c3e...",
    timeAgo: "2s ago",
    tagColor: "bg-blue-500/10 text-blue-500 border-blue-500/30",
  },
  {
    blockNumber: 19426891,
    txHash: "0x3f12a9c8b740e1592837401d293847501928347e",
    rollup: "Arbitrum One",
    blobCount: 4,
    sizeKB: 512,
    baseFeeGwei: 0.00122,
    kzgPreview: "0xa12b98e1...",
    timeAgo: "14s ago",
    tagColor: "bg-[var(--series-2)]/10 text-[var(--series-2)] border-[var(--series-2)]/30",
  },
  {
    blockNumber: 19426890,
    txHash: "0x9812401f82736450192837465019283746501928",
    rollup: "OP Mainnet",
    blobCount: 3,
    sizeKB: 384,
    baseFeeGwei: 0.00120,
    kzgPreview: "0xc45d19a2...",
    timeAgo: "26s ago",
    tagColor: "bg-[var(--series-3)]/10 text-[var(--series-3)] border-[var(--series-3)]/30",
  },
  {
    blockNumber: 19426888,
    txHash: "0x5463728190019283746501928374650192837465",
    rollup: "Taiko",
    blobCount: 2,
    sizeKB: 256,
    baseFeeGwei: 0.00118,
    kzgPreview: "0xe78f30b1...",
    timeAgo: "50s ago",
    tagColor: "bg-[var(--series-5)]/10 text-[var(--series-5)] border-[var(--series-5)]/30",
  },
  {
    blockNumber: 19426887,
    txHash: "0x1928374650192837465019283746501928374650",
    rollup: "Scroll",
    blobCount: 5,
    sizeKB: 640,
    baseFeeGwei: 0.00115,
    kzgPreview: "0xf90a12c4...",
    timeAgo: "1m ago",
    tagColor: "bg-[var(--series-6)]/10 text-[var(--series-6)] border-[var(--series-6)]/30",
  },
];

export function LiveSidecarFeed() {
  const [copiedTx, setCopiedTx] = useState<string | null>(null);
  const [feed, setFeed] = useState<SidecarItem[]>(INITIAL_SIDECARS);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleCopy = (tx: string) => {
    navigator.clipboard.writeText(tx);
    setCopiedTx(tx);
    setTimeout(() => setCopiedTx(null), 1800);
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
    }, 600);
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Header Controls */}
      <div className="flex items-center justify-between font-mono text-xs text-[var(--text-secondary)] pb-2 border-b border-dashed border-[var(--border)]">
        <div className="flex items-center gap-2">
          <Terminal className="w-3.5 h-3.5 text-[var(--primary-text)]" />
          <span className="font-bold text-[var(--text-primary)] uppercase tracking-wider text-[11px]">
            REAL-TIME TYPE-3 SIDECAR STREAM
          </span>
        </div>
        <button
          onClick={handleRefresh}
          className="flex items-center gap-1.5 px-2 py-1 bg-[var(--surface-sunken)] border border-[var(--border)] hover:border-[var(--primary-border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] rounded-[4px] transition-all"
        >
          <RefreshCw className={cn("w-3 h-3", isRefreshing && "animate-spin text-[var(--primary-text)]")} />
          <span className="text-[10px] uppercase font-semibold">SYNC</span>
        </button>
      </div>

      {/* Sidecar Feed Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-[var(--border)] font-mono text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
              <th className="py-2 px-2 font-semibold">Block</th>
              <th className="py-2 px-2 font-semibold">Transaction Hash</th>
              <th className="py-2 px-2 font-semibold">Rollup L2</th>
              <th className="py-2 px-2 font-semibold text-right">Blobs</th>
              <th className="py-2 px-2 font-semibold text-right">Payload</th>
              <th className="py-2 px-2 font-semibold text-right">Base Fee</th>
              <th className="py-2 px-2 font-semibold text-right">Time</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-dashed divide-[var(--border)] font-mono text-xs">
            {feed.map((item) => (
              <tr
                key={item.txHash}
                className="hover:bg-[var(--primary-bg)]/40 transition-colors group"
              >
                {/* Block */}
                <td className="py-2.5 px-2 text-[var(--text-primary)] font-bold tabular-nums">
                  #{item.blockNumber.toLocaleString()}
                </td>

                {/* Tx Hash */}
                <td className="py-2.5 px-2">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[var(--text-secondary)] group-hover:text-[var(--primary-text)] transition-colors">
                      {item.txHash.slice(0, 10)}...{item.txHash.slice(-6)}
                    </span>
                    <button
                      onClick={() => handleCopy(item.txHash)}
                      className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                      title="Copy Tx Hash"
                    >
                      {copiedTx === item.txHash ? (
                        <Check className="w-3 h-3 text-[var(--success)]" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                    </button>
                  </div>
                </td>

                {/* Rollup */}
                <td className="py-2.5 px-2">
                  <span
                    className={cn(
                      "inline-flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded-[4px] border",
                      item.tagColor
                    )}
                  >
                    <L2Icon name={item.rollup} size="xs" />
                    {item.rollup}
                  </span>
                </td>

                {/* Blob Count */}
                <td className="py-2.5 px-2 text-right tabular-nums">
                  <span className="px-1.5 py-0.5 bg-[var(--surface-sunken)] border border-[var(--border)] rounded text-[11px] font-bold">
                    {item.blobCount} {item.blobCount === 1 ? "blob" : "blobs"}
                  </span>
                </td>

                {/* Payload Size */}
                <td className="py-2.5 px-2 text-right text-[var(--text-secondary)] tabular-nums">
                  {item.sizeKB} KB
                </td>

                {/* Base Fee */}
                <td className="py-2.5 px-2 text-right text-[var(--text-primary)] font-semibold tabular-nums">
                  {item.baseFeeGwei.toFixed(5)} Gwei
                </td>

                {/* Time */}
                <td className="py-2.5 px-2 text-right text-[var(--text-muted)] text-[11px] tabular-nums">
                  {item.timeAgo}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
