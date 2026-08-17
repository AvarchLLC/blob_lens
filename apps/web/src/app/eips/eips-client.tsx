"use client";

import React, { useState } from "react";
import Link from "next/link";
import { FileCode, Search, Zap, CheckCircle2, Clock, ArrowRight } from "lucide-react";
import { EIPS, FORKS, FORK_META, type EipFork } from "@/lib/eip-data";
import { cn } from "@/lib/utils";

function StatusBadge({ status }: { status: string }) {
  const styles = status === "live"
    ? "bg-green-500/10 border-green-500/30 text-green-600 dark:text-green-400"
    : "bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400";
  const Icon = status === "live" ? CheckCircle2 : Clock;
  return (
    <span className={cn("inline-flex items-center gap-1 px-1.5 py-0.5 rounded-[3px] border text-[9px] font-mono font-bold uppercase tracking-wider", styles)}>
      <Icon className="w-2.5 h-2.5" />
      {status === "live" ? "LIVE" : "UPCOMING"}
    </span>
  );
}

export function EipsClient() {
  const [query, setQuery] = useState("");
  const [activeFork, setActiveFork] = useState<EipFork | "all">("all");

  const filtered = EIPS.filter(eip => {
    const matchesFork = activeFork === "all" || eip.fork === activeFork;
    const q = query.toLowerCase();
    const matchesQuery = !q || eip.id.toLowerCase().includes(q) || eip.title.toLowerCase().includes(q)
      || eip.shortDesc.toLowerCase().includes(q) || eip.tags.some(t => t.includes(q));
    return matchesFork && matchesQuery;
  });

  // Group filtered by fork
  const byFork = FORKS.reduce<Record<string, typeof EIPS>>((acc, fork) => {
    const group = filtered.filter(e => e.fork === fork);
    if (group.length) acc[fork] = group;
    return acc;
  }, {});

  return (
    <div className="flex flex-col gap-6 w-full max-w-7xl mx-auto py-2 font-sans">
      {/* Header */}
      <div className="flex flex-col gap-3 pb-4 border-b border-dashed border-[var(--border)]">
        <div className="flex flex-wrap items-center gap-2 font-mono text-[10px]">
          <span className="px-2 py-0.5 font-bold tracking-widest text-[var(--primary-text)] bg-[var(--primary-bg)] border border-[var(--primary-border)] uppercase rounded-[4px]">
            [ EIP EXPLORER ]
          </span>
          <span className="px-2 py-0.5 border border-[var(--border)] rounded-[4px] text-[var(--text-secondary)]">
            ETHEREUM IMPROVEMENT PROPOSALS · PROTOCOL UPGRADES
          </span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">
          EIP Explorer
        </h1>
        <p className="max-w-2xl text-sm text-[var(--text-secondary)] leading-relaxed">
          Ethereum Improvement Proposals tracked by BlobLens — from EIP-4844 blob transactions to Glamsterdam gas repricing. Click any EIP to explore its mechanics and live on-chain impact.
        </p>

        {/* Search + fork filter */}
        <div className="flex flex-wrap items-center gap-3 mt-1">
          <div className="relative flex-1 min-w-48 max-w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-[var(--text-muted)]" />
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search EIPs..."
              className="w-full h-9 pl-9 pr-3 bg-[var(--surface-sunken)] border border-[var(--border)] rounded-[6px] text-xs font-mono text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--primary-border)]"
            />
          </div>
          <div className="flex items-center gap-1 flex-wrap">
            <button
              onClick={() => setActiveFork("all")}
              className={cn("px-2.5 py-1 rounded-[4px] text-[10px] font-mono font-bold uppercase transition-colors border",
                activeFork === "all"
                  ? "bg-[var(--primary-bg)] text-[var(--primary-text)] border-[var(--primary-border)]"
                  : "bg-[var(--surface-sunken)] text-[var(--text-secondary)] border-[var(--border)] hover:text-[var(--text-primary)]"
              )}
            >
              All
            </button>
            {FORKS.map(fork => {
              const meta = FORK_META[fork];
              return (
                <button
                  key={fork}
                  onClick={() => setActiveFork(fork)}
                  className={cn("px-2.5 py-1 rounded-[4px] text-[10px] font-mono font-bold uppercase transition-colors border",
                    activeFork === fork
                      ? "border-transparent text-white"
                      : "bg-[var(--surface-sunken)] text-[var(--text-secondary)] border-[var(--border)] hover:text-[var(--text-primary)]"
                  )}
                  style={activeFork === fork ? { backgroundColor: meta.color, borderColor: meta.color } : {}}
                >
                  {fork}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* EIP groups */}
      {Object.keys(byFork).length === 0 ? (
        <div className="py-16 text-center font-mono text-xs text-[var(--text-muted)] uppercase tracking-widest">
          [ NO EIPS MATCH "{query}" ]
        </div>
      ) : (
        Object.entries(byFork).map(([fork, eips]) => {
          const meta = FORK_META[fork as EipFork];
          return (
            <div key={fork} className="flex flex-col gap-3">
              {/* Fork header */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <Zap className="w-3.5 h-3.5" style={{ color: meta.color }} />
                  <span className="font-mono font-bold text-xs uppercase tracking-widest" style={{ color: meta.color }}>
                    {fork}
                  </span>
                  {meta.date && (
                    <span className="font-mono text-[10px] text-[var(--text-muted)]">· {meta.date}</span>
                  )}
                  <span className={cn(
                    "px-1.5 py-0.5 rounded-[3px] border text-[9px] font-mono font-bold uppercase tracking-wider",
                    meta.status === "live"
                      ? "bg-green-500/10 border-green-500/30 text-green-600 dark:text-green-400"
                      : "bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400"
                  )}>
                    {meta.status === "live" ? "LIVE" : "UPCOMING"}
                  </span>
                </div>
                <div className="flex-1 border-t border-dashed border-[var(--border)]" />
              </div>

              {/* EIP cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {eips.map(eip => (
                  <Link
                    key={eip.slug}
                    href={`/eips/${eip.slug}`}
                    className="group flex flex-col gap-3 p-4 bg-[var(--surface-1)] border border-[var(--border)] rounded-[8px] hover:border-[var(--primary-border)] hover:bg-[var(--surface-sunken)] transition-all"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <FileCode className="w-4 h-4 shrink-0 text-[var(--text-muted)] group-hover:text-[var(--primary-text)] transition-colors" />
                        <span className="font-mono font-bold text-xs text-[var(--primary-text)]">{eip.id}</span>
                      </div>
                      <StatusBadge status={eip.status} />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-[var(--text-primary)] leading-snug mb-1">{eip.title}</h3>
                      <p className="text-xs text-[var(--text-secondary)] leading-relaxed line-clamp-2">{eip.shortDesc}</p>
                    </div>
                    <div className="flex items-center justify-between mt-auto pt-2 border-t border-dashed border-[var(--border)]">
                      <div className="flex flex-wrap gap-1">
                        {eip.tags.slice(0, 3).map(tag => (
                          <span key={tag} className="px-1.5 py-0.5 rounded-[3px] bg-[var(--surface-sunken)] border border-[var(--border)] text-[9px] font-mono text-[var(--text-muted)] uppercase">
                            {tag}
                          </span>
                        ))}
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 text-[var(--text-muted)] group-hover:text-[var(--primary-text)] group-hover:translate-x-0.5 transition-all shrink-0" />
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
