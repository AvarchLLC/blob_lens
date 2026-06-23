"use client";

import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { formatNumber } from "@/lib/utils";
import { EcosystemMapPreview } from "./EcosystemMapPreview";
import {
  BarChart3, Zap, ArrowRight,
  Search, Activity, Trophy, Layers, CircleDot, TrendingUp, TrendingDown,
  FlaskConical, ChevronDown, ChevronUp, Cpu, DollarSign,
} from "lucide-react";
import { ThemeToggle } from "@/components/shared/ThemeToggle";
import { useEffect, useState } from "react";
import type { LeaderboardRow, ForecastData, MarketHour } from "@/types";

function GithubIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
    </svg>
  );
}

const fadeUp = { hidden: { opacity: 0, y: 30 }, show: { opacity: 1, y: 0 } };
const stagger = { show: { transition: { staggerChildren: 0.1 } } };

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
    badgeStyle: { background: "rgba(82,102,110,0.12)", color: "#52666E", borderColor: "rgba(82,102,110,0.25)" },
  },
  healthy: {
    label: "Healthy",
    color: REGIME_COLORS.healthy,
    badgeStyle: { background: "rgba(0,168,107,0.10)", color: "#00A86B", borderColor: "rgba(0,168,107,0.22)" },
  },
  congested: {
    label: "Congested",
    color: REGIME_COLORS.congested,
    badgeStyle: { background: "rgba(232,160,32,0.10)", color: "#E8A020", borderColor: "rgba(232,160,32,0.22)" },
  },
  spike: {
    label: "Fee Spike",
    color: REGIME_COLORS.spike,
    badgeStyle: { background: "rgba(229,72,77,0.10)", color: "#E5484D", borderColor: "rgba(229,72,77,0.22)" },
  },
} as const;

function AnimatedCounter({ value, suffix = "" }: { value: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    const dur = 1800;
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
    bgStyle: { background: "linear-gradient(135deg, rgba(59,130,246,0.12) 0%, transparent 100%)" },
    borderColor: "rgba(59,130,246,0.20)",
    badgeStyle: { background: "rgba(59,130,246,0.10)", color: "#60A5FA", borderColor: "rgba(59,130,246,0.20)" },
    dotColor: "#60A5FA",
    footerNote: null,
  },
  {
    name: "Pectra",
    eip: "EIP-7691",
    date: "Apr 2025",
    block: "22,431,084",
    target: 6,
    max: 9,
    tagline: "2× blob throughput",
    bgStyle: { background: "linear-gradient(135deg, rgba(139,92,246,0.12) 0%, transparent 100%)" },
    borderColor: "rgba(139,92,246,0.22)",
    badgeStyle: { background: "rgba(139,92,246,0.10)", color: "#8B5CF6", borderColor: "rgba(139,92,246,0.22)" },
    dotColor: "#8B5CF6",
    footerNote: null,
  },
  {
    name: "Fusaka",
    eip: "BPO2",
    date: "Late 2025",
    block: "24,833,256",
    target: 12,
    max: 18,
    tagline: "4× throughput from Dencun",
    bgStyle: { background: "linear-gradient(135deg, rgba(82,102,110,0.10) 0%, transparent 100%)" },
    borderColor: "rgba(82,102,110,0.22)",
    badgeStyle: { background: "rgba(82,102,110,0.10)", color: "#6B8A94", borderColor: "rgba(82,102,110,0.22)" },
    dotColor: "#6B8A94",
    footerNote: "Active since ~Nov 2025",
  },
];

