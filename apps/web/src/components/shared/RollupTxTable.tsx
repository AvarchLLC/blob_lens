"use client";

import { BlobDataViewer } from "@/components/shared/BlobDataViewer";
import { blobCostUsd, formatUsd } from "@/lib/ethPrice";
import { shortHash, timeAgo } from "@/lib/utils";
import type { BlobTransaction } from "@/types";
import { ExternalLink } from "lucide-react";

interface Props {
  txs: BlobTransaction[];
  ethUsd: number | null;
}

export function RollupTxTable({ txs, ethUsd }: Props) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-sidebar/50 border-b border-border">
          <tr>
            <th className="px-6 py-4 text-left text-[10px] font-bold uppercase tracking-[0.15em] text-text-secondary">Transaction</th>
            <th className="px-6 py-4 text-left text-[10px] font-bold uppercase tracking-[0.15em] text-text-secondary">Block</th>
            <th className="px-6 py-4 text-right text-[10px] font-bold uppercase tracking-[0.15em] text-text-secondary">Blobs</th>
            <th className="px-6 py-4 text-right text-[10px] font-bold uppercase tracking-[0.15em] text-text-secondary">{ethUsd != null ? "Cost / Blob" : "Base Fee"}</th>
            <th className="px-6 py-4 text-right text-[10px] font-bold uppercase tracking-[0.15em] text-text-secondary">Time</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/30">
          {txs.map((tx) => (
            <tr key={tx.tx_hash} className="hover:bg-surface-elevated transition-colors group align-top">
              <td className="px-6 py-4">
                <div className="flex flex-col gap-2">
                  <a
                    href={`https://etherscan.io/tx/${tx.tx_hash}`}
                    target="_blank"
                    rel="noreferrer"
                    className="font-mono text-xs font-bold text-text-primary hover:text-primary transition-colors flex items-center gap-1.5"
                  >
                    {shortHash(tx.tx_hash)}
                    <ExternalLink className="h-2.5 w-2.5 opacity-0 group-hover:opacity-40" />
                  </a>
                  <BlobDataViewer
                    txHash={tx.tx_hash}
                    blockNumber={tx.block_number}
                    numBlobs={tx.num_blobs}
                  />
                </div>
              </td>
              <td className="px-6 py-4">
                 <span className="font-mono text-xs font-medium text-text-secondary opacity-60">#{tx.block_number.toLocaleString()}</span>
              </td>
              <td className="px-6 py-4 text-right">
                <span className="font-mono text-xs font-bold text-text-primary">{tx.num_blobs}</span>
              </td>
              <td className="px-6 py-4 text-right">
                <span className="font-mono text-xs font-bold text-text-primary">
                  {ethUsd != null
                    ? formatUsd(blobCostUsd(tx.blob_base_fee, ethUsd))
                    : `${(Number(tx.blob_base_fee) / 1e9).toFixed(4)} G`}
                </span>
              </td>
              <td className="px-6 py-4 text-right">
                <span className="text-xs text-text-secondary opacity-60">{timeAgo(tx.created_at)}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
