"use client";

import { BlobDataViewer } from "@/components/shared/BlobDataViewer";
import { blobCostUsd, formatUsd } from "@/lib/ethPrice";
import { shortHash, timeAgo } from "@/lib/utils";
import type { BlobTransaction } from "@/types";

interface Props {
  txs: BlobTransaction[];
  ethUsd: number | null;
}

export function RollupTxTable({ txs, ethUsd }: Props) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs font-medium uppercase tracking-[0.08em] text-[#9D93B8]">
            <th className="pb-3 pr-4">Tx Hash</th>
            <th className="pb-3 pr-4">Block</th>
            <th className="pb-3 pr-4 text-right">{ethUsd != null ? "Cost / Blob" : "Base Fee"}</th>
            <th className="pb-3 pr-4 text-right">{ethUsd != null ? "Max Bid (USD)" : "Max Bid"}</th>
            <th className="pb-3 text-right">Time</th>
          </tr>
        </thead>
        <tbody>
          {txs.map((tx) => (
            <tr key={tx.tx_hash} className="border-b border-border/70 last:border-0 align-top">
              <td className="py-2.5 pr-4 font-mono text-xs text-[#9D93B8]">
                <a
                  href={`https://etherscan.io/tx/${tx.tx_hash}`}
                  target="_blank"
                  rel="noreferrer"
                  className="transition-colors hover:text-primary"
                >
                  {shortHash(tx.tx_hash)}
                </a>
                <BlobDataViewer
                  txHash={tx.tx_hash}
                  blockNumber={tx.block_number}
                  numBlobs={tx.num_blobs}
                />
              </td>
              <td className="py-2.5 pr-4 text-xs text-[#9D93B8]">#{tx.block_number.toLocaleString()}</td>
              <td className="py-2.5 pr-4 text-right font-mono text-xs text-[#9D93B8]">
                {ethUsd != null
                  ? formatUsd(blobCostUsd(tx.blob_base_fee, ethUsd))
                  : `${(Number(tx.blob_base_fee) / 1e9).toFixed(4)} gwei`}
              </td>
              <td className="py-2.5 pr-4 text-right font-mono text-xs text-[#5C5575]">
                {ethUsd != null
                  ? formatUsd(blobCostUsd(tx.max_fee_per_blob_gas, ethUsd))
                  : `${(Number(tx.max_fee_per_blob_gas) / 1e9).toFixed(4)} gwei`}
              </td>
              <td className="py-2.5 text-right text-xs text-[#5C5575]">{timeAgo(tx.created_at)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
