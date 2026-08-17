"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Terminal,
  Copy,
  Check,
  Trash2,
  CornerDownLeft,
  Sparkles,
  HelpCircle,
  Activity,
  Cpu,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface TerminalEntry {
  id: string;
  timestamp: string;
  type: "input" | "output" | "system" | "error";
  command?: string;
  text?: string;
  renderContent?: React.ReactNode;
}

const COMMAND_SUGGESTIONS = [
  { cmd: "/stats", desc: "Protocol telemetry & network totals" },
  { cmd: "/regime", desc: "Pectra EIP-7691 regime indicators" },
  { cmd: "/top3", desc: "Top 3 L2 blob submitters breakdown" },
  { cmd: "/rollups", desc: "All active rollup market share" },
  { cmd: "/fees", desc: "Blob gas vs Calldata cost comparison" },
  { cmd: "/clear", desc: "Clear terminal screen buffer" },
];

export function BlobQueryTerminal() {
  const [history, setHistory] = useState<TerminalEntry[]>([
    {
      id: "init-1",
      timestamp: new Date().toLocaleTimeString("en-US", { hour12: false }),
      type: "system",
      text: "BlobLens Autonomous Query CLI v2.4.0 [Reth Beacon Engine 1.1.2]",
    },
    {
      id: "init-2",
      timestamp: new Date().toLocaleTimeString("en-US", { hour12: false }),
      type: "system",
      text: "Type /help or select a quick command below to query real-time blob data.",
    },
    {
      id: "init-cmd-1",
      timestamp: new Date().toLocaleTimeString("en-US", { hour12: false }),
      type: "input",
      command: "/top3",
    },
    {
      id: "init-out-1",
      timestamp: new Date().toLocaleTimeString("en-US", { hour12: false }),
      type: "output",
      renderContent: (
        <div className="space-y-2 py-1">
          <div className="flex items-center gap-2 text-xs font-semibold text-[var(--primary-text)]">
            <span className="w-2 h-2 rounded-full bg-[var(--primary)] animate-pulse" />
            TOP L2 BLOB SUBMITTERS (24H WINDOW)
          </div>
          <div className="bg-[var(--surface-sunken)] border border-[var(--border)] rounded-md p-3 font-mono text-[11px] space-y-2">
            <div className="grid grid-cols-12 text-[var(--text-muted)] border-b border-[var(--border)] pb-1 text-[10px] uppercase font-bold tracking-wider">
              <span className="col-span-1">#</span>
              <span className="col-span-4">ROLLUP</span>
              <span className="col-span-4 text-right">TOTAL BLOBS</span>
              <span className="col-span-3 text-right">PACKING EFF.</span>
            </div>

            {/* Rank 1: Base */}
            <div className="grid grid-cols-12 items-center text-[var(--text-primary)] font-medium">
              <span className="col-span-1 text-[var(--primary-text)] font-bold">01</span>
              <span className="col-span-4 flex items-center gap-1.5 font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                Base
              </span>
              <span className="col-span-4 text-right font-mono tabular-nums text-blue-600 dark:text-blue-400 font-bold">
                3,482,291
              </span>
              <span className="col-span-3 text-right font-mono tabular-nums text-[var(--success)] font-bold">
                96.4%
              </span>
            </div>
            <div className="w-full bg-[var(--border)] h-1.5 rounded-full overflow-hidden">
              <div className="bg-blue-500 h-full rounded-full" style={{ width: "96.4%" }} />
            </div>

            {/* Rank 2: Arbitrum One */}
            <div className="grid grid-cols-12 items-center text-[var(--text-primary)] font-medium pt-1">
              <span className="col-span-1 text-[var(--text-muted)]">02</span>
              <span className="col-span-4 flex items-center gap-1.5 font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-500" />
                Arbitrum One
              </span>
              <span className="col-span-4 text-right font-mono tabular-nums text-cyan-600 dark:text-cyan-300 font-bold">
                2,941,820
              </span>
              <span className="col-span-3 text-right font-mono tabular-nums text-[var(--success)] font-bold">
                92.1%
              </span>
            </div>
            <div className="w-full bg-[var(--border)] h-1.5 rounded-full overflow-hidden">
              <div className="bg-cyan-500 h-full rounded-full" style={{ width: "92.1%" }} />
            </div>

            {/* Rank 3: OP Mainnet */}
            <div className="grid grid-cols-12 items-center text-[var(--text-primary)] font-medium pt-1">
              <span className="col-span-1 text-[var(--text-muted)]">03</span>
              <span className="col-span-4 flex items-center gap-1.5 font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                OP Mainnet
              </span>
              <span className="col-span-4 text-right font-mono tabular-nums text-red-600 dark:text-red-400 font-bold">
                1,882,421
              </span>
              <span className="col-span-3 text-right font-mono tabular-nums text-[var(--warning)] font-bold">
                85.0%
              </span>
            </div>
            <div className="w-full bg-[var(--border)] h-1.5 rounded-full overflow-hidden">
              <div className="bg-red-500 h-full rounded-full" style={{ width: "85.0%" }} />
            </div>
          </div>
        </div>
      ),
    },
  ]);

  const [inputVal, setInputVal] = useState("");
  const [commandHistory, setCommandHistory] = useState<string[]>(["/top3"]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  const [copied, setCopied] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll output container
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [history]);

  const getTimestamp = () =>
    new Date().toLocaleTimeString("en-US", { hour12: false });

  const executeCommand = (rawCmd: string) => {
    const cleanCmd = rawCmd.trim().toLowerCase();
    if (!cleanCmd) return;

    const time = getTimestamp();
    const newHistory: TerminalEntry[] = [
      ...history,
      { id: `cmd-${Date.now()}`, timestamp: time, type: "input", command: rawCmd },
    ];

    setCommandHistory((prev) => [rawCmd, ...prev.filter((c) => c !== rawCmd)]);
    setHistoryIndex(-1);

    if (cleanCmd === "/stats" || cleanCmd === "stats") {
      newHistory.push({
        id: `out-${Date.now()}`,
        timestamp: time,
        type: "output",
        renderContent: (
          <div className="space-y-2 py-1">
            <div className="text-xs font-semibold text-[var(--primary-text)] flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-[var(--primary)]" />
              ETHEREUM BLOB NETWORK TELEMETRY
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-[11px]">
              <div className="p-2.5 rounded bg-[var(--surface-sunken)] border border-[var(--border)]">
                <span className="text-[10px] text-[var(--text-muted)] block uppercase">Indexed Blobs</span>
                <span className="text-sm font-bold text-[var(--text-primary)] tabular-nums">14,832,910</span>
              </div>
              <div className="p-2.5 rounded bg-[var(--surface-sunken)] border border-[var(--border)]">
                <span className="text-[10px] text-[var(--text-muted)] block uppercase">Transactions</span>
                <span className="text-sm font-bold text-[var(--primary-text)] tabular-nums">1,842,910</span>
              </div>
              <div className="p-2.5 rounded bg-[var(--surface-sunken)] border border-[var(--border)]">
                <span className="text-[10px] text-[var(--text-muted)] block uppercase">Active L2 Rollups</span>
                <span className="text-sm font-bold text-amber-600 dark:text-amber-400 tabular-nums">18 L2s</span>
              </div>
              <div className="p-2.5 rounded bg-[var(--surface-sunken)] border border-[var(--border)]">
                <span className="text-[10px] text-[var(--text-muted)] block uppercase">Avg Packing Eff.</span>
                <span className="text-sm font-bold text-[var(--success)] tabular-nums">84.2%</span>
              </div>
            </div>
          </div>
        ),
      });
    } else if (cleanCmd === "/regime" || cleanCmd === "regime") {
      newHistory.push({
        id: `out-${Date.now()}`,
        timestamp: time,
        type: "output",
        renderContent: (
          <div className="space-y-2 py-1">
            <div className="text-xs font-semibold text-[var(--primary-text)] flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-500" />
              EIP-7691 PECTRA REGIME INDICATORS
            </div>
            <div className="p-3 rounded bg-[var(--surface-sunken)] border border-[var(--border)] font-mono text-[11px] space-y-1.5">
              <div className="flex justify-between items-center">
                <span className="text-[var(--text-muted)]">ACTIVE REGIME:</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                  HEALTHY (3.84 BLOBS / BLOCK)
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[var(--text-muted)]">BLOB BASE FEE:</span>
                <span className="font-bold text-[var(--text-primary)] tabular-nums">0.0012 GWEI (~$0.045 USD)</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[var(--text-muted)]">PECTRA TARGET / MAX:</span>
                <span className="font-bold text-[var(--primary-text)] tabular-nums">6 TARGET / 9 MAX</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[var(--text-muted)]">MAX THROUGHPUT:</span>
                <span className="font-bold text-cyan-600 dark:text-cyan-400 tabular-nums">1,152 KB / BLOCK (2× Baseline)</span>
              </div>
            </div>
          </div>
        ),
      });
    } else if (cleanCmd === "/top3" || cleanCmd === "top3") {
      newHistory.push({
        id: `out-${Date.now()}`,
        timestamp: time,
        type: "output",
        renderContent: (
          <div className="space-y-2 py-1">
            <div className="flex items-center gap-2 text-xs font-semibold text-[var(--primary-text)]">
              <span className="w-2 h-2 rounded-full bg-[var(--primary)] animate-pulse" />
              TOP L2 BLOB SUBMITTERS (24H WINDOW)
            </div>
            <div className="bg-[var(--surface-sunken)] border border-[var(--border)] rounded-md p-3 font-mono text-[11px] space-y-2">
              <div className="grid grid-cols-12 text-[var(--text-muted)] border-b border-[var(--border)] pb-1 text-[10px] uppercase font-bold tracking-wider">
                <span className="col-span-1">#</span>
                <span className="col-span-4">ROLLUP</span>
                <span className="col-span-4 text-right">TOTAL BLOBS</span>
                <span className="col-span-3 text-right">PACKING EFF.</span>
              </div>

              <div className="grid grid-cols-12 items-center text-[var(--text-primary)] font-medium">
                <span className="col-span-1 text-[var(--primary-text)] font-bold">01</span>
                <span className="col-span-4 flex items-center gap-1.5 font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                  Base
                </span>
                <span className="col-span-4 text-right font-mono tabular-nums text-blue-600 dark:text-blue-400 font-bold">3,482,291</span>
                <span className="col-span-3 text-right font-mono tabular-nums text-[var(--success)] font-bold">96.4%</span>
              </div>
              <div className="w-full bg-[var(--border)] h-1.5 rounded-full overflow-hidden">
                <div className="bg-blue-500 h-full rounded-full" style={{ width: "96.4%" }} />
              </div>

              <div className="grid grid-cols-12 items-center text-[var(--text-primary)] font-medium pt-1">
                <span className="col-span-1 text-[var(--text-muted)]">02</span>
                <span className="col-span-4 flex items-center gap-1.5 font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-500" />
                  Arbitrum One
                </span>
                <span className="col-span-4 text-right font-mono tabular-nums text-cyan-600 dark:text-cyan-300 font-bold">2,941,820</span>
                <span className="col-span-3 text-right font-mono tabular-nums text-[var(--success)] font-bold">92.1%</span>
              </div>
              <div className="w-full bg-[var(--border)] h-1.5 rounded-full overflow-hidden">
                <div className="bg-cyan-500 h-full rounded-full" style={{ width: "92.1%" }} />
              </div>

              <div className="grid grid-cols-12 items-center text-[var(--text-primary)] font-medium pt-1">
                <span className="col-span-1 text-[var(--text-muted)]">03</span>
                <span className="col-span-4 flex items-center gap-1.5 font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                  OP Mainnet
                </span>
                <span className="col-span-4 text-right font-mono tabular-nums text-red-600 dark:text-red-400 font-bold">1,882,421</span>
                <span className="col-span-3 text-right font-mono tabular-nums text-[var(--warning)] font-bold">85.0%</span>
              </div>
              <div className="w-full bg-[var(--border)] h-1.5 rounded-full overflow-hidden">
                <div className="bg-red-500 h-full rounded-full" style={{ width: "85.0%" }} />
              </div>
            </div>
          </div>
        ),
      });
    } else if (cleanCmd === "/rollups" || cleanCmd === "rollups") {
      newHistory.push({
        id: `out-${Date.now()}`,
        timestamp: time,
        type: "output",
        renderContent: (
          <div className="space-y-2 py-1 font-mono text-[11px]">
            <div className="text-xs font-semibold text-[var(--primary-text)] flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" />
              ACTIVE L2 ROLLUP SHARE BREAKDOWN
            </div>
            <div className="p-3 rounded bg-[var(--surface-sunken)] border border-[var(--border)] space-y-1.5">
              <div className="flex justify-between items-center">
                <span>Base</span>
                <span className="font-bold text-blue-600 dark:text-blue-400">34.2%</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Arbitrum One</span>
                <span className="font-bold text-cyan-600 dark:text-cyan-400">28.5%</span>
              </div>
              <div className="flex justify-between items-center">
                <span>OP Mainnet</span>
                <span className="font-bold text-red-600 dark:text-red-400">18.1%</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Taiko</span>
                <span className="font-bold text-pink-600 dark:text-pink-400">8.4%</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Scroll</span>
                <span className="font-bold text-amber-600 dark:text-amber-400">5.2%</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Linea / Other L2s</span>
                <span className="font-bold text-[var(--text-muted)]">5.6%</span>
              </div>
            </div>
          </div>
        ),
      });
    } else if (cleanCmd === "/fees" || cleanCmd === "fees") {
      newHistory.push({
        id: `out-${Date.now()}`,
        timestamp: time,
        type: "output",
        renderContent: (
          <div className="space-y-2 py-1 font-mono text-[11px]">
            <div className="text-xs font-semibold text-[var(--primary-text)] flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-emerald-500" />
              BLOB GAS VS CALLDATA COST COMPARISON
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="p-2.5 rounded bg-[var(--surface-sunken)] border border-[var(--border)]">
                <span className="text-[10px] text-[var(--text-muted)] block uppercase">EIP-4844 Blob Cost</span>
                <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">~$0.045 USD</span>
                <span className="text-[10px] text-[var(--text-muted)] block">128 KB Payload</span>
              </div>
              <div className="p-2.5 rounded bg-[var(--surface-sunken)] border border-[var(--border)]">
                <span className="text-[10px] text-[var(--text-muted)] block uppercase">Equivalent Calldata Cost</span>
                <span className="text-sm font-bold text-rose-600 dark:text-rose-400 tabular-nums">~$42.50 USD</span>
                <span className="text-[10px] text-[var(--text-muted)] block">Standard L1 Execution</span>
              </div>
            </div>
            <div className="p-2 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400 text-center font-bold text-xs flex items-center justify-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
              SAVINGS RATIO: 99.1% COST REDUCTION
            </div>
          </div>
        ),
      });
    } else if (cleanCmd === "/help" || cleanCmd === "help") {
      newHistory.push({
        id: `out-${Date.now()}`,
        timestamp: time,
        type: "output",
        renderContent: (
          <div className="space-y-2 py-1 font-mono text-[11px]">
            <div className="text-xs font-semibold text-[var(--primary-text)] flex items-center gap-1.5">
              <HelpCircle className="w-3.5 h-3.5 text-[var(--primary)]" />
              AVAILABLE COMMANDS & SHORTCUTS
            </div>
            <div className="p-3 rounded bg-[var(--surface-sunken)] border border-[var(--border)] space-y-1.5">
              {COMMAND_SUGGESTIONS.map((c) => (
                <div key={c.cmd} className="flex justify-between items-center">
                  <span className="font-bold text-[var(--primary-text)]">{c.cmd}</span>
                  <span className="text-[var(--text-muted)] text-[10px]">{c.desc}</span>
                </div>
              ))}
            </div>
          </div>
        ),
      });
    } else if (cleanCmd === "/clear" || cleanCmd === "clear") {
      setHistory([]);
      return;
    } else {
      newHistory.push({
        id: `out-${Date.now()}`,
        timestamp: time,
        type: "error",
        text: `Command '${rawCmd}' not recognized. Type /help to see available commands.`,
      });
    }

    setHistory(newHistory);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowUp") {
      e.preventDefault();
      if (commandHistory.length > 0) {
        const nextIdx = Math.min(historyIndex + 1, commandHistory.length - 1);
        setHistoryIndex(nextIdx);
        setInputVal(commandHistory[nextIdx] || "");
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (historyIndex > 0) {
        const nextIdx = historyIndex - 1;
        setHistoryIndex(nextIdx);
        setInputVal(commandHistory[nextIdx] || "");
      } else if (historyIndex === 0) {
        setHistoryIndex(-1);
        setInputVal("");
      }
    }
  };

  const copyBuffer = () => {
    const textBuffer = history
      .map((h) =>
        h.type === "input"
          ? `bloblens:~$ ${h.command}`
          : h.text || "[Rich Output Component]"
      )
      .join("\n");
    navigator.clipboard.writeText(textBuffer);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="w-full max-w-4xl mx-auto rounded-xl border border-slate-200 dark:border-[#22222E] bg-[var(--surface-1)] dark:bg-[#0B0B0E] shadow-xl dark:shadow-2xl overflow-hidden font-mono select-none transition-all duration-300">
      {/* ── Theme Aware macOS style Terminal Header ── */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-100/90 dark:bg-[#121217] border-b border-slate-200 dark:border-[#22222E] transition-colors">
        {/* Left: Window Traffic Light Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setHistory([])}
            title="Clear buffer"
            className="w-3 h-3 rounded-full bg-[#FF5F56] hover:bg-[#FF5F56]/80 flex items-center justify-center group transition-colors cursor-pointer"
          >
            <span className="text-[8px] font-bold text-black opacity-0 group-hover:opacity-100">×</span>
          </button>
          <button
            onClick={() => {
              setHistory([
                {
                  id: "reset",
                  timestamp: getTimestamp(),
                  type: "system",
                  text: "Terminal reset to default state.",
                },
              ]);
            }}
            title="Reset session"
            className="w-3 h-3 rounded-full bg-[#FFBD2E] hover:bg-[#FFBD2E]/80 flex items-center justify-center group transition-colors cursor-pointer"
          >
            <span className="text-[8px] font-bold text-black opacity-0 group-hover:opacity-100">-</span>
          </button>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            title="Toggle expansion"
            className="w-3 h-3 rounded-full bg-[#27C93F] hover:bg-[#27C93F]/80 flex items-center justify-center group transition-colors cursor-pointer"
          >
            <span className="text-[8px] font-bold text-black opacity-0 group-hover:opacity-100">+</span>
          </button>
        </div>

        {/* Center: Window Title Badge */}
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-[var(--text-secondary)]">
          <Terminal className="w-3.5 h-3.5 text-[var(--primary)] animate-pulse" />
          <span className="tracking-wider text-[11px] uppercase font-bold">
            reth@bloblens-node:~$ zsh (80x24)
          </span>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2 text-xs">
          <button
            onClick={copyBuffer}
            className="px-2.5 py-1 rounded bg-white hover:bg-slate-200 dark:bg-[#1A1A24] dark:hover:bg-[#252533] text-slate-700 dark:text-[var(--text-secondary)] hover:text-slate-900 dark:hover:text-[var(--text-primary)] border border-slate-200 dark:border-transparent transition-colors flex items-center gap-1.5 text-[11px] cursor-pointer shadow-2xs"
          >
            {copied ? (
              <>
                <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                <span className="text-emerald-600 dark:text-emerald-400 font-bold">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3 h-3" />
                <span>Copy Buffer</span>
              </>
            )}
          </button>
          <button
            onClick={() => setHistory([])}
            className="p-1 rounded hover:bg-slate-200 dark:hover:bg-[#252533] text-slate-400 dark:text-[var(--text-muted)] hover:text-rose-600 dark:hover:text-rose-400 transition-colors cursor-pointer"
            title="Clear Terminal"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ── Terminal Body Output Window ── */}
      <div
        ref={scrollRef}
        className={cn(
          "p-4 sm:p-5 overflow-y-auto custom-scrollbar space-y-3 transition-all duration-300 text-xs bg-slate-50/70 dark:bg-[#0B0B0E]/95 text-slate-800 dark:text-slate-100",
          isExpanded ? "h-96" : "h-72"
        )}
      >
        {history.map((item) => (
          <div key={item.id} className="space-y-1">
            {item.type === "system" && (
              <div className="text-slate-500 dark:text-[var(--text-muted)] flex items-center gap-2 text-[11px]">
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--primary-bg)] text-[var(--primary-text)] font-bold border border-[var(--primary-border)]">
                  SYS
                </span>
                <span>{item.text}</span>
              </div>
            )}

            {item.type === "input" && (
              <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-[var(--text-primary)]">
                <span className="text-[var(--primary)] font-extrabold">bloblens@reth:~$</span>
                <span className="text-amber-700 dark:text-amber-300 font-mono font-bold">{item.command}</span>
                <span className="text-[10px] font-normal text-slate-400 dark:text-[var(--text-muted)] ml-auto">
                  {item.timestamp}
                </span>
              </div>
            )}

            {item.type === "output" && (
              <div className="text-slate-800 dark:text-[var(--text-primary)]/90 pl-3 border-l-2 border-[var(--primary)]/60 dark:border-[var(--primary-border)]">
                {item.renderContent ? (
                  item.renderContent
                ) : (
                  <pre className="whitespace-pre-wrap font-mono text-[11px]">
                    {item.text}
                  </pre>
                )}
              </div>
            )}

            {item.type === "error" && (
              <div className="text-rose-600 dark:text-rose-400 pl-3 border-l-2 border-rose-500/50 font-mono text-[11px]">
                {item.text}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* ── Theme-Aware Command Prompt & Quick Action Chips ── */}
      <div className="border-t border-slate-200 dark:border-[#22222E] bg-slate-100/90 dark:bg-[#121217] p-3 sm:px-5 space-y-3 transition-colors">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            executeCommand(inputVal);
            setInputVal("");
          }}
          className="flex items-center gap-2 text-xs"
        >
          <span className="text-[var(--primary)] font-extrabold shrink-0 flex items-center gap-1">
            bloblens:~$
          </span>
          <div className="relative flex-grow flex items-center">
            <input
              ref={inputRef}
              type="text"
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a command (e.g. /top3, /stats, /regime)..."
              className="w-full bg-transparent outline-none text-slate-900 dark:text-[var(--text-primary)] placeholder:text-slate-400 dark:placeholder:text-[var(--text-muted)] font-mono text-xs caret-[var(--primary)]"
              autoComplete="off"
              spellCheck={false}
            />
          </div>
          <button
            type="submit"
            className="px-3 py-1.5 rounded bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-[var(--primary-fg)] font-bold transition-all flex items-center gap-1 text-[11px] shrink-0 cursor-pointer shadow-2xs"
          >
            Run
            <CornerDownLeft className="w-3 h-3" />
          </button>
        </form>

        {/* Quick Suggestion Chips */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200 dark:border-[#1C1C28]">
          <span className="text-[10px] text-slate-500 dark:text-[var(--text-muted)] font-sans uppercase font-semibold">
            Suggested Commands:
          </span>
          <div className="flex flex-wrap gap-1.5">
            {COMMAND_SUGGESTIONS.map((chip) => (
              <button
                key={chip.cmd}
                onClick={() => {
                  executeCommand(chip.cmd);
                  inputRef.current?.focus();
                }}
                className="px-2.5 py-1 rounded bg-white hover:bg-[var(--primary-bg)] dark:bg-[#1A1A24] dark:hover:bg-[var(--primary-bg)] border border-slate-200 dark:border-[#2A2A38] hover:border-[var(--primary-border)] text-slate-700 dark:text-[var(--text-secondary)] hover:text-[var(--primary-text)] text-[11px] font-mono transition-all duration-150 cursor-pointer shadow-2xs"
              >
                {chip.cmd}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
