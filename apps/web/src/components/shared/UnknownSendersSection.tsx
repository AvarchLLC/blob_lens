"use client";

import { formatNumber } from "@/lib/utils";
import type { UnknownSender } from "@/types";
import { ChevronDown, ChevronRight, Info } from "lucide-react";
import Link from "next/link";
import * as React from "react";

interface Props {
  senders: UnknownSender[];
}

export function UnknownSendersSection({ senders }: Props) {
  const [open, setOpen] = React.useState(false);

  if (!senders.length) return null;

  return (
    <div className="mt-12 surface border border-border overflow-hidden">
      <button
        type="button"
        className="flex w-full items-center justify-between px-6 py-5 text-left hover:bg-surface-elevated transition-colors"
        onClick={() => setOpen((v) => !v)}
      >
        <div className="flex items-center gap-3">
          <Info className="h-4 w-4 text-primary" />
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-text-secondary opacity-60">
            Unattributed Senders
          </span>
          <span className="rounded-none bg-surface-elevated border border-border px-1.5 py-0.5 font-mono text-[10px] font-bold text-text-primary">
            {senders.length}
          </span>
        </div>
        {open ? (
          <ChevronDown className="h-4 w-4 text-text-secondary opacity-40" />
        ) : (
          <ChevronRight className="h-4 w-4 text-text-secondary opacity-40" />
        )}
      </button>

      {open && (
        <div className="border-t border-border px-0 pb-6 pt-4 animate-fade-down">
          <div className="px-6 mb-6 flex items-center justify-between">
            <p className="text-xs text-text-secondary opacity-70">
              Top submitters with no match in the sequencer registry.
            </p>
            <Link
              href="/unknown"
              className="text-[10px] font-bold uppercase tracking-widest text-primary hover:underline underline-offset-4"
              onClick={(e) => e.stopPropagation()}
            >
              View Full Directory →
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-sidebar/50 border-b border-border">
                <tr>
                  <th className="px-6 py-4 text-left text-[10px] font-bold uppercase tracking-wider text-text-secondary">#</th>
                  <th className="px-6 py-4 text-left text-[10px] font-bold uppercase tracking-wider text-text-secondary">From Address</th>
                  <th className="px-6 py-4 text-right text-[10px] font-bold uppercase tracking-wider text-text-secondary">TXs</th>
                  <th className="px-6 py-4 text-right text-[10px] font-bold uppercase tracking-wider text-text-secondary">Blobs/TX</th>
                  <th className="px-6 py-4 text-right text-[10px] font-bold uppercase tracking-wider text-text-secondary">Blobs</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {senders.map((s, i) => (
                  <tr key={s.from_address} className="hover:bg-surface-elevated transition-colors">
                    <td className="px-6 py-4 font-mono text-[10px] text-text-secondary opacity-40">{i + 1}</td>
                    <td className="px-6 py-4">
                      <a
                        href={`https://etherscan.io/address/${s.from_address}`}
                        target="_blank"
                        rel="noreferrer"
                        className="font-mono text-xs font-bold text-text-primary hover:text-primary transition-colors"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {s.from_address}
                      </a>
                    </td>
                    <td className="px-6 py-4 text-right font-mono text-xs text-text-secondary">{formatNumber(Number(s.tx_count))}</td>
                    <td className="px-6 py-4 text-right font-mono text-xs text-text-secondary">{Number(s.avg_blobs_per_tx).toFixed(1)}</td>
                    <td className="px-6 py-4 text-right font-mono text-xs font-bold text-text-primary">{formatNumber(Number(s.total_blobs))}</td>
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
