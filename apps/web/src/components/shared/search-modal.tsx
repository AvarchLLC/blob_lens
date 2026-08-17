"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search, X, ArrowRight, Hash, FileCode, Globe, Zap, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

// ── Static search index ───────────────────────────────────────────────────────
type ResultType = "eip" | "page" | "epoch";

interface SearchResult {
  type: ResultType;
  id: string;
  title: string;
  desc: string;
  href: string;
  external?: boolean;
  tags: string[];
}

const INDEX: SearchResult[] = [
  // EIPs — linked to their detail pages
  { type: "eip", id: "EIP-4844",  title: "Blob Transactions",          desc: "Dencun · Introduces type-3 blob-carrying transactions for L2 DA",                     href: "/eips/eip-4844",     tags: ["4844","blob","dencun","type 3","kzg","shard"] },
  { type: "eip", id: "EIP-7691",  title: "Blob Throughput Increase",   desc: "Pectra · Raises target blobs/block from 3 → 4, max 8",                               href: "/eips/eip-7691",     tags: ["7691","blob","pectra","throughput","target"] },
  { type: "eip", id: "EIP-7904",  title: "EVM Compute Gas Repricing",  desc: "Glamsterdam · Benchmark-driven repricing cuts gas costs ~78% for most opcodes",        href: "/eips/eip-7904",     tags: ["7904","gas","glamsterdam","repricing","opcode","evm","compute"] },
  { type: "eip", id: "EIP-1559",  title: "Fee Market Reform",          desc: "London · Base fee + priority fee model, ETH burn mechanism",                          href: "/eips/eip-1559",     tags: ["1559","fee","base","priority","burn","london"] },
  { type: "eip", id: "EIP-2930",  title: "Access List Transactions",   desc: "Berlin · Type-1 transactions with explicit storage access lists",                      href: "/eips/eip-2930",     tags: ["2930","access","list","type 1","berlin"] },
  { type: "eip", id: "EIP-8184",  title: "Encrypted Mempool (Lucid)",  desc: "Glamsterdam · Sealed pre-confirmations via decryptor committee, removes MEV surface",  href: "/eips/eip-8184",     tags: ["8184","encrypted","lucid","mempool","mev","privacy","committee"] },
  { type: "eip", id: "EIP-4337",  title: "Account Abstraction",        desc: "Smart contract wallets via UserOperations and bundlers",                                href: "/eips",              tags: ["4337","account","abstraction","bundler","userop"] },
  { type: "eip", id: "EIP-3675",  title: "Merge / PoS Upgrade",        desc: "The Merge · Transitions Ethereum from PoW to Proof-of-Stake",                          href: "/eips",              tags: ["3675","merge","pos","proof of stake","consensus"] },

  // Pages
  { type: "page", id: "eips",             title: "EIP Explorer",              desc: "Browse Ethereum Improvement Proposals — from EIP-4844 blobs to Glamsterdam gas repricing", href: "/eips",         tags: ["eip","explorer","proposal","protocol","upgrade","glamsterdam"] },
  { type: "page", id: "gas",               title: "Gas Observatory",           desc: "Historical gas tracking in ETH & USD, EIP-7904 impact, tx type breakdown",         href: "/gas",               tags: ["gas","gwei","eth","usd","eip-7904","opcode","block"] },
  { type: "page", id: "mempool",           title: "Public Mempool & MEV",      desc: "MEV sandwich extraction, order-flow provenance, bot latency stream",               href: "/mempool",           tags: ["mempool","mev","sandwich","bot","frontrun","orderflow"] },
  { type: "page", id: "market",            title: "Blob Fee Market",           desc: "Blob base fee dynamics, target utilization, rollup DA cost trends",               href: "/market",            tags: ["blob","fee","market","base fee","da","rollup"] },
  { type: "page", id: "leaderboard",       title: "Rollup Leaderboard",        desc: "L2 blob submission rankings — OP, Arbitrum, Base, zkSync and more",              href: "/leaderboard",       tags: ["rollup","l2","leaderboard","op","arbitrum","base","zksync","starknet"] },
  { type: "page", id: "dainsights",        title: "DA Insights",               desc: "Data availability compression benchmarks, cost-per-byte across rollups",          href: "/dainsights",        tags: ["da","data availability","compression","calldata","blob","cost"] },
  { type: "page", id: "encrypted-mempool", title: "Encrypted Mempool (Lucid)", desc: "EIP-8184 committee health, capacity sim, privacy metrics",                        href: "/encrypted-mempool", tags: ["encrypted","lucid","committee","privacy","eip-8184"] },
  { type: "page", id: "dashboard",         title: "Console",                   desc: "Live overview — recent blobs, gas snapshot, active rollups",                      href: "/dashboard",         tags: ["console","dashboard","overview","live","blob"] },

  // Epochs / Hard forks
  { type: "epoch", id: "Dencun",      title: "Dencun",      desc: "Mar 2024 · EIP-4844, blob transactions, KZG commitments",          href: "/eips/eip-4844",  tags: ["dencun","2024","upgrade","fork","eip-4844","blob"] },
  { type: "epoch", id: "Pectra",      title: "Pectra",      desc: "May 2025 · EIP-7691, increased blob throughput",                   href: "/eips/eip-7691",  tags: ["pectra","2025","upgrade","fork","eip-7691"] },
  { type: "epoch", id: "Fusaka",      title: "Fusaka",      desc: "Apr 2026 · BPO2, further blob scaling",                           href: "/eips",           tags: ["fusaka","2026","upgrade","fork","bpo2"] },
  { type: "epoch", id: "Glamsterdam", title: "Glamsterdam", desc: "Upcoming · EIP-7904 gas repricing, EIP-8184 encrypted mempool",   href: "/eips/eip-7904",  tags: ["glamsterdam","upcoming","eip-7904","eip-8184"] },
];

