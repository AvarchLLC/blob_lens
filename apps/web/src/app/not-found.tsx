"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Home, RotateCcw } from "lucide-react";

const GRID = Array.from({ length: 120 }, (_, i) => i);

export default function NotFound() {
  const router = useRouter();
  return (
    <div className="relative flex flex-col items-center justify-center min-h-[72vh] px-4 overflow-hidden select-none">

      {/* Background dot grid */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden opacity-[0.035]">
        <div className="grid grid-cols-[repeat(20,1fr)] gap-6 p-8 w-full">
          {GRID.map(i => (
            <span key={i} className="w-1 h-1 rounded-full bg-[var(--primary)] block" />
          ))}
        </div>
      </div>

      {/* Terminal card */}
      <div className="relative w-full max-w-xl border border-[var(--border)] bg-[var(--surface-1)] rounded-[8px] overflow-hidden shadow-2xl">

        {/* Title bar */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--border)] bg-[var(--surface-sunken)]">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#FF5F57]" />
            <span className="w-2.5 h-2.5 rounded-full bg-[#FEBC2E]" />
            <span className="w-2.5 h-2.5 rounded-full bg-[#28C840]" />
          </div>
          <span className="text-[10px] font-mono text-[var(--text-muted)] uppercase tracking-widest">
            bloblens — node/error
          </span>
          <span className="text-[10px] font-mono text-[var(--text-muted)]">●</span>
        </div>

        {/* Body */}
        <div className="p-6 sm:p-8 font-mono space-y-6">

          {/* Error code */}
          <div className="space-y-1">
            <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-[0.2em]">
              // ethereum.blob_node.routing_error
            </p>
            <h1 className="text-7xl sm:text-8xl font-bold tracking-tighter tabular-nums leading-none text-[var(--text-primary)]">
              404
            </h1>
            <div className="flex items-center gap-2 pt-1">
              <span className="inline-flex items-center px-2 py-0.5 bg-[var(--danger-bg)] border border-[var(--danger)] text-[var(--danger)] text-[10px] font-mono font-bold rounded-[3px] uppercase tracking-wider">
                BLOB_NOT_FOUND
              </span>
              <span className="text-[10px] text-[var(--text-muted)]">exit code 1</span>
            </div>
          </div>

          {/* Diagnostics */}
          <div className="border border-[var(--border)] rounded-[4px] overflow-hidden text-[11px]">
            {[
              ["CHAIN",      "Ethereum Mainnet"],
              ["BLOCK",      "latest"],
              ["STATUS",     "BLOB_PRUNED"],
              ["TTL",        "~18 days (EIP-4844)"],
              ["RESOLUTION", "Return to dashboard"],
            ].map(([k, v], i) => (
              <div key={k} className={`flex items-center gap-4 px-3 py-2 ${i % 2 === 0 ? "bg-[var(--surface-sunken)]" : "bg-[var(--surface-1)]"}`}>
                <span className="w-24 shrink-0 text-[var(--text-muted)] uppercase tracking-wider text-[10px]">{k}</span>
                <span className="text-[var(--text-secondary)]">{v}</span>
              </div>
            ))}
          </div>

          {/* Flavor */}
          <p className="text-xs text-[var(--text-muted)] leading-relaxed">
            The blob you're looking for has been pruned from this node.
            Blob data expires after ~18 days per EIP-4844 — it was never
            meant to live forever.
          </p>

          {/* Actions */}
          <div className="flex flex-wrap items-center gap-3 pt-1">
            <Link href="/"
              className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--primary)] text-[var(--primary-fg)] text-xs font-mono font-bold rounded-[4px] hover:opacity-90 transition-opacity">
              <Home className="w-3.5 h-3.5" />
              Return to Dashboard
            </Link>
            <button onClick={() => router.back()}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--surface-sunken)] border border-[var(--border)] text-[var(--text-secondary)] text-xs font-mono rounded-[4px] hover:border-[var(--primary-border)] hover:text-[var(--text-primary)] transition-colors cursor-pointer">
              <RotateCcw className="w-3.5 h-3.5" />
              Go Back
            </button>
          </div>
        </div>
      </div>

      {/* Footer hint */}
      <p className="mt-6 text-[10px] font-mono text-[var(--text-muted)] tracking-wider">
        BlobLens · Ethereum EIP-4844 Observatory
      </p>
    </div>
  );
}
