"use client";

import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { formatNumber } from "@/lib/utils";
import { EcosystemMapPreview } from "./EcosystemMapPreview";
import {
  BarChart3, Zap, ArrowRight,
  Search, Activity, Trophy, Layers, CircleDot, TrendingUp, TrendingDown,
  FlaskConical, ChevronDown, ChevronUp, Cpu, DollarSign, Terminal, HardDrive
} from "lucide-react";
import { ThemeToggle } from "@/components/shared/ThemeToggle";
import { useEffect, useState, useRef } from "react";
import type { LeaderboardRow, ForecastData, MarketHour } from "@/types";

function GithubIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
    </svg>
  );
}

const fadeUp = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 100, damping: 15 } } };
const stagger = { show: { transition: { staggerChildren: 0.08 } } };

// Matches design system exactly
const REGIME_COLORS: Record<string, string> = {
  undersaturated: "#52666E",
  healthy:        "#00A86B",
  congested:      "#E8A020",
  spike:          "#E5484D",
};

function classifyRegime(max: number): "undersaturated" | "healthy" | "congested" | "spike" {
  if (max >= 6) return "spike";
  if (max >= 4) return "congested";
  if (max >= 3) return "healthy";
  return "undersaturated";
}

const REGIME_CONF = {
  undersaturated: {
    label: "Undersaturated",
    color: REGIME_COLORS.undersaturated,
    badgeStyle: { background: "rgba(82,102,110,0.08)", color: "#8E8EA8", borderColor: "rgba(82,102,110,0.2)" },
  },
  healthy: {
    label: "Healthy",
    color: REGIME_COLORS.healthy,
    badgeStyle: { background: "rgba(0,168,107,0.08)", color: "#10B981", borderColor: "rgba(0,168,107,0.2)" },
  },
  congested: {
    label: "Congested",
    color: REGIME_COLORS.congested,
    badgeStyle: { background: "rgba(232,160,32,0.08)", color: "#F59E0B", borderColor: "rgba(232,160,32,0.2)" },
  },
  spike: {
    label: "Fee Spike",
    color: REGIME_COLORS.spike,
    badgeStyle: { background: "rgba(229,72,77,0.08)", color: "#EF4444", borderColor: "rgba(229,72,77,0.2)" },
  },
} as const;