const GROUP_LABELS: Record<ResultType, string> = { eip: "EIPS", page: "PAGES", epoch: "HARD FORKS" };
const GROUP_ORDER:  ResultType[] = ["eip", "page", "epoch"];

function typeIcon(type: ResultType) {
  if (type === "eip")   return <FileCode className="w-3.5 h-3.5 shrink-0" />;
  if (type === "page")  return <Globe    className="w-3.5 h-3.5 shrink-0" />;
  return                       <Zap      className="w-3.5 h-3.5 shrink-0" />;
}

function score(item: SearchResult, q: string): number {
  const ql = q.toLowerCase();
  const idL    = item.id.toLowerCase();
  const titleL = item.title.toLowerCase();
  if (idL === ql)              return 100;
  if (idL.startsWith(ql))     return 90;
  if (titleL.startsWith(ql))  return 80;
  if (idL.includes(ql))       return 70;
  if (titleL.includes(ql))    return 60;
  if (item.desc.toLowerCase().includes(ql)) return 40;
  if (item.tags.some((t) => t.includes(ql))) return 30;
  return 0;
}

function filter(q: string): SearchResult[] {
  if (!q.trim()) return INDEX.slice(0, 8);
  return INDEX.map((item) => ({ item, s: score(item, q) }))
    .filter(({ s }) => s > 0)
    .sort((a, b) => b.s - a.s)
    .map(({ item }) => item);
}

// Detect a block number or tx hash in the query
function blockOrTx(q: string): { kind: "block" | "tx"; label: string; url: string } | null {
  const trimmed = q.trim();
  if (/^\d{5,}$/.test(trimmed))
    return { kind: "block", label: `Block #${Number(trimmed).toLocaleString()}`, url: `https://etherscan.io/block/${trimmed}` };
  if (/^0x[0-9a-fA-F]{60,66}$/.test(trimmed))
    return { kind: "tx", label: `Tx ${trimmed.slice(0, 10)}…${trimmed.slice(-6)}`, url: `https://etherscan.io/tx/${trimmed}` };
  return null;
}

// ── Component ─────────────────────────────────────────────────────────────────
interface Props {
  open: boolean;
  onClose: () => void;
}