const USER_TYPES = [
  {
    icon: Layers,
    title: "Rollup Teams",
    description: "Track your DA cost efficiency vs competitors. Know exactly when to submit blobs, how well you pack, and what your cost per byte looks like over time.",
    href: "/leaderboard",
    cta: "View Leaderboard",
    gradientStyle: { background: "linear-gradient(135deg, rgba(232,160,32,0.10) 0%, transparent 100%)" },
    iconColor: "#E8A020",
    iconBgStyle: { background: "rgba(232,160,32,0.10)" },
  },
  {
    icon: FlaskConical,
    title: "Protocol Researchers",
    description: "Study market regimes, BPO upgrade impact, and 90-day utilization patterns. Understand how Dencun → Pectra → Fusaka reshaped the DA landscape.",
    href: "/research",
    cta: "Open Research",
    gradientStyle: { background: "linear-gradient(135deg, rgba(139,92,246,0.10) 0%, transparent 100%)" },
    iconColor: "#8B5CF6",
    iconBgStyle: { background: "rgba(139,92,246,0.10)" },
  },
  {
    icon: Zap,
    title: "MEV Strategists",
    description: "Monitor congestion in real time. Identify healthy windows for submission, track fee pressure trends, and act before congestion spikes.",
    href: "/market",
    cta: "Monitor Market",
    gradientStyle: { background: "linear-gradient(135deg, rgba(229,72,77,0.08) 0%, transparent 100%)" },
    iconColor: "#E5484D",
    iconBgStyle: { background: "rgba(229,72,77,0.08)" },
  },
  {
    icon: DollarSign,
    title: "Protocol Economists",
    description: "Model fee market dynamics across all blob parameter upgrades. Compare target fill rates, excess blob gas trends, and structural shifts epoch by epoch.",
    href: "/research?tab=bpo",
    cta: "BPO Analytics",
    gradientStyle: { background: "linear-gradient(135deg, rgba(82,102,110,0.10) 0%, transparent 100%)" },
    iconColor: "#6B8A94",
    iconBgStyle: { background: "rgba(82,102,110,0.10)" },
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

  const recentHour = market[market.length - 1];
  const regime = recentHour ? classifyRegime(recentHour.max_blobs_in_block) : "undersaturated";
  const currentFeeGwei = forecast ? forecast.current_fee_wei / 1e9 : 0;
  const avgUtilization = recentHour?.avg_utilization ?? 0;
  const rc = REGIME_CONF[regime];
  const top3 = [...leaderboard].sort((a, b) => b.efficiency_score - a.efficiency_score).slice(0, 3);
  const activeRollups = leaderboard.filter(r => r.rollup !== "UNKNOWN").length;

  useEffect(() => {
    const el = document.querySelector("[data-landing-scroll]");
    if (!el) return;
    const handler = () => setScrolled(el.scrollTop > 20);
    el.addEventListener("scroll", handler, { passive: true });
    return () => el.removeEventListener("scroll", handler);
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/30">

      {/* ── Orbs ── */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0" aria-hidden>
        <div className="landing-orb landing-orb-1" />
        <div className="landing-orb landing-orb-2" />
        <div className="landing-orb landing-orb-3" />
      </div>

      {/* ── Navbar ── */}
      <nav className={`fixed top-0 w-full z-50 transition-all duration-500 ${
        scrolled ? "bg-background/85 backdrop-blur-xl border-b border-border/30 shadow-sm" : "bg-transparent"
      }`}>
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group shrink-0">
            <motion.div
              initial={{ rotate: -180, scale: 0 }} animate={{ rotate: 0, scale: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 15 }}
              className="h-9 w-9 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg shadow-primary/20 group-hover:shadow-primary/35 group-hover:scale-105 transition-all duration-300"
            >
              <Image src="/brand/bloblogo.png" alt="" width={20} height={20} className="brightness-200" />
            </motion.div>
            <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
              <p className="text-[15px] font-bold tracking-tight leading-none">
                Blob<span className="text-primary">Lens</span>
              </p>
              <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-text-tertiary leading-none mt-0.5">
                DA Intelligence
              </p>
            </motion.div>
          </Link>

          <div className="flex items-center gap-1">
            {[
              { label: "Dashboard",   href: "/dashboard" },
              { label: "Research",    href: "/research" },
              { label: "Market",      href: "/market" },
              { label: "Leaderboard", href: "/leaderboard" },
            ].map((item, i) => (
              <motion.div key={item.label} initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 + i * 0.05 }}>
                <Link href={item.href}
                  className="relative px-3.5 py-2 text-[13px] font-medium text-text-secondary/70 hover:text-primary transition-colors hidden lg:block group">
                  {item.label}
                  <span className="absolute bottom-1 left-3.5 right-3.5 h-px bg-primary scale-x-0 group-hover:scale-x-100 transition-transform duration-200 origin-left rounded-full" />
                </Link>
              </motion.div>
            ))}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}
              className="flex items-center gap-2 ml-2">
              <div className="h-5 w-px bg-border/40 hidden md:block" />
              <ThemeToggle />
              <Link href="/dashboard"
                className="group relative overflow-hidden px-5 py-2 bg-gradient-to-r from-primary to-accent text-white text-[11px] font-bold uppercase tracking-widest rounded-xl transition-all hover:shadow-lg hover:shadow-primary/30 hover:-translate-y-px active:translate-y-0">
                <span className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                <span className="relative">Launch App</span>
              </Link>
            </motion.div>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="relative pt-36 pb-20 overflow-hidden">
        {/* Dot grid */}
        <div className="absolute inset-0 opacity-[0.025]" style={{
          backgroundImage: "radial-gradient(circle, var(--text-secondary) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }} />

        <motion.div className="max-w-5xl mx-auto px-6 relative z-10 text-center"
          variants={stagger} initial="hidden" animate="show">

          {/* Live badge */}
          <motion.div variants={fadeUp}
            className="inline-flex items-center gap-2.5 px-4 py-2 bg-primary/8 border border-primary/15 rounded-full mb-8 backdrop-blur-sm">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
            </span>
            <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-primary">Live · Ethereum Mainnet · Dencun → Pectra → Fusaka</span>
          </motion.div>

          {/* Headline */}
          <motion.h1 variants={fadeUp}
            className="text-[3.5rem] md:text-[5rem] font-bold tracking-[-0.04em] mb-6 leading-[1.02]">
            <span className="block">Data Availability</span>
            <span className="block">Intelligence for{" "}
              <span className="relative inline-block">
                <span className="relative z-10 bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent bg-[length:200%_auto] animate-[shimmer_3s_ease-in-out_infinite]">
                  Ethereum
                </span>
              </span>
            </span>
          </motion.h1>

          {/* Subtitle */}
          <motion.div variants={fadeUp} className="max-w-2xl mx-auto mb-10">
            <p className="text-lg md:text-xl text-text-secondary/70 leading-relaxed font-light">
              Analytics for the blob economy — from EIP-4844 through every BPO network upgrade.
              {!aboutExpanded && (
                <button onClick={() => setAboutExpanded(true)}
                  className="ml-2 inline-flex items-center gap-1 text-primary font-semibold text-base hover:gap-2 transition-all">
                  Read more <ChevronDown className="h-4 w-4" />
                </button>
              )}
            </p>
            <AnimatePresence>
              {aboutExpanded && (
                <motion.div
                  initial={{ opacity: 0, height: 0, marginTop: 0 }}
                  animate={{ opacity: 1, height: "auto", marginTop: 16 }}
                  exit={{ opacity: 0, height: 0, marginTop: 0 }}
                  transition={{ duration: 0.35, ease: "easeInOut" }}
                  className="overflow-hidden"
                >
                  <p className="text-base text-text-secondary/60 leading-relaxed text-left bg-surface/40 border border-border/30 rounded-xl px-6 py-5 backdrop-blur-sm">
                    BlobLens is an open-source protocol analytics platform covering Ethereum&apos;s entire data availability layer.
                    We track every Type-3 transaction from the Dencun launch (March 2024) through the Pectra EIP-7691 expansion and the
                    Fusaka BPO2 upgrade — providing real-time fee market health monitoring, rollup efficiency scoring, and per-epoch DA cost
                    analysis. Built for rollup teams, protocol researchers, MEV strategists, and anyone who needs clarity on
                    where the DA market is heading next.
                  </p>
                  <button onClick={() => setAboutExpanded(false)}
                    className="mt-3 inline-flex items-center gap-1 text-sm text-text-secondary/40 hover:text-primary transition-colors">
                    <ChevronUp className="h-3.5 w-3.5" /> Show less
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* CTAs */}
          <motion.div variants={fadeUp} className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-14">
            <Link href="/dashboard"
              className="group w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-primary to-accent text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all hover:shadow-2xl hover:shadow-primary/30 hover:-translate-y-0.5 active:translate-y-0">
              Explore Dashboard
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
            <a href="https://github.com/AvarchLLC/blob_lens" target="_blank" rel="noopener noreferrer"
              className="w-full sm:w-auto px-8 py-4 bg-surface/60 backdrop-blur border border-border/50 rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-surface-elevated hover:border-primary/20 transition-all">
              <GithubIcon className="h-4 w-4" /> View Source
            </a>
          </motion.div>

          {/* Stats strip */}
          <motion.div variants={fadeUp}
            className="grid grid-cols-2 md:grid-cols-4 gap-px rounded-2xl overflow-hidden border border-border/30 bg-border/20 max-w-4xl mx-auto mb-6">
            {[
              { label: "Total Blobs",       val: stats.total_blobs,        icon: Layers,    suffix: "" },
              { label: "Transactions",      val: stats.total_txs,          icon: TrendingUp, suffix: "" },
              { label: "Active Rollups",    val: stats.rollup_count,       icon: CircleDot, suffix: "" },
              { label: "Avg Utilization",   val: stats.avg_utilization_24h, icon: Activity,  suffix: "%" },
            ].map((s) => (
              <div key={s.label} className="bg-background/80 backdrop-blur-md px-6 py-6 text-center group hover:bg-surface/50 transition-colors">
                <s.icon className="h-4 w-4 text-primary/40 mx-auto mb-2 group-hover:text-primary transition-colors" />
                <p className="font-mono text-2xl md:text-3xl font-bold text-text-primary tracking-tight">
                  <AnimatedCounter value={s.val} suffix={s.suffix} />
                </p>
                <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-text-tertiary mt-1.5">{s.label}</p>
              </div>
            ))}
          </motion.div>

          {/* ── Live Regime Timeline — the money shot ── */}
          {market.length > 1 && (
            <motion.div variants={fadeUp} className="max-w-4xl mx-auto">
              <div className="rounded-2xl border border-border/40 bg-background/70 backdrop-blur-md overflow-hidden">
                {/* Header row */}
                <div className="flex items-center justify-between px-5 py-3 border-b border-border/20">
                  <div className="flex items-center gap-2.5">
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-primary" />
                    </span>
                    <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-text-tertiary"
                      style={{ fontFamily: "var(--font-mono)" }}>
                      Live Market State · Last {market.length}h
                    </span>
                  </div>
                  <span className="text-[9px] font-bold px-2.5 py-1 rounded-full border"
                    style={{ fontFamily: "var(--font-body)", ...rc.badgeStyle }}>
                    {rc.label}
                  </span>
                </div>

                {/* Regime blocks */}
                <div className="px-5 pt-4 pb-1">
                  <div className="flex w-full h-6 gap-px">
                    {market.map((d, i) => {
                      const r = classifyRegime(d.max_blobs_in_block);
                      return (
                        <div
                          key={i}
                          className="flex-1 rounded-sm transition-opacity hover:opacity-100"
                          style={{ backgroundColor: REGIME_COLORS[r], opacity: 0.82 }}
                          title={`${d.hour} — ${r} (max ${d.max_blobs_in_block} blobs/block)`}
                        />
                      );
                    })}
                  </div>
                  {/* Legend */}
                  <div className="flex items-center justify-between mt-2.5 mb-3">
                    <span className="text-[9px] text-text-tertiary" style={{ fontFamily: "var(--font-mono)" }}>
                      {market[0]?.hour ? new Date(market[0].hour).toLocaleString('en-US', { hour: '2-digit', minute: '2-digit' }) : ""}
                    </span>
                    <div className="flex items-center gap-3">
                      {(["undersaturated", "healthy", "congested", "spike"] as const).map(key => (
                        <div key={key} className="flex items-center gap-1">
                          <span className="h-2 w-2 rounded-sm shrink-0" style={{ background: REGIME_COLORS[key] }} />
                          <span className="text-[8px] font-bold uppercase tracking-[0.08em] text-text-tertiary capitalize">
                            {key === "undersaturated" ? "Under" : key}
                          </span>
                        </div>
                      ))}
                    </div>
                    <span className="text-[9px] text-text-tertiary" style={{ fontFamily: "var(--font-mono)" }}>Now</span>
                  </div>
                </div>

                {/* Footer stats */}
                <div className="flex items-center justify-center gap-6 px-5 py-2.5 border-t border-border/15">
                  <span className="text-[10px] font-mono text-text-secondary/50">
                    {currentFeeGwei > 0 ? `${currentFeeGwei.toFixed(3)} gwei` : "—"}
                  </span>
                  <span className="h-3 w-px bg-border/50" />
                  <span className="text-[10px] font-mono text-text-secondary/50">{avgUtilization.toFixed(1)}% util</span>
                  <span className="h-3 w-px bg-border/50" />
                  <span className="text-[10px] font-mono text-text-secondary/50">{activeRollups} rollups active</span>
                  {forecast && (
                    <>
                      <span className="h-3 w-px bg-border/50" />
                      <span className="text-[10px] font-bold flex items-center gap-1"
                        style={{ color: forecast.excess_trend > 0 ? "var(--status-warning)" : "var(--status-healthy)" }}>
                        {forecast.excess_trend > 0
                          ? <TrendingUp className="h-3 w-3" />
                          : <TrendingDown className="h-3 w-3" />}
                        Pressure {forecast.excess_trend > 0 ? "rising" : "easing"}
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
      <motion.section className="py-24 border-y border-border/20"
        initial="hidden" whileInView="show" viewport={{ once: true, margin: "-80px" }} variants={stagger}>
        <div className="max-w-6xl mx-auto px-6">
          <motion.div variants={fadeUp} className="text-center mb-14">
            <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-primary mb-3 block">Who Is This For</span>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
              Built for everyone who cares<br />about{" "}
              <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">data availability.</span>
            </h2>
            <p className="text-text-secondary/60 max-w-lg mx-auto text-sm leading-relaxed">
              Whether you&apos;re optimizing costs, studying market structure, or timing submissions — BlobLens has a view for you.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {USER_TYPES.map((u) => (
              <motion.div key={u.title} variants={fadeUp}
                className="relative rounded-2xl border border-border/40 p-6 group hover:border-primary/25 transition-all duration-300 hover:-translate-y-1 flex flex-col"
                style={u.gradientStyle}>
                <div className="h-10 w-10 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shrink-0"
                  style={u.iconBgStyle}>
                  <u.icon className="h-5 w-5" style={{ color: u.iconColor }} />
                </div>
                <h3 className="font-bold text-sm text-text-primary mb-2">{u.title}</h3>
                <p className="text-xs text-text-secondary/70 leading-relaxed mb-5 flex-1">{u.description}</p>
                <Link href={u.href}
                  className="inline-flex items-center gap-1.5 text-xs font-bold hover:gap-3 transition-all"
                  style={{ color: u.iconColor }}>
                  {u.cta} <ArrowRight className="h-3 w-3" />
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.section>

      {/* ── The DA Layer problem ── */}
      <motion.section className="py-24 relative"
        initial="hidden" whileInView="show" viewport={{ once: true, margin: "-100px" }} variants={stagger}>
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <motion.div variants={fadeUp}>
              <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-primary mb-3 block">The DA Layer is Evolving</span>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-6 leading-tight">
                The blob market was<br />just the{" "}
                <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">beginning.</span>
              </h2>
              <p className="text-text-secondary/80 leading-relaxed mb-8">
                EIP-4844 created Ethereum&apos;s first dedicated DA layer. Each BPO upgrade since has expanded capacity,
                changed fee dynamics, and shifted how rollups compete for space. Standard block explorers can&apos;t track any of it.
              </p>
              <div className="space-y-3">
                {[
                  { icon: DollarSign, text: "Rollup teams need DA cost-per-byte, not just gas prices",    color: "var(--status-warning)" },
                  { icon: Activity,   text: "Researchers need market regime health checks across epochs",  color: "var(--primary)" },
                  { icon: Search,     text: "Strategists monitor congestion for timing advantage",         color: "var(--accent)" },
                ].map((item, i) => (
                  <motion.div key={i} variants={fadeUp} className="flex items-center gap-3 group">
                    <div className="h-9 w-9 rounded-xl flex items-center justify-center shrink-0 opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all"
                      style={{ background: `color-mix(in srgb, ${item.color} 15%, transparent)` }}>
                      <item.icon className="h-4 w-4" style={{ color: item.color }} />
                    </div>
                    <span className="text-sm font-medium text-text-primary/80 group-hover:text-text-primary transition-colors">{item.text}</span>
                  </motion.div>
                ))}
              </div>
            </motion.div>
            <motion.div variants={fadeUp} className="relative group">
              <div className="absolute -inset-6 rounded-3xl blur-3xl opacity-0 group-hover:opacity-100 transition-all duration-700"
                style={{ background: "radial-gradient(ellipse, rgba(139,92,246,0.12) 0%, transparent 70%)" }} />
              <div className="relative rounded-2xl overflow-hidden border border-border/50 shadow-2xl">
                <img src="/bloblens.png" alt="BlobLens Dashboard" className="w-full" />
                <div className="absolute inset-0 bg-gradient-to-t from-background/30 to-transparent" />
              </div>
            </motion.div>
          </div>
        </div>
      </motion.section>

      {/* ── BPO Timeline ── */}
      <motion.section className="py-24 border-y border-border/20"
        initial="hidden" whileInView="show" viewport={{ once: true, margin: "-80px" }} variants={stagger}>
        <div className="max-w-6xl mx-auto px-6">
          <motion.div variants={fadeUp} className="text-center mb-14">
            <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-primary mb-3 block">BPO Upgrade Timeline</span>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
              Three upgrades. One platform.<br />
              <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">Full DA coverage.</span>
            </h2>
            <p className="text-text-secondary/60 max-w-lg mx-auto text-sm">
              BlobLens tracks the fee market, utilization, and rollup behavior across every BPO epoch.
            </p>
          </motion.div>

          <div className="relative">
            {/* Timeline connector — blue → teal → neutral */}
            <div className="hidden lg:block absolute top-[2.8rem] left-[calc(16.66%+1rem)] right-[calc(16.66%+1rem)] h-px"
              style={{ background: "linear-gradient(to right, rgba(96,165,250,0.3), rgba(0,167,181,0.5), rgba(82,102,110,0.3))" }} />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {BPO_UPGRADES.map((u) => (
                <motion.div key={u.name} variants={fadeUp}
                  className="relative rounded-2xl p-7 group hover:shadow-xl transition-all duration-300"
                  style={{ ...u.bgStyle, border: `1px solid ${u.borderColor}` }}>

                  <div className="hidden lg:flex items-center justify-center absolute -top-[1.1rem] left-1/2 -translate-x-1/2">
                    <span className="h-4 w-4 rounded-full ring-4 ring-background shadow-lg"
                      style={{ backgroundColor: u.dotColor }} />
                  </div>

                  <div className="flex items-start justify-between mb-5">
                    <div>
                      <h3 className="text-xl font-bold text-text-primary">{u.name}</h3>
                      <p className="text-xs text-text-tertiary mt-0.5">{u.date} · Block {u.block}</p>
                    </div>
                    <span className="text-[10px] font-bold px-2.5 py-1 rounded-full border"
                      style={u.badgeStyle}>
                      {u.eip}
                    </span>
                  </div>

                  <p className="text-sm font-semibold text-text-primary/80 mb-5">{u.tagline}</p>

                  <div className="space-y-2.5">
                    {[
                      { label: "Target blobs / block", val: u.target },
                      { label: "Max blobs / block",    val: u.max },
                      { label: "Max throughput",        val: `${(u.max * 128).toLocaleString()} KB/block` },
                    ].map(({ label, val }) => (
                      <div key={label} className="flex items-center justify-between text-xs">
                        <span className="text-text-tertiary">{label}</span>
                        <span className="font-mono font-bold text-text-primary">{val}</span>
                      </div>
                    ))}
                  </div>

                  {u.footerNote && (
                    <div className="mt-4 pt-4 border-t border-border/20">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-text-tertiary">{u.footerNote}</span>
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          </div>

          <motion.div variants={fadeUp} className="mt-10 text-center">
            <Link href="/research?tab=bpo"
              className="inline-flex items-center gap-2 px-6 py-3 bg-surface/60 backdrop-blur border border-border/50 rounded-xl font-bold text-sm hover:bg-surface-elevated hover:border-primary/20 transition-all group">
              <Cpu className="h-4 w-4 text-primary" />
              Explore BPO analytics in depth
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </motion.div>
        </div>
      </motion.section>

      {/* ── Features ── */}
      <motion.section className="py-28" initial="hidden" whileInView="show" viewport={{ once: true, margin: "-100px" }} variants={stagger}>
        <div className="max-w-6xl mx-auto px-6">
          <motion.div variants={fadeUp} className="text-center mb-16">
            <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-primary mb-3 block">Capabilities</span>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">Complete Observability. One Platform.</h2>
            <p className="text-text-secondary/60 max-w-lg mx-auto">Unified visibility and real-time intelligence across the full DA layer.</p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Card 1 — DA Cost Efficiency */}
            <motion.div variants={fadeUp}
              className="relative rounded-2xl border border-border/50 bg-surface/50 backdrop-blur p-8 md:p-10 overflow-hidden group hover:border-primary/25 transition-all duration-500">
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                style={{ background: "linear-gradient(135deg, rgba(0,167,181,0.06) 0%, transparent 60%)" }} />
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent scale-x-0 group-hover:scale-x-100 transition-transform duration-500" />
              <div className="relative">
                <div className="inline-flex items-center justify-center h-12 w-12 rounded-2xl mb-6 group-hover:scale-110 transition-transform"
                  style={{ background: "rgba(0,167,181,0.10)" }}>
                  <Trophy className="h-5 w-5 text-primary" />
                </div>
                <h3 className="text-xl font-bold mb-3 tracking-tight">DA Cost Efficiency Scoring</h3>
                <p className="text-sm text-text-secondary/80 leading-relaxed mb-6">
                  Every rollup scored on packing density, timing, and DA cost. Our{" "}
                  <span className="text-primary font-semibold">Efficiency Score</span> reveals who overpays, across every BPO epoch.
                </p>
                {top3.length > 0 ? (
                  <div className="space-y-3 mb-6">
                    {top3.map((row) => (
                      <div key={row.rollup} className="flex items-center gap-3">
                        <span className="text-xs font-medium text-text-primary/80 w-24 shrink-0 truncate">{row.rollup}</span>
                        <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "var(--border)" }}>
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-primary to-accent"
                            style={{ width: `${Math.max(4, Math.round(row.efficiency_score))}%` }}
                          />
                        </div>
                        <span className="text-xs font-mono text-text-tertiary w-8 text-right shrink-0">{Math.round(row.efficiency_score)}</span>
                      </div>
                    ))}
                    <p className="text-[10px] text-text-tertiary pt-1" style={{ fontFamily: "var(--font-mono)" }}>
                      Score = 70% packing + 30% timing · 24h window
                    </p>
                  </div>
                ) : (
                  <div className="h-20 flex items-center justify-center mb-6">
                    <span className="text-xs text-text-tertiary">No data in window</span>
                  </div>
                )}
                <Link href="/leaderboard" className="inline-flex items-center gap-1.5 text-sm font-bold text-primary hover:gap-3 transition-all">
                  View Leaderboard <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </motion.div>

            {/* Card 2 — Fee Market Health with live chart */}
            <motion.div variants={fadeUp}
              className="relative rounded-2xl border border-border/50 bg-surface/50 backdrop-blur p-8 md:p-10 overflow-hidden group hover:border-primary/25 transition-all duration-500">
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                style={{ background: "linear-gradient(135deg, rgba(0,168,107,0.05) 0%, transparent 60%)" }} />
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent scale-x-0 group-hover:scale-x-100 transition-transform duration-500" />
              <div className="relative">
                <div className="inline-flex items-center justify-center h-12 w-12 rounded-2xl mb-6 group-hover:scale-110 transition-transform"
                  style={{ background: "rgba(0,168,107,0.10)" }}>
                  <Activity className="h-5 w-5" style={{ color: "var(--status-healthy)" }} />
                </div>
                <h3 className="text-xl font-bold mb-3 tracking-tight">Fee Market Health Layer</h3>
                <p className="text-sm text-text-secondary/80 leading-relaxed mb-5">
                  Four market regimes classified in real-time with{" "}
                  <span className="text-primary font-semibold">Congestion Forecasts</span> and BPO-aware utilization metrics.
                </p>

                {/* Embedded regime timeline */}
                {market.length > 1 && (
                  <div className="mb-5 rounded-xl overflow-hidden border border-border/30"
                    style={{ background: "var(--surface-elevated)" }}>
                    <div className="px-4 pt-3 pb-1">
                      <p className="text-[8px] font-bold uppercase tracking-[0.2em] text-text-tertiary mb-2"
                        style={{ fontFamily: "var(--font-mono)" }}>
                        24h regime history
                      </p>
                      <div className="flex w-full h-4 gap-px">
                        {market.map((d, i) => {
                          const r = classifyRegime(d.max_blobs_in_block);
                          return (
                            <div key={i} className="flex-1 rounded-sm"
                              style={{ backgroundColor: REGIME_COLORS[r], opacity: 0.80 }} />
                          );
                        })}
                      </div>
                    </div>
                    <div className="flex items-center justify-between px-4 py-2.5 border-t border-border/20">
                      <span className="text-[9px] font-mono text-text-tertiary">
                        {currentFeeGwei > 0 ? `${currentFeeGwei.toFixed(3)} gwei` : "—"}
                      </span>
                      <span className="text-[9px] font-bold px-2 py-0.5 rounded-full border"
                        style={{ fontFamily: "var(--font-body)", ...rc.badgeStyle }}>
                        {rc.label}
                      </span>
                      <span className="text-[9px] font-mono text-text-tertiary">{avgUtilization.toFixed(1)}% util</span>
                    </div>
                  </div>
                )}

                <div className="space-y-1.5 mb-6">
                  <div className="flex items-center justify-between py-1.5 border-b border-border/15">
                    <span className="text-xs text-text-secondary/60">Pressure</span>
                    {forecast ? (
                      <span className="text-xs font-bold flex items-center gap-1"
                        style={{ color: forecast.excess_trend > 0 ? "var(--status-warning)" : "var(--status-healthy)" }}>
                        {forecast.excess_trend > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                        {forecast.excess_trend > 0 ? "Rising" : "Easing"}
                      </span>
                    ) : <span className="text-xs text-text-tertiary">—</span>}
                  </div>
                  <div className="flex items-center justify-between py-1.5">
                    <span className="text-xs text-text-secondary/60">Utilization</span>
                    <span className="text-xs font-mono text-text-primary">{avgUtilization.toFixed(1)}%</span>
                  </div>
                </div>

                <Link href="/market" className="inline-flex items-center gap-1.5 text-sm font-bold text-primary hover:gap-3 transition-all">
                  Monitor Fee Market <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </motion.div>
          </div>
        </div>
      </motion.section>

      {/* ── Ecosystem Map ── */}
      <motion.section className="py-28 border-y border-border/20 overflow-hidden"
        initial="hidden" whileInView="show" viewport={{ once: true, margin: "-100px" }} variants={stagger}>
        <div className="max-w-6xl mx-auto px-6">
          <motion.div variants={fadeUp} className="text-center mb-14">
            <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-primary mb-3 block">Network Map</span>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">40+ Rollups. One Ecosystem.</h2>
            <p className="text-text-secondary/60 max-w-xl mx-auto">Mapping L2 relationships through their shared use of the blob fee market.</p>
          </motion.div>
          <motion.div variants={fadeUp}><EcosystemMapPreview /></motion.div>
          <motion.div variants={fadeUp} className="mt-12 flex flex-wrap justify-center gap-2">
            {["Base", "Arbitrum", "Optimism", "ZKSync", "Linea", "Starknet", "Mantle", "Taiko", "Scroll", "Blast"].map((r) => (
              <span key={r} className="px-3 py-1.5 bg-surface/50 backdrop-blur border border-border/30 rounded-lg text-[10px] font-bold uppercase tracking-wider text-text-secondary/50 hover:text-primary hover:border-primary/20 transition-all cursor-default">
                {r}
              </span>
            ))}
            <span className="px-3 py-1.5 bg-primary/8 border border-primary/15 rounded-lg text-[10px] font-bold uppercase tracking-wider text-primary">
              +30 more
            </span>
          </motion.div>
        </div>
      </motion.section>

      {/* ── CTA ── */}
      <motion.section className="py-28 relative overflow-hidden"
        initial="hidden" whileInView="show" viewport={{ once: true }} variants={stagger}>
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: "radial-gradient(ellipse at 50% 50%, var(--primary) 0%, transparent 65%)", opacity: 0.035 }} />
        <div className="max-w-3xl mx-auto px-6 text-center relative z-10">
          <motion.h2 variants={fadeUp} className="text-3xl md:text-5xl font-bold tracking-tight mb-4">
            Ready to see through<br />the{" "}
            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">DA layer</span>?
          </motion.h2>
          <motion.p variants={fadeUp} className="text-text-secondary/50 mb-10">
            Join researchers and rollup teams using BlobLens across every BPO epoch.
          </motion.p>
          <motion.div variants={fadeUp} className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/dashboard"
              className="w-full sm:w-auto px-10 py-4 bg-gradient-to-r from-primary to-accent text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all hover:shadow-2xl hover:shadow-primary/30 hover:-translate-y-0.5">
              Enter Dashboard <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/research?tab=bpo"
              className="w-full sm:w-auto px-10 py-4 bg-surface/60 backdrop-blur border border-border/50 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-surface-elevated transition-all">
              <BarChart3 className="h-4 w-4" /> BPO Analytics
            </Link>
          </motion.div>
        </div>
      </motion.section>

      {/* ── Footer ── */}
      <footer className="py-14 border-t border-border/20">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-12">
            <div className="md:col-span-2">
              <Link href="/" className="flex items-center gap-2 mb-4">
                <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                  <img src="/brand/bloblogo.png" alt="" className="h-4 w-4 brightness-200" />
                </div>
                <span className="font-bold">Blob<span className="text-primary">Lens</span></span>
              </Link>
              <p className="text-sm text-text-secondary/50 leading-relaxed max-w-sm">
                Open-source DA intelligence for Ethereum. Tracking EIP-4844 through every BPO upgrade. Built by Avarch LLC.
              </p>
            </div>
            <div>
              <h5 className="text-[9px] font-bold uppercase tracking-[0.2em] text-text-primary/80 mb-5">Product</h5>
              <ul className="space-y-3">
                {[
                  { href: "/dashboard",       l: "Overview" },
                  { href: "/leaderboard",     l: "Leaderboard" },
                  { href: "/market",          l: "Market Health" },
                  { href: "/research",        l: "Blob Research" },
                  { href: "/research?tab=bpo",l: "BPO Analytics" },
                ].map((x) => (
                  <li key={x.href}>
                    <Link href={x.href} className="text-sm text-text-secondary/50 hover:text-primary transition-colors">{x.l}</Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h5 className="text-[9px] font-bold uppercase tracking-[0.2em] text-text-primary/80 mb-5">Resources</h5>
              <ul className="space-y-3">
                {[
                  { href: "https://github.com/AvarchLLC/blob_lens", l: "GitHub" },
                  { href: "https://eipsinsight.com",                l: "EIPsInsight" },
                  { href: "https://giveth.io",                      l: "Support Us" },
                ].map((x) => (
                  <li key={x.href}>
                    <a href={x.href} target="_blank" rel="noopener noreferrer"
                      className="text-sm text-text-secondary/50 hover:text-primary transition-colors">{x.l}</a>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div className="flex flex-col md:flex-row items-center justify-between pt-8 border-t border-border/15">
            <p className="text-[11px] text-text-tertiary">© 2026 Avarch LLC · MIT License</p>
            <a href="https://github.com/AvarchLLC/blob_lens" target="_blank" rel="noopener noreferrer"
              className="text-text-tertiary hover:text-primary transition-colors mt-3 md:mt-0">
              <GithubIcon className="h-4 w-4" />
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