function AnimatedCounter({ value, suffix = "" }: { value: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    const dur = 1200;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min((now - start) / dur, 1);
      const ease = 1 - Math.pow(1 - t, 3);
      setCount(Math.round(value * ease));
      if (t < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [value]);
  return <>{formatNumber(count)}{suffix}</>;
}

// BPO upgrade history — purple for Pectra (live, important), neutral slate for Fusaka
const BPO_UPGRADES = [
  {
    name: "Dencun",
    eip: "EIP-4844",
    date: "Mar 13, 2024",
    block: "19,426,587",
    target: 3,
    max: 6,
    tagline: "Birth of the blob market",
    bgStyle: { background: "linear-gradient(135deg, rgba(59,130,246,0.04) 0%, transparent 100%)" },
    borderColor: "var(--border)",
    badgeStyle: { background: "rgba(59,130,246,0.08)", color: "#60A5FA", borderColor: "rgba(59,130,246,0.2)" },
    dotColor: "#60A5FA",
    footerNote: "EIP-4844 Activated",
  },
  {
    name: "Pectra",
    eip: "EIP-7691",
    date: "Apr 2025",
    block: "22,431,084",
    target: 6,
    max: 9,
    tagline: "2× blob throughput",
    bgStyle: { background: "linear-gradient(135deg, rgba(139,92,246,0.06) 0%, transparent 100%)" },
    borderColor: "var(--primary)",
    badgeStyle: { background: "rgba(139,92,246,0.08)", color: "#A78BFA", borderColor: "rgba(139,92,246,0.25)" },
    dotColor: "#8B5CF6",
    footerNote: "Active parameters",
  },
  {
    name: "Fusaka",
    eip: "BPO2",
    date: "Late 2025",
    block: "24,833,256",
    target: 12,
    max: 18,
    tagline: "4× throughput from Dencun",
    bgStyle: { background: "linear-gradient(135deg, rgba(82,102,110,0.04) 0%, transparent 100%)" },
    borderColor: "var(--border-subtle)",
    badgeStyle: { background: "rgba(82,102,110,0.08)", color: "#8E8EA8", borderColor: "rgba(82,102,110,0.2)" },
    dotColor: "#6B7280",
    footerNote: "Scheduled upgrade",
  },
];

const USER_TYPES = [
  {
    icon: Layers,
    title: "Rollup Teams",
    description: "Track your DA cost efficiency vs competitors. Know exactly when to submit blobs, how well you pack, and what your cost per byte looks like over time.",
    href: "/leaderboard",
    cta: "RUN EFFICIENCY DIAGNOSTICS",
    iconColor: "#8B5CF6",
    iconBgStyle: { background: "rgba(139,92,246,0.08)" },
  },
  {
    icon: FlaskConical,
    title: "Protocol Researchers",
    description: "Study market regimes, BPO upgrade impact, and 90-day utilization patterns. Understand how Dencun → Pectra → Fusaka reshaped the DA landscape.",
    href: "/research",
    cta: "OPEN RESEARCH DECK",
    iconColor: "#00A86B",
    iconBgStyle: { background: "rgba(16,185,129,0.08)" },
  },
  {
    icon: Zap,
    title: "MEV Strategists",
    description: "Monitor congestion in real time. Identify healthy windows for submission, track fee pressure trends, and act before congestion spikes.",
    href: "/market",
    cta: "MONITOR REGIME LIFECYCLE",
    iconColor: "#F59E0B",
    iconBgStyle: { background: "rgba(245,158,11,0.08)" },
  },
  {
    icon: DollarSign,
    title: "Protocol Economists",
    description: "Model fee market dynamics across all blob parameter upgrades. Compare target fill rates, excess blob gas trends, and structural shifts epoch by epoch.",
    href: "/research?tab=bpo",
    cta: "BPO PARAMETER MATRIX",
    iconColor: "#8E8EA8",
    iconBgStyle: { background: "rgba(142,142,168,0.08)" },
  },
];

interface Props {
  stats: { total_txs: number; total_blobs: number; rollup_count: number; avg_utilization_24h: number };
  leaderboard: LeaderboardRow[];
  forecast: ForecastData | null;
  market: MarketHour[];
}

export function LandingClient({ stats, leaderboard, forecast, market }: Props) {
  const [scrolled, setScrolled] = useState(false);
  const [aboutExpanded, setAboutExpanded] = useState(false);
  const [terminalHistory, setTerminalHistory] = useState<{ type: "input" | "output"; text: string }[]>([
    { type: "output", text: "BlobLens System Terminal v2.0.4 // Connection established." },
    { type: "output", text: "Type a command or click a quick-command chip below to query live DA metrics." },
  ]);

  const recentHour = market[market.length - 1];
  const regime = recentHour ? classifyRegime(recentHour.max_blobs_in_block) : "undersaturated";
  const currentFeeGwei = forecast ? forecast.current_fee_wei / 1e9 : 0;
  const avgUtilization = recentHour?.avg_utilization ?? 0;
  const rc = REGIME_CONF[regime];
  const top3 = [...leaderboard].sort((a, b) => b.efficiency_score - a.efficiency_score).slice(0, 3);
  const activeRollups = leaderboard.filter(r => r.rollup !== "UNKNOWN").length;

  const terminalEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = document.querySelector("[data-landing-scroll]");
    if (!el) return;
    const handler = () => setScrolled(el.scrollTop > 20);
    el.addEventListener("scroll", handler, { passive: true });
    return () => el.removeEventListener("scroll", handler);
  }, []);

  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [terminalHistory]);

  const executeCommand = (cmd: string) => {
    const cleanCmd = cmd.trim().toLowerCase();
    if (!cleanCmd) return;
    
    const newHistory = [...terminalHistory, { type: "input" as const, text: cmd }];

    if (cleanCmd === "/help" || cleanCmd === "help") {
      newHistory.push({
        type: "output",
        text: "Available commands:\n  /stats    - Display macro DA throughput metrics.\n  /regime   - Query current EIP-4844 market regime.\n  /top3     - Print top 3 rollups sorted by efficiency score.\n  /clear    - Clear terminal history."
      });
    } else if (cleanCmd === "/stats" || cleanCmd === "stats") {
      newHistory.push({
        type: "output",
        text: `Retrieving network metrics...\nTOTAL BLOBS INDEXED: ${formatNumber(stats.total_blobs)}\nTOTAL TRANSACTIONS:  ${formatNumber(stats.total_txs)}\nACTIVE ROLLUPS:      ${stats.rollup_count}\nAVG UTILIZATION:     ${stats.avg_utilization_24h}%`
      });
    } else if (cleanCmd === "/regime" || cleanCmd === "regime") {
      newHistory.push({
        type: "output",
        text: `Querying EIP-4844 market conditions...\nCURRENT REGIME:      ${regime.toUpperCase()}\nBASE FEE:            ${currentFeeGwei > 0 ? currentFeeGwei.toFixed(3) + ' GWEI' : '1 WEI'}\nAVG UTILIZATION:     ${avgUtilization.toFixed(1)}%\nSTATUS:              ${forecast && forecast.excess_trend > 0 ? 'CONGESTION_TRENDING_UP' : 'NOMINAL_STABLE'}`
      });
    } else if (cleanCmd === "/top3" || cleanCmd === "top3") {
      const listText = top3.map((r, i) => 
        `  ${i+1}. ${r.rollup.toUpperCase()} - Score: ${Math.round(r.efficiency_score)}/100 (Packing: ${Math.round(r.packing_score)}%, Timing: ${Math.round(r.timing_score)}%)`
      ).join("\n");
      newHistory.push({
        type: "output",
        text: `Fetching rollup efficiency standings...\n${listText || "  No active rollup rankings found."}`
      });
    } else if (cleanCmd === "/clear" || cleanCmd === "clear") {
      setTerminalHistory([]);
      return;
    } else {
      newHistory.push({
        type: "output",
        text: `Command '${cmd}' not recognized. Type /help for a list of valid queries.`
      });
    }
    setTerminalHistory(newHistory);
  };

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/30 relative">
      {/* ── Background Orbs ── */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0" aria-hidden>
        <div className="landing-orb landing-orb-1" />
        <div className="landing-orb landing-orb-2" />
        <div className="landing-orb landing-orb-3" />
      </div>

      {/* ── Navbar ── */}
      <nav className={`fixed top-0 w-full z-50 transition-all duration-500 ${
        scrolled ? "bg-background/85 backdrop-blur-xl border-b border-border/35 shadow-sm" : "bg-transparent"
      }`}>
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 md:px-10 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group shrink-0">
            <motion.div
              initial={{ rotate: -90, scale: 0.8, opacity: 0 }}
              animate={{ rotate: 0, scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 150, damping: 12 }}
              className="h-9 w-9 rounded-sm border border-primary/30 bg-gradient-to-br from-primary/20 to-accent/10 flex items-center justify-center shadow-[0_0_10px_rgba(139,92,246,0.15)] group-hover:shadow-[0_0_15px_rgba(139,92,246,0.25)] transition-all duration-300"
            >
              <Image src="/brand/bloblogo.png" alt="" width={18} height={18} className="brightness-150" />
            </motion.div>
            <motion.div initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 }}>
              <p className="text-[15px] font-bold tracking-tight leading-none">
                Blob<span className="text-primary">Lens</span>
              </p>
              <p className="text-[8px] font-bold uppercase tracking-[0.22em] text-text-tertiary leading-none mt-1" style={{ fontFamily: "var(--font-mono)" }}>
                DA Intelligence
              </p>
            </motion.div>
          </Link>

          <div className="flex items-center gap-1.5">
            {[
              { label: "Dashboard",   href: "/dashboard" },
              { label: "Research",    href: "/research" },
              { label: "Market",      href: "/market" },
              { label: "Leaderboard", href: "/leaderboard" },
            ].map((item, i) => (
              <motion.div key={item.label} initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 + i * 0.04 }}>
                <Link href={item.href}
                  className="relative px-3.5 py-2 text-[11px] font-bold uppercase tracking-wider text-text-secondary/80 hover:text-primary transition-colors hidden lg:block group font-mono">
                  {item.label}
                  <span className="absolute bottom-1 left-3.5 right-3.5 h-0.5 bg-primary scale-x-0 group-hover:scale-x-100 transition-transform duration-150 origin-left" />
                </Link>
              </motion.div>
            ))}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.45 }}
              className="flex items-center gap-2 ml-2">
              <div className="h-5 w-px bg-border/30 hidden md:block" />
              <ThemeToggle />
              <Link href="/dashboard"
                className="group relative overflow-hidden px-4.5 py-2 border border-primary bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-widest rounded-sm transition-all hover:bg-primary hover:text-white shadow-[0_0_10px_rgba(139,92,246,0.1)] hover:shadow-[0_0_15px_rgba(139,92,246,0.3)]">
                <span className="relative font-mono">Launch Console</span>
              </Link>
            </motion.div>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="relative pt-36 pb-20 overflow-hidden">
        {/* Dot grid */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{
          backgroundImage: "radial-gradient(circle, var(--text-secondary) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }} />

        <motion.div className="max-w-5xl mx-auto px-4 sm:px-6 md:px-10 relative z-10 text-center"
          variants={stagger} initial="hidden" animate="show">

          {/* Live badge */}
          <motion.div variants={fadeUp}
            className="inline-flex items-center gap-2 px-3 py-1.5 border border-dotted border-primary/30 bg-primary/8 rounded-sm mb-8 backdrop-blur-sm">
            <span className="relative flex h-2 w-2 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
            </span>
            <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-primary font-mono">LIVE // MAINNET OBSERVER // DENCUN → PECTRA → FUSAKA</span>
          </motion.div>

          {/* Headline */}
          <motion.h1 variants={fadeUp}
            className="text-[2.75rem] sm:text-[4rem] md:text-[5.5rem] font-bold tracking-[-0.03em] mb-6 leading-[1.02] font-display">
            <span className="block">Data Availability</span>
            <span className="block">Intelligence for{" "}
              <span className="relative inline-block px-1">
                <span className="relative z-10 bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent bg-[length:200%_auto] animate-[shimmer_4s_linear_infinite]">
                  Ethereum L2s
                </span>
              </span>
            </span>
          </motion.h1>

          {/* Subtitle */}
          <motion.div variants={fadeUp} className="max-w-2xl mx-auto mb-10">
            <p className="text-base sm:text-lg md:text-xl text-text-secondary/80 leading-relaxed font-normal">
              Analytics for the blob economy — monitoring fee market regimes, packing densities, and rollup timing efficiency across every BPO upgrade.
              {!aboutExpanded && (
                <button onClick={() => setAboutExpanded(true)}
                  className="ml-2 inline-flex items-center gap-0.5 text-primary font-bold text-sm hover:gap-1.5 transition-all font-mono">
                  [ read_docs ] <ChevronDown className="h-3.5 w-3.5" />
                </button>
              )}
            </p>
            <AnimatePresence>
              {aboutExpanded && (
                <motion.div
                  initial={{ opacity: 0, height: 0, marginTop: 0 }}
                  animate={{ opacity: 1, height: "auto", marginTop: 20 }}
                  exit={{ opacity: 0, height: 0, marginTop: 0 }}
                  transition={{ duration: 0.3, ease: "easeInOut" }}
                  className="overflow-hidden"
                >
                  <div className="font-mono text-[11px] text-text-secondary/80 leading-relaxed text-left bg-surface/80 border border-dashed border-border-strong rounded-sm px-6 py-5 backdrop-blur-sm crt-grid shadow-[0_4px_24px_rgba(0,0,0,0.5)] relative">
                    <div className="absolute top-2 right-2 flex gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-status-healthy" />
                      <span className="h-1.5 w-1.5 rounded-full bg-status-warning animate-pulse" />
                      <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                    </div>
                    <p className="text-primary font-bold mb-2">&gt; INITIALIZING BLOBLENS PROTOCOL CONSOLE...</p>
                    <p className="text-text-tertiary mb-3">VERSION: 2.0.4 // STATUS: NOMINAL // REVALIDATE: 60S</p>
                    <p className="text-text-primary/95 mb-4 leading-relaxed">
                      BlobLens is an open-source data availability observatory for Ethereum. We index and parse Type-3 blob transactions from the Dencun genesis (EIP-4844) through the Pectra (EIP-7691) expansion and the future Fusaka (BPO2) upgrades. By analyzing blob fullness and block space capacity, we compute real-time fee market regime states and rollup cost-efficiency scores.
                    </p>
                    <p className="text-text-primary/95 leading-relaxed">
                      Designed exclusively for rollup engineering teams, MEV searchers, protocol economists, and block space researchers.
                    </p>
                    <button onClick={() => setAboutExpanded(false)}
                      className="mt-4 inline-flex items-center gap-1 text-[10px] font-bold text-text-tertiary hover:text-primary transition-colors">
                      <ChevronUp className="h-3.5 w-3.5" /> [ collapse_terminal ]
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* CTAs */}
          <motion.div variants={fadeUp} className="flex flex-col sm:flex-row items-center justify-center gap-3.5 mb-14 max-w-md mx-auto sm:max-w-none">
            <Link href="/dashboard"
              className="group w-full sm:w-auto px-8 py-3.5 bg-primary text-white border border-primary hover:bg-primary-hover rounded-sm font-bold font-mono text-[11px] uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-[0_0_15px_rgba(139,92,246,0.2)] hover:shadow-[0_0_25px_rgba(139,92,246,0.45)]">
              Explore Dashboard
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
            <a href="https://github.com/AvarchLLC/blob_lens" target="_blank" rel="noopener noreferrer"
              className="w-full sm:w-auto px-8 py-3.5 bg-surface/40 backdrop-blur border border-border rounded-sm font-bold font-mono text-[11px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-surface-elevated hover:border-primary/30 transition-all">
              <GithubIcon className="h-4 w-4" /> View Source
            </a>
          </motion.div>

          {/* Stats strip */}
          <motion.div variants={fadeUp}
            className="grid grid-cols-2 md:grid-cols-4 gap-px border border-border/30 bg-border/20 max-w-4xl mx-auto mb-6 rounded-sm overflow-hidden">
            {[
              { label: "Total Blobs",       val: stats.total_blobs,        icon: Layers,    suffix: "" },
              { label: "Transactions",      val: stats.total_txs,          icon: TrendingUp, suffix: "" },
              { label: "Active Rollups",    val: stats.rollup_count,       icon: CircleDot, suffix: "" },
              { label: "Avg Utilization",   val: stats.avg_utilization_24h, icon: Activity,  suffix: "%" },
            ].map((s) => (
              <div key={s.label} className="bg-surface/50 backdrop-blur-md px-6 py-6 text-center group hover:bg-surface-elevated/80 transition-all duration-300 relative tech-bracket">
                <s.icon className="h-4 w-4 text-primary/40 mx-auto mb-2.5 group-hover:text-primary transition-colors" />
                <p className="font-mono text-2xl md:text-3xl font-extrabold text-text-primary tracking-tighter shadow-sm">
                  <AnimatedCounter value={s.val} suffix={s.suffix} />
                </p>
                <p className="text-[8px] font-bold uppercase tracking-[0.2em] text-text-tertiary mt-2 font-mono">{s.label}</p>
              </div>
            ))}
          </motion.div>

          {/* ── Interactive Quick-Terminal ── */}
          <motion.div variants={fadeUp} className="max-w-4xl mx-auto mb-8 text-left">
            <div className="border border-dashed border-border-strong bg-surface/90 backdrop-blur-md overflow-hidden rounded-sm tech-bracket relative group/card crt-grid shadow-[0_4px_24px_rgba(0,0,0,0.4)]">
              {/* Terminal Header */}
              <div className="flex items-center justify-between px-5 py-3 border-b border-border/20 bg-background/50 select-none">
                <div className="flex items-center gap-2.5">
                  <Terminal className="h-4 w-4 text-primary animate-pulse" />
                  <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-text-secondary/70 font-mono">
                    SYSTEM_INTELLIGENCE_TERMINAL // USER: ANONYMOUS
                  </span>
                </div>
                <div className="flex gap-1.5">
                  <span className="h-2 w-2 bg-status-healthy rounded-full" />
                  <span className="h-2 w-2 bg-status-warning rounded-full" />
                  <span className="h-2 w-2 bg-status-critical rounded-full" />
                </div>
              </div>

              {/* Terminal Body */}
              <div className="p-5 font-mono text-[11px] h-48 overflow-y-auto custom-scrollbar flex flex-col gap-2 bg-black/40">
                {terminalHistory.map((h, i) => (
                  <div key={i} className={h.type === "input" ? "text-primary font-bold" : "text-text-primary/90 whitespace-pre-wrap"}>
                    {h.type === "input" ? `bloblens:~$ ${h.text}` : h.text}
                  </div>
                ))}
                <div ref={terminalEndRef} />
              </div>

              {/* Terminal Input & Quick Commands */}
              <div className="border-t border-border/20 px-5 py-3 bg-background/50 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const form = e.currentTarget;
                    const input = form.elements.namedItem("terminal-input") as HTMLInputElement;
                    if (input.value.trim()) {
                      executeCommand(input.value);
                      input.value = "";
                    }
                  }}
                  className="flex-grow flex items-center gap-2 font-mono text-[11px]"
                >
                  <span className="text-primary shrink-0">bloblens:~$</span>
                  <input
                    name="terminal-input"
                    type="text"
                    autoComplete="off"
                    placeholder="Type a command (e.g. /stats)..."
                    className="flex-grow bg-transparent border-none outline-none text-text-primary placeholder-text-tertiary font-mono"
                  />
                  <button type="submit" className="hidden" />
                </form>

                {/* Quick commands */}
                <div className="flex flex-wrap gap-2 shrink-0">
                  {[
                    { label: "/help", cmd: "/help" },
                    { label: "/stats", cmd: "/stats" },
                    { label: "/regime", cmd: "/regime" },
                    { label: "/top3", cmd: "/top3" },
                    { label: "/clear", cmd: "/clear" },
                  ].map((chip) => (
                    <button
                      key={chip.label}
                      onClick={() => executeCommand(chip.cmd)}
                      className="px-2.5 py-1 border border-border/40 hover:border-primary/50 bg-surface/30 hover:bg-primary/10 text-[9px] font-bold uppercase tracking-wider text-text-secondary hover:text-primary transition-all font-mono rounded-none"
                    >
                      {chip.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>

          {/* ── Live Regime Timeline — the money shot ── */}
          {market.length > 1 && (
            <motion.div variants={fadeUp} className="max-w-4xl mx-auto mt-8">
              <div className="border border-dashed border-border-strong bg-surface/75 backdrop-blur-md overflow-hidden rounded-sm tech-bracket relative group/card">
                {/* Header row */}
                <div className="flex items-center justify-between px-5 py-3.5 border-b border-border/20">
                  <div className="flex items-center gap-2.5">
                    <span className="relative flex h-1.5 w-1.5 shrink-0">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-primary" />
                    </span>
                    <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-text-secondary/70 font-mono">
                      SYSTEM_REGIME_LIFECYCLE // LAST {market.length} HOURS
                    </span>
                  </div>
                  <span className="text-[9px] font-bold px-2.5 py-0.5 rounded-none border font-mono tracking-widest"
                    style={{ ...rc.badgeStyle }}>
                    {rc.label.toUpperCase()}
                  </span>
                </div>

                {/* Regime blocks */}
                <div className="px-5 pt-5 pb-2">
                  <div className="flex w-full h-7 gap-0.5">
                    {market.map((d, i) => {
                      const r = classifyRegime(d.max_blobs_in_block);
                      return (
                        <div
                          key={i}
                          className="flex-1 rounded-none transition-all duration-150 hover:opacity-100 border-t-2 border-transparent hover:border-primary"
                          style={{ backgroundColor: REGIME_COLORS[r], opacity: 0.8 }}
                          title={`${d.hour} — ${r} (max ${d.max_blobs_in_block} blobs/block)`}
                        />
                      );
                    })}
                  </div>
                  {/* Legend */}
                  <div className="flex items-center justify-between mt-3 mb-3">
                    <span className="text-[9px] text-text-tertiary font-mono">
                      {market[0]?.hour ? new Date(market[0].hour).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : ""}
                    </span>
                    <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5">
                      {(["undersaturated", "healthy", "congested", "spike"] as const).map(key => (
                        <div key={key} className="flex items-center gap-1.5">
                          <span className="h-2.5 w-2.5 rounded-none shrink-0" style={{ background: REGIME_COLORS[key], border: "1px solid rgba(255,255,255,0.05)" }} />
                          <span className="text-[8px] font-bold uppercase tracking-[0.1em] text-text-tertiary font-mono">
                            {key === "undersaturated" ? "UNDERSAT" : key.toUpperCase()}
                          </span>
                        </div>
                      ))}
                    </div>
                    <span className="text-[9px] text-text-tertiary font-mono">T_ZERO (NOW)</span>
                  </div>
                </div>

                {/* Footer stats */}
                <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 px-5 py-3 border-t border-border/15 bg-background/30">
                  <span className="text-[10px] font-mono text-text-secondary/70">
                    FEE: <span className="font-bold text-text-primary">{currentFeeGwei > 0 ? `${currentFeeGwei.toFixed(3)} GWEI` : "1 WEI"}</span>
                  </span>
                  <span className="h-3 w-px bg-border/30 hidden sm:inline" />
                  <span className="text-[10px] font-mono text-text-secondary/70">
                    UTIL: <span className="font-bold text-text-primary">{avgUtilization.toFixed(1)}%</span>
                  </span>
                  <span className="h-3 w-px bg-border/30 hidden sm:inline" />
                  <span className="text-[10px] font-mono text-text-secondary/70">
                    ACTIVE L2S: <span className="font-bold text-text-primary">{activeRollups}</span>
                  </span>
                  {forecast && (
                    <>
                      <span className="h-3 w-px bg-border/30 hidden sm:inline" />
                      <span className="text-[10px] font-mono font-bold flex items-center gap-1"
                        style={{ color: forecast.excess_trend > 0 ? "var(--status-warning)" : "var(--status-healthy)" }}>
                        {forecast.excess_trend > 0
                          ? <TrendingUp className="h-3 w-3" />
                          : <TrendingDown className="h-3 w-3" />}
                        PRESSURE {forecast.excess_trend > 0 ? "RISING" : "EASING"}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </motion.div>
      </section>

      {/* ── Who is this for ── */}
      <motion.section className="py-24 border-y border-border/20 relative"
        initial="hidden" whileInView="show" viewport={{ once: true, margin: "-80px" }} variants={stagger}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 md:px-10">
          <motion.div variants={fadeUp} className="text-center mb-16">
            <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-primary mb-3 block font-mono">TARGET AUDIENCE</span>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4 font-display">
              Ecosystem-Wide Data Availability Telemetry
            </h2>
            <p className="text-text-secondary/70 max-w-lg mx-auto text-sm leading-relaxed">
              Tailored console interfaces for engineers, economists, searchers, and core protocol developers.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {USER_TYPES.map((u) => (
              <motion.div key={u.title} variants={fadeUp}
                className="cosmic-card tech-bracket flex flex-col"
                style={{ backgroundColor: "var(--surface)" }}>
                <div className="h-10 w-10 rounded-sm flex items-center justify-center mb-4 group-hover:scale-105 transition-transform shrink-0 border border-border/50"
                  style={u.iconBgStyle}>
                  <u.icon className="h-5 w-5" style={{ color: u.iconColor }} />
                </div>
                <h3 className="font-bold text-sm text-text-primary mb-2 font-display">{u.title}</h3>
                <p className="text-xs text-text-secondary/70 leading-relaxed mb-6 flex-1">{u.description}</p>
                <Link href={u.href}
                  className="inline-flex items-center gap-1.5 text-[10px] font-bold font-mono hover:gap-3 transition-all tracking-wider"
                  style={{ color: u.iconColor }}>
                  [ {u.cta} ] <ArrowRight className="h-3 w-3" />
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.section>

      {/* ── The DA Layer problem ── */}
      <motion.section className="py-24 relative"
        initial="hidden" whileInView="show" viewport={{ once: true, margin: "-100px" }} variants={stagger}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 md:px-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <motion.div variants={fadeUp}>
              <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-primary mb-3 block font-mono">CONSOL DATA REQUISITE</span>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-6 leading-tight font-display">
                Standard Block Explorers<br />Are Blind to Blobs
              </h2>
              <p className="text-text-secondary/80 leading-relaxed mb-8 text-sm">
                EIP-4844 introduced a distinct pricing market running parallel to L1 execution. Typical explorers only reveal transaction hashes. BlobLens decodes the actual data throughput, calculating timing metrics and gas-saving ratios across every scaling node.
              </p>
              <div className="space-y-3.5">
                {[
                  { icon: DollarSign, text: "DA cost-per-byte tracking vs L1 Calldata baselines", color: "var(--status-warning)" },
                  { icon: Activity,   text: "Hour-by-hour fee market regime classification histories", color: "var(--primary)" },
                  { icon: Search,     text: "Mempool congestion forecasts using excess fee trends", color: "var(--accent)" },
                ].map((item, i) => (
                  <motion.div key={i} variants={fadeUp} className="flex items-center gap-3.5 group">
                    <div className="h-9 w-9 rounded-sm border border-border/30 flex items-center justify-center shrink-0 opacity-80 group-hover:opacity-100 group-hover:border-primary/40 transition-all duration-300"
                      style={{ background: `color-mix(in srgb, ${item.color} 8%, transparent)` }}>
                      <item.icon className="h-4 w-4" style={{ color: item.color }} />
                    </div>
                    <span className="text-xs font-semibold text-text-primary/80 group-hover:text-text-primary transition-colors font-mono">{item.text.toUpperCase()}</span>
                  </motion.div>
                ))}
              </div>
            </motion.div>
            <motion.div variants={fadeUp} className="relative group">
              <div className="absolute -inset-6 rounded-none blur-3xl opacity-0 group-hover:opacity-100 transition-all duration-1000"
                style={{ background: "radial-gradient(ellipse, rgba(139,92,246,0.1) 0%, transparent 70%)" }} />
              <div className="relative rounded-sm overflow-hidden border border-border-strong shadow-2xl scanline-effect tech-bracket group">
                <img src="/bloblens.png" alt="BlobLens Dashboard" className="w-full grayscale-[15%] group-hover:grayscale-0 transition-all duration-500" />
                <div className="absolute inset-0 bg-gradient-to-t from-background/40 to-transparent pointer-events-none" />
                
                {/* Precision camera HUD overlay */}
                <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2 py-1 bg-black/75 border border-border/40 font-mono text-[8px] text-status-critical tracking-wider select-none z-10">
                  <span className="h-1.5 w-1.5 rounded-full bg-status-critical animate-pulse" />
                  [REC] TELEMETRY_FEED
                </div>
                <div className="absolute bottom-3 left-3 font-mono text-[8px] text-primary bg-black/75 border border-border/40 px-2 py-1 select-none z-10">
                  CRT_MODE: MONOCHROME_RAW // SCALE: 100%
                </div>
                <div className="absolute bottom-3 right-3 font-mono text-[8px] text-text-secondary/60 bg-black/75 border border-border/40 px-2 py-1 select-none z-10">
                  OCTOBER_2026_MATRIX
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </motion.section>

      {/* ── BPO Timeline ── */}
      <motion.section className="py-24 border-y border-border/20 relative"
        initial="hidden" whileInView="show" viewport={{ once: true, margin: "-80px" }} variants={stagger}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 md:px-10">
          <motion.div variants={fadeUp} className="text-center mb-16">
            <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-primary mb-3 block font-mono">CAPACITY EVOLUTION</span>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4 font-display">
              Blob Parameter Upgrade Ledger
            </h2>
            <p className="text-text-secondary/70 max-w-lg mx-auto text-sm">
              Observing network limits and gas parameters across Dencun, Pectra, and Fusaka epochs.
            </p>
          </motion.div>

          <div className="relative">
            {/* Timeline connector — dotted line */}
            <div className="hidden lg:block absolute top-[2.8rem] left-[15%] right-[15%] border-t border-dashed border-border-strong h-px z-0" />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 relative z-10">
              {BPO_UPGRADES.map((u) => (
                <motion.div key={u.name} variants={fadeUp}
                  className="cosmic-card tech-bracket flex flex-col justify-between"
                  style={{ ...u.bgStyle, borderColor: u.borderColor }}>

                  <div className="hidden lg:flex items-center justify-center absolute -top-[1.1rem] left-1/2 -translate-x-1/2">
                    <span className="h-3 w-3 border border-background ring-4 ring-background shadow-lg"
                      style={{ backgroundColor: u.dotColor }} />
                  </div>

                  <div>
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-bold text-text-primary font-display">{u.name}</h3>
                        <p className="text-[10px] text-text-tertiary mt-1 font-mono">{u.date.toUpperCase()} // BLOCK {u.block}</p>
                      </div>
                      <span className="text-[8px] font-bold px-2 py-0.5 rounded-none border font-mono tracking-widest bg-background/60"
                        style={u.badgeStyle}>
                        {u.eip}
                      </span>
                    </div>

                    <p className="text-xs font-semibold text-text-primary/80 mb-5 font-mono uppercase tracking-wider">{u.tagline}</p>

                    <div className="space-y-2.5 border-t border-dashed border-border/30 pt-4">
                      {[
                        { label: "Target blobs / block", val: u.target },
                        { label: "Max blobs / block",    val: u.max },
                        { label: "Max throughput",        val: `${(u.max * 128).toLocaleString()} KB/block` },
                      ].map(({ label, val }) => (
                        <div key={label} className="flex items-center justify-between text-xs font-mono">
                          <span className="text-text-tertiary uppercase text-[9px]">{label}</span>
                          <span className="font-bold text-text-primary">{val}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {u.footerNote && (
                    <div className="mt-5 pt-3 border-t border-border/20 flex items-center justify-between">
                      <span className="text-[8px] font-bold uppercase tracking-widest text-text-tertiary font-mono">{u.footerNote}</span>
                      <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          </div>

          <motion.div variants={fadeUp} className="mt-12 text-center">
            <Link href="/research?tab=bpo"
              className="inline-flex items-center gap-2 px-6 py-3 bg-surface/40 backdrop-blur border border-border rounded-sm font-bold font-mono text-[10px] uppercase tracking-wider hover:bg-surface-elevated hover:border-primary/20 transition-all group">
              <Cpu className="h-4 w-4 text-primary" />
              Explore Parameter Analytics
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </motion.div>
        </div>
      </motion.section>

      {/* ── Features ── */}
      <motion.section className="py-28" initial="hidden" whileInView="show" viewport={{ once: true, margin: "-100px" }} variants={stagger}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 md:px-10">
          <motion.div variants={fadeUp} className="text-center mb-16">
            <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-primary mb-3 block font-mono">CORE WIDGETS</span>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4 font-display">Telemetry Console Focus</h2>
            <p className="text-text-secondary/70 max-w-lg mx-auto text-sm">Deep, granular analytics scoring systems rendered in vector grids.</p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Card 1 — DA Cost Efficiency */}
            <motion.div variants={fadeUp}
              className="relative border border-border-strong bg-surface/80 backdrop-blur p-8 md:p-10 overflow-hidden group hover:border-primary/40 transition-all duration-500 rounded-sm tech-bracket">
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                style={{ background: "linear-gradient(135deg, rgba(139,92,246,0.04) 0%, transparent 60%)" }} />
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent scale-x-0 group-hover:scale-x-100 transition-transform duration-500" />
              <div className="relative">
                <div className="inline-flex items-center justify-center h-12 w-12 rounded-sm mb-6 border border-border/50 bg-primary/10 group-hover:scale-105 transition-transform"
                  style={{ background: "rgba(139,92,246,0.08)" }}>
                  <Trophy className="h-5 w-5 text-primary" />
                </div>
                <h3 className="text-xl font-bold mb-3 tracking-tight font-display">DA Cost-Efficiency Ranks</h3>
                <p className="text-xs text-text-secondary/80 leading-relaxed mb-6">
                  Every active rollup is scored from 0-100 on their block packing density and transaction fee-market timing performance, identifying optimized sequencers.
                </p>
                {top3.length > 0 ? (
                  <div className="space-y-3.5 mb-6 border-y border-dashed border-border/30 py-4 font-mono">
                    {top3.map((row) => (
                      <div key={row.rollup} className="flex items-center gap-3">
                        <span className="text-[10px] font-bold text-text-primary w-24 shrink-0 truncate uppercase">{row.rollup}</span>
                        <div className="flex-1 h-2 bg-background border border-border/30 rounded-none overflow-hidden">
                          <div
                            className="h-full bg-primary"
                            style={{ width: `${Math.max(4, Math.round(row.efficiency_score))}%` }}
                          />
                        </div>
                        <span className="text-[10px] font-bold text-primary w-8 text-right shrink-0">{Math.round(row.efficiency_score)}</span>
                      </div>
                    ))}
                    <p className="text-[8px] text-text-tertiary pt-1 uppercase">
                      Formula: 70% packing density + 30% fee timing · 24h sample
                    </p>
                  </div>
                ) : (
                  <div className="h-24 flex items-center justify-center mb-6 border-y border-dashed border-border/30">
                    <span className="text-xs text-text-tertiary font-mono">NO SYNCED DATA IN WINDOW</span>
                  </div>
                )}
                <Link href="/leaderboard" className="inline-flex items-center gap-1.5 text-[10px] font-bold font-mono text-primary hover:gap-3 transition-all">
                  [ RUN EFFICIENCY LEADERBOARD ] <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </motion.div>

            {/* Card 2 — Fee Market Health with live chart */}
            <motion.div variants={fadeUp}
              className="relative border border-border-strong bg-surface/80 backdrop-blur p-8 md:p-10 overflow-hidden group hover:border-primary/40 transition-all duration-500 rounded-sm tech-bracket">
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                style={{ background: "linear-gradient(135deg, rgba(0,168,107,0.03) 0%, transparent 60%)" }} />
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent scale-x-0 group-hover:scale-x-100 transition-transform duration-500" />
              <div className="relative">
                <div className="inline-flex items-center justify-center h-12 w-12 rounded-sm mb-6 border border-border/50 bg-status-healthy/10 group-hover:scale-105 transition-transform"
                  style={{ background: "rgba(0,168,107,0.08)" }}>
                  <Activity className="h-5 w-5" style={{ color: "var(--status-healthy)" }} />
                </div>
                <h3 className="text-xl font-bold mb-3 tracking-tight font-display">Fee Market State Monitor</h3>
                <p className="text-xs text-text-secondary/80 leading-relaxed mb-5">
                  Tracks block saturation rates, categorizes base fee scaling into four regimes, and forecasts congestion indices across future slots.
                </p>

                {/* Embedded regime timeline */}
                {market.length > 1 && (
                  <div className="mb-5 rounded-sm overflow-hidden border border-dashed border-border/40 bg-background/40 font-mono">
                    <div className="px-4 pt-3 pb-1">
                      <p className="text-[8px] font-bold uppercase tracking-[0.2em] text-text-tertiary mb-2">
                        REGIME_TREND_24H
                      </p>
                      <div className="flex w-full h-3 gap-px">
                        {market.map((d, i) => {
                          const r = classifyRegime(d.max_blobs_in_block);
                          return (
                            <div key={i} className="flex-1 rounded-none"
                              style={{ backgroundColor: REGIME_COLORS[r], opacity: 0.75 }} />
                          );
                        })}
                      </div>
                    </div>
                    <div className="flex items-center justify-between px-4 py-2 border-t border-border/20 mt-2 bg-background/20">
                      <span className="text-[9px] text-text-tertiary">
                        FEE: <span className="font-bold text-text-primary">{(forecast?.current_fee_wei ? forecast.current_fee_wei / 1e9 : 0).toFixed(3)} GWEI</span>
                      </span>
                      <span className="text-[9px] font-bold px-2 py-0.5 rounded-none border border-border"
                        style={{ ...rc.badgeStyle, fontSize: "8px" }}>
                        {rc.label.toUpperCase()}
                      </span>
                    </div>
                  </div>
                )}

                <div className="space-y-1.5 mb-6 border-t border-dashed border-border/30 pt-4 font-mono">
                  <div className="flex items-center justify-between py-1 border-b border-border/10">
                    <span className="text-[10px] text-text-secondary/60 uppercase">Mempool Trend</span>
                    {forecast ? (
                      <span className="text-[10px] font-bold flex items-center gap-1"
                        style={{ color: forecast.excess_trend > 0 ? "var(--status-warning)" : "var(--status-healthy)" }}>
                        {forecast.excess_trend > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                        {forecast.excess_trend > 0 ? "STRETCHED" : "NORMAL"}
                      </span>
                    ) : <span className="text-[10px] text-text-tertiary">SYNCING</span>}
                  </div>
                  <div className="flex items-center justify-between py-1">
                    <span className="text-[10px] text-text-secondary/60 uppercase">Avg Slot fullness</span>
                    <span className="text-[10px] font-bold text-text-primary">{(avgUtilization).toFixed(1)}%</span>
                  </div>
                </div>

                <Link href="/market" className="inline-flex items-center gap-1.5 text-[10px] font-bold font-mono text-primary hover:gap-3 transition-all">
                  [ ACCESS MARKET TELEMETRY ] <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </motion.div>
          </div>
        </div>
      </motion.section>

      {/* ── Ecosystem Map ── */}
      <motion.section className="py-28 border-y border-border/20 overflow-hidden"
        initial="hidden" whileInView="show" viewport={{ once: true, margin: "-100px" }} variants={stagger}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 md:px-10">
          <motion.div variants={fadeUp} className="text-center mb-14">
            <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-primary mb-3 block font-mono">TOPOLOGY MATRIX</span>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4 font-display">Ecosystem Co-Occurrence Graph</h2>
            <p className="text-text-secondary/60 max-w-xl mx-auto text-sm">Visualizing transaction dependencies and shared gas pressure networks.</p>
          </motion.div>
          <motion.div variants={fadeUp} className="border border-border bg-surface/30 p-2 rounded-sm tech-bracket relative">
            <div className="absolute top-4 left-4 font-mono text-[9px] text-text-tertiary select-none z-10 uppercase">
              d3_force_directed_graph_preview // active_links
            </div>
            <EcosystemMapPreview />
          </motion.div>
          <motion.div variants={fadeUp} className="mt-12 flex flex-wrap justify-center gap-2">
            {["Base", "Arbitrum", "Optimism", "ZKSync", "Linea", "Starknet", "Mantle", "Taiko", "Scroll", "Blast"].map((r) => (
              <span key={r} className="px-3.5 py-1.5 bg-surface/50 border border-border/40 rounded-none text-[9px] font-bold uppercase tracking-wider text-text-secondary/60 hover:text-primary hover:border-primary/20 transition-all font-mono">
                {r}
              </span>
            ))}
            <span className="px-3.5 py-1.5 bg-primary/8 border border-primary/20 rounded-none text-[9px] font-bold uppercase tracking-wider text-primary font-mono">
              +40 OTHERS
            </span>
          </motion.div>
        </div>
      </motion.section>

      {/* ── CTA ── */}
      <motion.section className="py-28 relative overflow-hidden"
        initial="hidden" whileInView="show" viewport={{ once: true }} variants={stagger}>
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: "radial-gradient(ellipse at 50% 50%, var(--primary) 0%, transparent 65%)", opacity: 0.04 }} />
        <div className="max-w-3xl mx-auto px-4 sm:px-6 md:px-10 text-center relative z-10">
          <motion.h2 variants={fadeUp} className="text-3xl md:text-5xl font-bold tracking-tight mb-5 font-display">
            Observe the Ethereum<br />
            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">Data Availability Layer</span>
          </motion.h2>
          <motion.p variants={fadeUp} className="text-text-secondary/70 mb-10 text-sm font-normal">
            Decode block space dynamics and optimize transaction fees across every network upgrade.
          </motion.p>
          <motion.div variants={fadeUp} className="flex flex-col sm:flex-row items-center justify-center gap-4 max-w-sm mx-auto sm:max-w-none">
            <Link href="/dashboard"
              className="w-full sm:w-auto px-10 py-4 bg-primary text-white border border-primary hover:bg-primary-hover rounded-sm font-bold font-mono text-[11px] uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-[0_0_15px_rgba(139,92,246,0.2)] hover:shadow-[0_0_25px_rgba(139,92,246,0.45)]">
              Enter Console <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/research?tab=bpo"
              className="w-full sm:w-auto px-10 py-4 bg-surface/60 border border-border rounded-sm font-bold font-mono text-[11px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-surface-elevated transition-all">
              <BarChart3 className="h-4 w-4" /> [ BPO Analytics ]
            </Link>
          </motion.div>
        </div>
      </motion.section>

      {/* ── Footer ── */}
      <footer className="py-14 border-t border-border/20 relative z-10 bg-surface/30 backdrop-blur-md">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 md:px-10">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-12">
            <div className="md:col-span-2">
              <Link href="/" className="flex items-center gap-2.5 mb-4">
                <div className="h-7 w-7 rounded-none border border-primary/30 bg-gradient-to-br from-primary/20 to-accent/10 flex items-center justify-center">
                  <img src="/brand/bloblogo.png" alt="" className="h-4 w-4 brightness-150" />
                </div>
                <span className="font-bold">Blob<span className="text-primary">Lens</span></span>
              </Link>
              <p className="text-xs text-text-secondary/60 leading-relaxed max-w-sm font-normal">
                Open-source protocol analytics and observability console for Ethereum&apos;s data availability layers. Powered by ClickHouse and Next.js.
              </p>
            </div>
            <div>
              <h5 className="text-[9px] font-bold uppercase tracking-[0.2em] text-text-primary/80 mb-5 font-mono">Console Racks</h5>
              <ul className="space-y-3">
                {[
                  { href: "/dashboard",       l: "Console Overview" },
                  { href: "/leaderboard",     l: "L2 Leaderboard" },
                  { href: "/market",          l: "Market State" },
                  { href: "/research",        l: "Deep Research" },
                  { href: "/research?tab=bpo",l: "BPO Ledger" },
                ].map((x) => (
                  <li key={x.href}>
                    <Link href={x.href} className="text-xs text-text-secondary/60 hover:text-primary transition-colors font-mono uppercase tracking-wider">[ {x.l} ]</Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h5 className="text-[9px] font-bold uppercase tracking-[0.2em] text-text-primary/80 mb-5 font-mono">External Feeds</h5>
              <ul className="space-y-3">
                {[
                  { href: "https://github.com/AvarchLLC/blob_lens", l: "GitHub Source" },
                  { href: "https://eipsinsight.com",                l: "EIPs Insight" },
                  { href: "https://giveth.io",                      l: "Giveth Support" },
                ].map((x) => (
                  <li key={x.href}>
                    <a href={x.href} target="_blank" rel="noopener noreferrer"
                      className="text-xs text-text-secondary/60 hover:text-primary transition-colors font-mono uppercase tracking-wider">[ {x.l} ]</a>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-between pt-8 border-t border-border/15">
            <p className="text-[10px] text-text-tertiary font-mono uppercase tracking-wider">© 2026 AVARCH LLC // MIT LICENSE // INDEXER: ACTIVE</p>
            <a href="https://github.com/AvarchLLC/blob_lens" target="_blank" rel="noopener noreferrer"
              className="text-text-tertiary hover:text-primary transition-colors mt-4 sm:mt-0">
              <GithubIcon className="h-4.5 w-4.5" />
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
