"use client";

import { formatNumber } from "@/lib/utils";
import type { UnknownSender } from "@/types";
import { ChevronDown, ChevronRight } from "lucide-react";
import Link from "next/link";
import * as React from "react";

interface Props {
  senders: UnknownSender[];
}

export function UnknownSendersSection({ senders }: Props) {
  const [open, setOpen] = React.useState(false);

  if (!senders.length) return null;

  return (
    <div className="mt-8 rounded-lg border border-[#1E2D45] bg-[#111827]">
      <button
        type="button"
        className="flex w-full items-center justify-between px-5 py-4 text-left"
        onClick={() => setOpen((v) => !v)}
      >
        <div className="flex items-center gap-2">
          <span className="section-title text-[#9CA3AF]">Unattributed Senders</span>
          <span className="rounded-full bg-[#1E2D45] px-2 py-0.5 font-mono text-xs text-[#6B7280]">
            {senders.length}
          </span>
        </div>
        {open ? (
          <ChevronDown className="h-4 w-4 text-[#4B5563]" />
        ) : (
          <ChevronRight className="h-4 w-4 text-[#4B5563]" />
        )}
      </button>

      {open && (
        <div className="border-t border-[#1E2D45] px-5 pb-5 pt-4">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-xs text-[#4B5563]">
              Top senders with rollup = UNKNOWN — not matched to any known sequencer.
            </p>
            <Link
              href="/unknown"
              className="text-xs text-[#10B981] hover:text-[#10B981]/80 transition-colors shrink-0 ml-4"
              onClick={(e) => e.stopPropagation()}
            >
              View all →
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#1E2D45]">
                  <th className="pb-2 pr-4 text-left text-xs font-medium uppercase tracking-[0.08em] text-[#4B5563]">#</th>
                  <th className="pb-2 pr-4 text-left text-xs font-medium uppercase tracking-[0.08em] text-[#4B5563]">From Address</th>
                  <th className="pb-2 pr-4 text-right text-xs font-medium uppercase tracking-[0.08em] text-[#4B5563]">TXs</th>
                  <th className="pb-2 pr-4 text-right text-xs font-medium uppercase tracking-[0.08em] text-[#4B5563]">Blobs/TX</th>
                  <th className="pb-2 text-right text-xs font-medium uppercase tracking-[0.08em] text-[#4B5563]">Blobs</th>
                </tr>
              </thead>
              <tbody>
                {senders.map((s, i) => (
                  <tr key={s.from_address} className="border-b border-[#1E2D45]/50">
                    <td className="py-2 pr-4 font-mono text-xs text-[#4B5563]">{i + 1}</td>
                    <td className="py-2 pr-4 font-mono text-xs text-[#9CA3AF]">
                      <a
                        href={`https://etherscan.io/address/${s.from_address}`}
                        target="_blank"
                        rel="noreferrer"
                        className="hover:text-[#10B981] transition-colors"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {s.from_address}
                      </a>
                    </td>
                    <td className="py-2 pr-4 text-right font-mono text-xs text-[#9CA3AF]">{formatNumber(Number(s.tx_count))}</td>
                    <td className="py-2 pr-4 text-right font-mono text-xs text-[#9CA3AF]">{Number(s.avg_blobs_per_tx).toFixed(1)}</td>
                    <td className="py-2 text-right font-mono text-xs text-foreground">{formatNumber(Number(s.total_blobs))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
