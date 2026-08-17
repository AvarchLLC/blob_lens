"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Home, RefreshCw, AlertTriangle } from "lucide-react";

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

const ROWS = [
  ["TYPE",    "RuntimeError"],
  ["SOURCE",  "node/pipeline"],
  ["CHAIN",   "Ethereum Mainnet"],
  ["STATUS",  "INTERNAL_ERROR"],
];

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    console.error("[BlobLens] Page error:", error);
  }, [error]);

  const digest = error.digest ?? "ERR_UNKNOWN";
  const message = error.message?.slice(0, 80) || "An unexpected error occurred.";

  return (
    <div className="relative flex flex-col items-center justify-center min-h-[72vh] px-4 overflow-hidden select-none">

      {/* Background scan-lines decoration */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden opacity-[0.03]"
        style={{ backgroundImage: "repeating-linear-gradient(0deg, var(--primary) 0px, transparent 1px, transparent 6px)", backgroundSize: "100% 6px" }} />

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
            bloblens — node/runtime
          </span>
          <AlertTriangle className="w-3 h-3 text-[var(--warning)]" />
        </div>

        {/* Body */}
        <div className="p-6 sm:p-8 font-mono space-y-6">

          {/* Error code */}
          <div className="space-y-1">
            <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-[0.2em]">
              // ethereum.blob_node.pipeline_failure
            </p>
            <h1 className="text-7xl sm:text-8xl font-bold tracking-tighter tabular-nums leading-none text-[var(--text-primary)]">
              500
            </h1>
            <div className="flex items-center gap-2 pt-1">
              <span className="inline-flex items-center px-2 py-0.5 bg-[var(--warning-bg)] border border-[var(--warning)] text-[var(--warning)] text-[10px] font-mono font-bold rounded-[3px] uppercase tracking-wider">
                NODE_FAULT
              </span>
              <span className="text-[10px] text-[var(--text-muted)]">{digest}</span>
            </div>
          </div>

          {/* Diagnostics */}
          <div className="border border-[var(--border)] rounded-[4px] overflow-hidden text-[11px]">
            {ROWS.map(([k, v], i) => (
              <div key={k} className={`flex items-center gap-4 px-3 py-2 ${i % 2 === 0 ? "bg-[var(--surface-sunken)]" : "bg-[var(--surface-1)]"}`}>
                <span className="w-24 shrink-0 text-[var(--text-muted)] uppercase tracking-wider text-[10px]">{k}</span>
                <span className="text-[var(--text-secondary)]">{v}</span>
              </div>
            ))}
            {/* Error message */}
            <div className="flex items-start gap-4 px-3 py-2 bg-[var(--danger-bg)] border-t border-[var(--border)]">
              <span className="w-24 shrink-0 text-[var(--danger)] uppercase tracking-wider text-[10px] pt-0.5">MESSAGE</span>
              <span className="text-[var(--danger)] break-all">{message}</span>
            </div>
          </div>

          {/* Flavor */}
          <p className="text-xs text-[var(--text-muted)] leading-relaxed">
            The node encountered an unexpected fault in the pipeline.
            This is likely transient — try resetting the component or
            returning to the dashboard.
          </p>

          {/* Actions */}
          <div className="flex flex-wrap items-center gap-3 pt-1">
            <button onClick={reset}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--primary)] text-[var(--primary-fg)] text-xs font-mono font-bold rounded-[4px] hover:opacity-90 transition-opacity cursor-pointer">
              <RefreshCw className="w-3.5 h-3.5" />
              Reset Node
            </button>
            <Link href="/"
              className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--surface-sunken)] border border-[var(--border)] text-[var(--text-secondary)] text-xs font-mono rounded-[4px] hover:border-[var(--primary-border)] hover:text-[var(--text-primary)] transition-colors">
              <Home className="w-3.5 h-3.5" />
              Return to Dashboard
            </Link>
          </div>
        </div>
      </div>

      <p className="mt-6 text-[10px] font-mono text-[var(--text-muted)] tracking-wider">
        BlobLens · Ethereum EIP-4844 Observatory
      </p>
    </div>
  );
}