export function SearchModal({ open, onClose }: Props) {
  const router = useRouter();
  const [query, setQuery]     = useState("");
  const [cursor, setCursor]   = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef  = useRef<HTMLDivElement>(null);

  const results   = useMemo(() => filter(query), [query]);
  const chainHit  = useMemo(() => blockOrTx(query), [query]);
  const totalHits = results.length + (chainHit ? 1 : 0);

  // Build flat navigable list (chain hit first if present)
  const flat = useMemo(() => {
    const items: Array<{ result: SearchResult } | { chain: typeof chainHit }> = [];
    if (chainHit) items.push({ chain: chainHit });
    results.forEach((r) => items.push({ result: r }));
    return items;
  }, [results, chainHit]);

  const navigate = useCallback((idx: number) => {
    const item = flat[idx];
    if (!item) return;
    if ("chain" in item && item.chain) {
      window.open(item.chain.url, "_blank", "noopener");
    } else if ("result" in item) {
      if (item.result.external) window.open(item.result.href, "_blank", "noopener");
      else router.push(item.result.href);
    }
    onClose();
  }, [flat, router, onClose]);

  useEffect(() => {
    if (open) { setQuery(""); setCursor(0); setTimeout(() => inputRef.current?.focus(), 50); }
  }, [open]);

  useEffect(() => { setCursor(0); }, [query]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape")     { onClose(); return; }
      if (e.key === "ArrowDown")  { e.preventDefault(); setCursor((c) => Math.min(c + 1, flat.length - 1)); return; }
      if (e.key === "ArrowUp")    { e.preventDefault(); setCursor((c) => Math.max(c - 1, 0)); return; }
      if (e.key === "Enter")      { e.preventDefault(); navigate(cursor); return; }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, flat.length, cursor, navigate, onClose]);

  // Scroll active item into view
  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-idx="${cursor}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [cursor]);

  if (!open) return null;

  // Group results by type for display
  const grouped = GROUP_ORDER.map((type) => ({
    type,
    items: results.filter((r) => r.type === type),
  })).filter((g) => g.items.length > 0);

  // Running flat index for cursor tracking
  let flatIdx = chainHit ? 1 : 0;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-start justify-center pt-[12vh] px-4"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Panel */}
      <div
        className="relative w-full max-w-xl bg-[var(--surface-1)] border border-[var(--border-strong)] rounded-[10px] shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search input row */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--border)]">
          <Search className="w-4 h-4 text-[var(--text-muted)] shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search EIPs, pages, blocks, tx hashes…"
            className="flex-1 bg-transparent text-sm font-mono text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none"
          />
          {/* Result counter */}
          {query.trim() && (
            <span className="text-[10px] font-mono text-[var(--text-muted)] shrink-0 tabular-nums">
              {totalHits === 0 ? "no results" : `${totalHits} result${totalHits !== 1 ? "s" : ""}`}
            </span>
          )}
          <button onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results */}
        <div ref={listRef} className="max-h-[60vh] overflow-y-auto py-2">

          {/* Chain hit (block / tx) */}
          {chainHit && (() => {
            const idx = 0;
            return (
              <button
                key="chain"
                data-idx={idx}
                onClick={() => { window.open(chainHit.url, "_blank", "noopener"); onClose(); }}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors",
                  cursor === idx ? "bg-[var(--primary-bg)]" : "hover:bg-[var(--surface-sunken)]"
                )}
                onMouseEnter={() => setCursor(idx)}
              >
                <Hash className="w-3.5 h-3.5 text-[var(--primary-text)] shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-mono font-bold text-[var(--text-primary)]">{chainHit.label}</p>
                  <p className="text-[10px] font-mono text-[var(--text-muted)]">Open on Etherscan</p>
                </div>
                <ExternalLink className="w-3 h-3 text-[var(--text-muted)] shrink-0" />
              </button>
            );
          })()}

          {/* Grouped index results */}
          {grouped.map((group) => (
            <div key={group.type}>
              <div className="px-4 pt-3 pb-1 text-[9px] font-mono font-bold uppercase tracking-widest text-[var(--text-muted)]">
                {GROUP_LABELS[group.type]}
              </div>
              {group.items.map((result) => {
                const idx = flatIdx++;
                return (
                  <button
                    key={result.id}
                    data-idx={idx}
                    onClick={() => navigate(idx)}
                    className={cn(
                      "w-full flex items-start gap-3 px-4 py-2.5 text-left transition-colors",
                      cursor === idx ? "bg-[var(--primary-bg)]" : "hover:bg-[var(--surface-sunken)]"
                    )}
                    onMouseEnter={() => setCursor(idx)}
                  >
                    <span className={cn("mt-0.5", cursor === idx ? "text-[var(--primary-text)]" : "text-[var(--text-muted)]")}>
                      {typeIcon(result.type)}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-[var(--text-primary)] truncate">{result.id}</span>
                        <span className="text-[10px] font-sans text-[var(--text-secondary)] truncate">{result.title}</span>
                      </div>
                      <p className="text-[10px] font-sans text-[var(--text-muted)] leading-relaxed line-clamp-1 mt-0.5">{result.desc}</p>
                    </div>
                    <ArrowRight className={cn("w-3.5 h-3.5 mt-0.5 shrink-0 transition-transform", cursor === idx ? "text-[var(--primary-text)] translate-x-0.5" : "text-[var(--text-muted)]")} />
                  </button>
                );
              })}
            </div>
          ))}

          {/* Empty state */}
          {query.trim() && totalHits === 0 && (
            <div className="px-4 py-8 text-center font-mono text-xs text-[var(--text-muted)]">
              <p className="mb-1">[ NO RESULTS FOR &ldquo;{query}&rdquo; ]</p>
              <p className="text-[10px] opacity-60">Try an EIP number, page name, or fork name</p>
            </div>
          )}

          {/* Default hint when empty */}
          {!query.trim() && (
            <div className="px-4 pb-2 pt-1">
              <p className="text-[10px] font-mono text-[var(--text-muted)] uppercase tracking-wider mb-2">Quick jump</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 border-t border-[var(--border)] flex items-center gap-4 text-[9px] font-mono text-[var(--text-muted)]">
          <span><kbd className="px-1 py-0.5 bg-[var(--surface-sunken)] border border-[var(--border)] rounded-[2px] mr-1">↑↓</kbd>navigate</span>
          <span><kbd className="px-1 py-0.5 bg-[var(--surface-sunken)] border border-[var(--border)] rounded-[2px] mr-1">↵</kbd>open</span>
          <span><kbd className="px-1 py-0.5 bg-[var(--surface-sunken)] border border-[var(--border)] rounded-[2px] mr-1">esc</kbd>close</span>
          {query.trim() && totalHits > 0 && (
            <span className="ml-auto text-[var(--primary-text)] font-bold">
              {cursor + 1} / {totalHits}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
