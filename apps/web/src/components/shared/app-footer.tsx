import React from "react";
import Link from "next/link";
import {
  Cpu,
  Database,
  Server,
  ShieldCheck,
  Code2,
  BookOpen,
  Terminal,
  Activity,
  ArrowUpRight,
} from "lucide-react";

import { BlobLensLogo } from "./blob-lens-logo";

export function AppFooter() {
  return (
    <footer className="w-full bg-[var(--surface-1)] border-t border-dashed border-[var(--border)] py-12 px-4 sm:px-8 mt-auto text-xs font-sans text-[var(--text-secondary)] transition-colors">
      <div className="max-w-[1440px] mx-auto flex flex-col gap-10">
        
        {/* ── Top Row: Brand & Multi-column Links ── */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 pb-8 border-b border-dashed border-[var(--border)]">
          
          {/* Brand Info (5 cols) */}
          <div className="md:col-span-5 flex flex-col gap-3">
            <div className="flex items-center gap-2.5">
              <BlobLensLogo textSize="lg" iconSize={42} />
              <span className="badge-live inline-flex items-center gap-1.5 uppercase font-mono tracking-wider text-[10px] ml-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] animate-pulse" />
                LIVE INDEXING
              </span>
            </div>

            <p className="text-xs font-sans text-[var(--text-secondary)] leading-relaxed max-w-md">
              High-precision observability console for Ethereum's blob storage layer (EIP-4844 / Danksharding). Real-time telemetry, fee dynamics, and L2 rollup submission metrics.
            </p>

            <div className="flex items-center gap-3 pt-2 text-xs font-mono">
              <span className="px-2 py-0.5 rounded-[4px] bg-[var(--primary-bg)] text-[var(--primary-text)] border border-[var(--primary-border)] text-[10px] font-bold uppercase">
                v1.4.0-pectra
              </span>
              <span className="text-[11px] text-[var(--text-muted)] flex items-center gap-1">
                <Activity className="w-3.5 h-3.5 text-[var(--success)]" /> All Systems Nominal
              </span>
            </div>
          </div>

          {/* Nav Columns (7 cols) */}
          <div className="md:col-span-7 grid grid-cols-2 sm:grid-cols-3 gap-6">
            
            {/* Column 1: Observability */}
            <div className="flex flex-col gap-3">
              <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-[var(--text-primary)]">
                Observability
              </span>
              <div className="flex flex-col gap-2 text-xs">
                <Link href="/" className="hover:text-[var(--primary-text)] transition-colors">
                  Overview
                </Link>
                <Link href="/market" className="hover:text-[var(--primary-text)] transition-colors">
                  Fee Market
                </Link>
                <Link href="/leaderboard" className="hover:text-[var(--primary-text)] transition-colors">
                  Rollup Rankings
                </Link>
                <Link href="/da-insights" className="hover:text-[var(--primary-text)] transition-colors">
                  DA Insights
                </Link>
              </div>
            </div>

            {/* Column 2: Architecture */}
            <div className="flex flex-col gap-3">
              <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-[var(--text-primary)]">
                Architecture
              </span>
              <div className="flex flex-col gap-2 text-xs">
                <span className="text-[var(--text-muted)] flex items-center justify-between">
                  Reth ExEx <span className="font-mono text-[10px]">(Rust)</span>
                </span>
                <span className="text-[var(--text-muted)] flex items-center justify-between">
                  ClickHouse <span className="font-mono text-[10px]">(OLAP)</span>
                </span>
                <span className="text-[var(--text-muted)] flex items-center justify-between">
                  Beacon Engine <span className="font-mono text-[10px]">(gRPC)</span>
                </span>
                <span className="text-[var(--text-muted)] flex items-center justify-between">
                  Next.js App <span className="font-mono text-[10px]">(Turbo)</span>
                </span>
              </div>
            </div>

            {/* Column 3: Resources */}
            <div className="flex flex-col gap-3">
              <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-[var(--text-primary)]">
                Resources
              </span>
              <div className="flex flex-col gap-2 text-xs">
                <a
                  href="https://eips.ethereum.org/EIPS/eip-4844"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-[var(--primary-text)] transition-colors flex items-center gap-1"
                >
                  <span>EIP-4844 Spec</span>
                  <ArrowUpRight className="w-3 h-3 text-[var(--text-muted)]" />
                </a>
                <a
                  href="https://github.com/dhanushlnaik/blob_lens"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-[var(--primary-text)] transition-colors flex items-center gap-1"
                >
                  <Code2 className="w-3.5 h-3.5" />
                  <span>GitHub Code</span>
                </a>
                <a
                  href="https://ethereum.org/en/roadmap/danksharding/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-[var(--primary-text)] transition-colors flex items-center gap-1"
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>Danksharding</span>
                </a>
              </div>
            </div>

          </div>
        </div>

        {/* ── System Status & Stack Telemetry Card ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-4 bg-[var(--surface-sunken)] border border-dashed border-[var(--border)] rounded-[8px]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-[6px] bg-[var(--surface-1)] border border-[var(--border)] text-[var(--primary-text)] shrink-0">
              <Cpu className="w-4 h-4" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-[10px] font-mono text-[var(--text-muted)] uppercase tracking-wider truncate">Node Indexer</span>
              <span className="text-xs font-semibold font-mono text-[var(--text-primary)] truncate">Reth ExEx (Rust)</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="p-2 rounded-[6px] bg-[var(--surface-1)] border border-[var(--border)] text-[var(--series-5)] shrink-0">
              <Database className="w-4 h-4" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-[10px] font-mono text-[var(--text-muted)] uppercase tracking-wider truncate">Analytics Engine</span>
              <span className="text-xs font-semibold font-mono text-[var(--text-primary)] truncate">ClickHouse MV</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="p-2 rounded-[6px] bg-[var(--surface-1)] border border-[var(--border)] text-[var(--series-1)] shrink-0">
              <Server className="w-4 h-4" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-[10px] font-mono text-[var(--text-muted)] uppercase tracking-wider truncate">Backend Gateway</span>
              <span className="text-xs font-semibold font-mono text-[var(--text-primary)] truncate">Axum / Tokio API</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="p-2 rounded-[6px] bg-[var(--surface-1)] border border-[var(--border)] text-[var(--success)] shrink-0">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-[10px] font-mono text-[var(--text-muted)] uppercase tracking-wider truncate">Protocol Standard</span>
              <span className="text-xs font-semibold font-mono text-[var(--text-primary)] truncate">EIP-4844 / Pectra</span>
            </div>
          </div>
        </div>

        {/* ── Bottom Meta & Copyright ── */}
        <div className="flex flex-col sm:flex-row items-center justify-between text-[11px] text-[var(--text-muted)] gap-2 font-mono pt-2">
          <div className="flex items-center gap-2">
            <Terminal className="w-3.5 h-3.5 text-[var(--primary-text)]" />
            <span>© {new Date().getFullYear()} BlobLens Telemetry Instrument. Open Source Software.</span>
          </div>
          <div className="flex items-center gap-4 tabular-nums">
            <span>CHAIN ID: 1 (MAINNET)</span>
            <span className="hidden sm:inline">•</span>
            <span>TARGET: 4.5 BLOBS/BLOCK</span>
          </div>
        </div>

      </div>
    </footer>
  );
}
