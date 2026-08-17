"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { useTheme } from "next-themes";
import { EcosystemMapPreview } from "./ecosystem-map-preview";
import { BlobQueryTerminal } from "./blob-query-terminal";
import { PixelHeading } from "@/components/ui/pixel-heading-word";
import { EChartWrapper } from "@/components/charts/echart-wrapper";
import {
  HeroDitheringRoot,
  HeroDitheringContainer,
  HeroDitheringContent,
  HeroDitheringHeading,
  HeroDitheringDescription,
  HeroDitheringActions,
  HeroDitheringVisual,
  HeroDitheringMobileVisual,
} from "@/components/ui/hero-dithering";
import {
  BarChart3,
  Zap,
  ArrowRight,
  Activity,
  Trophy,
  Layers,
  CircleDot,
  TrendingUp,
  FlaskConical,
  ChevronDown,
  ChevronUp,
  Cpu,
  DollarSign,
  ExternalLink,
  Sliders,
  Terminal,
  Database,
  LineChart,
  CheckCircle2,
} from "lucide-react";

// Format numbers with commas
function formatNum(val: number): string {
  return new Intl.NumberFormat("en-US").format(val);
}

// Animated counting number component
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

  return (
    <>
      {formatNum(count)}
      {suffix}
    </>
  );
}

// BPO Upgrade Ledger Data
const BPO_UPGRADES = [
  {
    id: "dencun",
    name: "Dencun",
    eip: "EIP-4844",
    date: "2024",
    block: "19,426,587",
    target: 3,
    max: 6,
    throughputKB: 768,
    multiplier: "1× Baseline",
    tagline: "Birth of Ethereum Blob Storage Market",
    description: "Introduced Type-3 blob sidecar transactions running on a parallel gas fee mechanism.",
    badgeStyle: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30",
    footerNote: "Genesis Activation",
  },
  {
    id: "pectra",
    name: "Pectra",
    eip: "EIP-7691",
    date: "2025",
    block: "22,431,084",
    target: 6,
    max: 9,
    throughputKB: 1152,
    multiplier: "2× Throughput",
    tagline: "2× Throughput Capacity Expansion",
    description: "Doubles blob throughput limits while dampening exponential fee volatility spikes.",
    badgeStyle: "bg-[var(--primary-bg)] text-[var(--primary-text)] border-[var(--primary-border)]",
    footerNote: "Active Protocol Baseline",
  },
  {
    id: "fusaka",
    name: "Fusaka",
    eip: "BPO2",
    date: "2025+",
    block: "24,833,256",
    target: 12,
    max: 18,
    throughputKB: 2304,
    multiplier: "4× Scale",
    tagline: "4× Scalability Architecture Upgrade",
    description: "Quadruples blob capacity over Dencun baselines to accommodate massive L2 rollup expansion.",
    badgeStyle: "bg-[var(--surface-sunken)] text-[var(--text-secondary)] border-[var(--border)]",
    footerNote: "Scheduled Upgrade",
  },
];

// Motion Variants
const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 90, damping: 15 } },
};
const stagger = { show: { transition: { staggerChildren: 0.08 } } };

export function LandingClient() {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  // Force scroll to top on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      window.scrollTo(0, 0);
    }
  }, []);

  // ECharts Option for 24h Base Fee & Utilization Chart
  const feeChartOption = {
    backgroundColor: "transparent",
    tooltip: {
      trigger: "axis" as const,
      backgroundColor: isDark ? "#121217" : "#FFFFFF",
      borderColor: isDark ? "#3A3275" : "#CBC4FA",
      borderWidth: 1,
      padding: [8, 12],
      textStyle: { color: isDark ? "#F4F4F8" : "#1A1A24", fontFamily: "Geist Mono, monospace" },
      extraCssText: `background:${isDark ? "#121217" : "#FFFFFF"}!important;border:1px solid ${isDark ? "#3A3275" : "#CBC4FA"}!important;border-radius:4px;box-shadow:0 4px 20px rgba(0,0,0,${isDark ? "0.45" : "0.12"});`,
    },
    grid: { left: "4%", right: "4%", top: "14%", bottom: "14%", containLabel: true },
    xAxis: {
      type: "category" as const,
      boundaryGap: false,
      data: ["12:00", "15:00", "18:00", "21:00", "00:00", "03:00", "06:00", "09:00", "12:00"],
      axisLine: { lineStyle: { color: isDark ? "#22222E" : "#E5E5E7" } },
      axisLabel: { color: isDark ? "#68687D" : "#71718A", fontFamily: "var(--font-mono)", fontSize: 10 },
    },
    yAxis: [
      {
        type: "value" as const,
        name: "Utilization (%)",
        max: 100,
        splitLine: { lineStyle: { color: isDark ? "#1A1A24" : "#F3F3F7", type: "dashed" as const } },
        axisLabel: { color: isDark ? "#68687D" : "#71718A", fontFamily: "var(--font-mono)", fontSize: 10 },
      },
      {
        type: "value" as const,
        name: "Fee (Gwei)",
        splitLine: { show: false },
        axisLabel: { color: isDark ? "#68687D" : "#71718A", fontFamily: "var(--font-mono)", fontSize: 10 },
      },
    ],
    series: [
      {
        name: "Blob Utilization (%)",
        type: "line" as const,
        smooth: true,
        data: [35, 42, 68, 84, 78, 52, 61, 74, 78.4],
        itemStyle: { color: isDark ? "#8B7BFF" : "#5B4BE0" },
        areaStyle: {
          color: {
            type: "linear" as const,
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: isDark ? "rgba(139, 123, 255, 0.35)" : "rgba(91, 75, 224, 0.2)" },
              { offset: 1, color: "rgba(91, 75, 224, 0.0)" },
            ],
          },
        },
      },
      {
        name: "Blob Base Fee (Gwei)",
        type: "line" as const,
        yAxisIndex: 1,
        smooth: true,
        data: [0.0008, 0.0009, 0.0012, 0.0018, 0.0015, 0.001, 0.0011, 0.0013, 0.0012],
        itemStyle: { color: "#10B981" },
      },
    ],
  };

  return (
    <div className="w-full text-[var(--text-primary)] selection:bg-[var(--primary)]/30 relative">
      {/* ── 1. HERO SECTION WITH HERO DITHERING PRIMITIVES ── */}
      <HeroDitheringRoot>
        <HeroDitheringContainer>
          <HeroDitheringContent>
            {/* Live Telemetry Badge */}
            <div className="inline-flex items-center gap-2.5 px-4 py-1.5 border border-dashed border-[var(--primary-border)] bg-[var(--surface-1)] rounded-full shadow-xs mb-6">
              <span className="relative flex h-2.5 w-2.5 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--primary)] opacity-75" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[var(--primary)]" />
              </span>
              <span className="text-[11px] font-mono font-bold uppercase tracking-[0.2em] text-[var(--primary-text)]">
                EIP-4844 & EIP-7691 OBSERVER // LIVE MAINNET
              </span>
            </div>

            <HeroDitheringHeading>
              Observe Ethereum&apos;s <span className="text-[var(--primary-text)] underline decoration-dashed decoration-[var(--primary)]/60 underline-offset-8">blob layer</span> in high resolution.
            </HeroDitheringHeading>

            <HeroDitheringDescription>
              BlobLens decodes EIP-4844 sidecars, rollup commitments, gas pricing curves, and KZG proofs into an actionable intelligence console for rollups, protocol researchers, and L2 engineers.
            </HeroDitheringDescription>

            <HeroDitheringActions>
              <Link
                href="/dashboard"
                className="px-8 py-3.5 bg-[var(--primary)] text-[var(--primary-fg)] border border-[var(--primary)] hover:bg-[var(--primary-hover)] rounded-md font-mono font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-[0_0_20px_rgba(99,243,255,0.25)] hover:shadow-[0_0_28px_rgba(99,243,255,0.4)] group"
              >
                [ EXPLORE BLOB DATA ]
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
              <Link
                href="/research"
                className="px-8 py-3.5 bg-[var(--surface-1)] border border-dashed border-[var(--border-strong)] text-[var(--text-primary)] rounded-md font-mono font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-[var(--surface-elevated)] hover:border-[var(--primary-border)] transition-all"
              >
                [ READ THE DOCS ]
              </Link>
            </HeroDitheringActions>

            {/* Telemetry Ticker */}
            <div className="inline-flex flex-wrap items-center gap-4 px-4.5 py-2.5 border border-dashed border-[var(--border-strong)] bg-[var(--surface-1)] rounded-lg font-mono text-xs text-[var(--text-secondary)] shadow-xs">
              <span className="text-[var(--text-primary)] font-bold flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-[var(--success)] animate-pulse" />
                LIVE MAINNET
              </span>
              <span className="text-[var(--border-strong)]">|</span>
              <span className="text-[var(--primary-text)] font-semibold">
                BLOCK #24,832,256
              </span>
              <span className="text-[var(--border-strong)]">|</span>
              <span className="text-[var(--success)] font-semibold">
                BASE FEE: 0.0012 GWEI
              </span>
              <span className="text-[var(--border-strong)]">|</span>
              <span className="text-[var(--text-muted)]">
                EIP-7691: 6 BLOBS/BLK
              </span>
            </div>
          </HeroDitheringContent>

          {/* Cult UI Dithering Visual Primitive */}
          <HeroDitheringVisual />
        </HeroDitheringContainer>

        <HeroDitheringMobileVisual />
      </HeroDitheringRoot>

      {/* ── 2. THE BLOB MARKET, LIVE (Hero Visualizer) ── */}
      <motion.section
        className="py-16 border-t border-dashed border-[var(--border)] relative"
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-60px" }}
        variants={stagger}
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <motion.div variants={fadeUp} className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-8">
            <div>
              <span className="text-[10px] font-mono font-bold uppercase tracking-[0.24em] text-[var(--primary-text)] block mb-1">
                LIVE OBSERVABILITY
              </span>
              <h2 className="text-3xl sm:text-4xl font-sans font-bold tracking-tight text-[var(--text-primary)]">
                The Blob Market, Live
              </h2>
            </div>

            {/* Overlays */}
            <div className="flex flex-wrap items-center gap-4 font-mono text-xs">
              <div className="px-3 py-1.5 bg-[var(--surface-sunken)] border border-[var(--border)] rounded-[4px]">
                <span className="text-[var(--text-muted)] text-[10px] uppercase block">CURRENT UTILIZATION</span>
                <span className="font-bold text-[var(--primary-text)] text-sm">78.4%</span>
              </div>
              <div className="px-3 py-1.5 bg-[var(--surface-sunken)] border border-[var(--border)] rounded-[4px]">
                <span className="text-[var(--text-muted)] text-[10px] uppercase block">BLOB FEE</span>
                <span className="font-bold text-[var(--success)] text-sm">0.0012 GWEI</span>
              </div>
              <div className="px-3 py-1.5 bg-[var(--surface-sunken)] border border-[var(--border)] rounded-[4px]">
                <span className="text-[var(--text-muted)] text-[10px] uppercase block">ACTIVE ROLLUPS</span>
                <span className="font-bold text-[var(--text-primary)] text-sm">18 L2s</span>
              </div>
            </div>
          </motion.div>

          {/* Full-width Live EChart */}
          <motion.div variants={fadeUp} className="cosmic-card tech-bracket p-5 mb-6">
            <div className="flex items-center justify-between pb-3 mb-2 border-b border-[var(--border)] font-mono text-xs">
              <span className="font-bold text-[var(--text-primary)]">BLOB UTILIZATION & BASE FEE TRAJECTORY (24H)</span>
              <span className="text-[10px] text-[var(--text-muted)] uppercase">ECTH-RETH LIVE FEED</span>
            </div>
            <EChartWrapper option={feeChartOption} style={{ height: "320px", width: "100%" }} />
          </motion.div>

          {/* Regime Badges Strip */}
          <motion.div variants={fadeUp} className="flex flex-wrap items-center justify-center gap-6 font-mono text-xs">
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-[2px] bg-[#64748B]" />
              <span className="font-semibold text-[var(--text-muted)]">UNDER-SATURATED (≤2 Blobs)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-[2px] bg-[#10B981]" />
              <span className="font-semibold text-[var(--success)]">HEALTHY (3 Blobs)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-[2px] bg-[#F59E0B]" />
              <span className="font-semibold text-[var(--warning)]">CONGESTED (4-5 Blobs)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-[2px] bg-[#EF4444]" />
              <span className="font-semibold text-[var(--danger)]">SPIKE (≥6 Blobs)</span>
            </div>
          </motion.div>
        </div>
      </motion.section>

      {/* ── 3. ASK THE BLOB LAYER (Dedicated Terminal Section) ── */}
      <motion.section
        className="py-16 border-t border-dashed border-[var(--border)] relative bg-[var(--surface-1)]/40 backdrop-blur-xs"
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-60px" }}
        variants={stagger}
      >
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <motion.div variants={fadeUp} className="text-center mb-8 flex flex-col items-center">
            <span className="text-[10px] font-mono font-bold uppercase tracking-[0.24em] text-[var(--primary-text)] block mb-1">
              COMMAND CONSOLE
            </span>
            <h2 className="text-3xl sm:text-4xl font-sans font-bold tracking-tight text-[var(--text-primary)]">
              Ask the blob layer.
            </h2>
            <p className="text-sm font-sans text-[var(--text-secondary)] max-w-lg mx-auto mt-2">
              Query real-time network parameters, rollup standings, and fee market trends directly.
            </p>
          </motion.div>

          <motion.div variants={fadeUp}>
            <BlobQueryTerminal />
          </motion.div>
        </div>
      </motion.section>

      {/* ── 4. EXPLAIN THE PROBLEM ("Hiding underneath the block") ── */}
      <motion.section
        className="py-20 border-t border-dashed border-[var(--border)] relative"
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-60px" }}
        variants={stagger}
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <motion.div variants={fadeUp} className="text-center mb-14">
            <span className="text-[10px] font-mono font-bold uppercase tracking-[0.24em] text-[var(--primary-text)] block mb-2">
              THE UNSEEN MARKET
            </span>
            <h2 className="text-3xl sm:text-5xl font-sans font-bold tracking-tight text-[var(--text-primary)] max-w-2xl mx-auto leading-tight">
              Ethereum has a second market hiding underneath the block.
            </h2>
            <p className="text-sm font-sans text-[var(--text-secondary)] max-w-lg mx-auto mt-3">
              Standard block explorers stop at L1 transactions. BlobLens decodes what happens inside the parallel blob space.
            </p>
          </motion.div>

          {/* Conceptual Block vs Blob Diagram */}
          <motion.div variants={fadeUp} className="cosmic-card tech-bracket p-8 max-w-4xl mx-auto font-mono">
            <div className="border border-[var(--border)] bg-[var(--surface-sunken)]/60 rounded-md p-5 mb-6 text-center relative overflow-hidden">
              <span className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-widest block mb-3">
                ETHEREUM BLOCK #24,832,256
              </span>
              <div className="space-y-1.5 opacity-60 text-[11px] text-[var(--text-secondary)]">
                <div>[ L1 Execution Tx: Uniswap V3 Swap ]</div>
                <div>[ L1 Execution Tx: ERC-20 Transfer ]</div>
                <div>[ L1 Execution Tx: NFT Mint ]</div>
              </div>
              <div className="my-4 py-2 border-y border-dashed border-[var(--primary-border)] bg-[var(--primary-bg)]/30 text-[var(--primary-text)] font-bold text-xs uppercase tracking-wider">
                ── TYPE-3 BLOB DATA SIDECAR (128 KB PAYLOADS) ──
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2 items-center">
              <div className="p-5 border border-dashed border-[var(--border)] rounded-md bg-[var(--surface-1)]">
                <span className="text-xs font-bold text-[var(--danger)] uppercase tracking-wider block mb-2">
                  ✕ MOST BLOCK EXPLORERS
                </span>
                <p className="text-xs font-sans text-[var(--text-secondary)] leading-relaxed">
                  Stop at transaction hashes and raw bytes. Cannot inspect packing efficiency, fee regimes, or sequencer timing.
                </p>
              </div>

              <div className="p-5 border border-[var(--primary-border)] rounded-md bg-[var(--primary-bg)]">
                <span className="text-xs font-bold text-[var(--primary-text)] uppercase tracking-wider block mb-2">
                  ✓ BLOBLENS OBSERVATORY
                </span>
                <p className="text-xs font-sans text-[var(--text-primary)] leading-relaxed">
                  Decodes <strong>fees · blobs · rollups · packing · utilization · timing · congestion</strong> in real-time.
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </motion.section>

      {/* ── 5. ACTUAL SUPERPOWERS ("One blob market. Four ways to see it.") ── */}
      <motion.section
        className="py-20 border-t border-dashed border-[var(--border)] relative bg-[var(--surface-1)]/50 backdrop-blur-xs"
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-60px" }}
        variants={stagger}
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <motion.div variants={fadeUp} className="text-center mb-14">
            <span className="text-[10px] font-mono font-bold uppercase tracking-[0.24em] text-[var(--primary-text)] block mb-2">
              ANALYTICAL CAPABILITIES
            </span>
            <h2 className="text-3xl sm:text-4xl font-sans font-bold tracking-tight text-[var(--text-primary)]">
              One blob market. Four ways to see it.
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 01 Blob Economics */}
            <motion.div variants={fadeUp} className="cosmic-card tech-bracket flex flex-col justify-between p-6">
              <div>
                <span className="text-xs font-mono font-bold text-[var(--primary-text)] uppercase tracking-widest block mb-2">
                  01 · BLOB ECONOMICS
                </span>
                <h3 className="text-xl font-sans font-bold text-[var(--text-primary)] mb-3">
                  Blob Fee Market & Cost Analytics
                </h3>
                <ul className="space-y-2 font-mono text-xs text-[var(--text-secondary)] mb-6">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-[var(--primary-text)]" /> Real-time Blob base fee & Gwei volatility tracking
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-[var(--primary-text)]" /> Cost-per-byte ($ / KB) comparison across rollups
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-[var(--primary-text)]" /> L1 Calldata baseline cost reduction benchmarking
                  </li>
                </ul>
              </div>
              <Link href="/market" className="text-xs font-mono font-bold text-[var(--primary-text)] hover:underline flex items-center gap-1">
                Explore Market Economics <ArrowRight className="h-3 w-3" />
              </Link>
            </motion.div>

            {/* 02 Rollup Efficiency */}
            <motion.div variants={fadeUp} className="cosmic-card tech-bracket flex flex-col justify-between p-6">
              <div>
                <span className="text-xs font-mono font-bold text-[var(--success)] uppercase tracking-widest block mb-2">
                  02 · ROLLUP EFFICIENCY
                </span>
                <h3 className="text-xl font-sans font-bold text-[var(--text-primary)] mb-3">
                  Sequencer Packing & Timing Ranks
                </h3>
                <ul className="space-y-2 font-mono text-xs text-[var(--text-secondary)] mb-6">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-[var(--success)]" /> 128 KB blob payload packing density fullness %
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-[var(--success)]" /> Fee spike avoidance & submission timing score
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-[var(--success)]" /> Sequencer cost efficiency leaderboard ranking
                  </li>
                </ul>
              </div>
              <Link href="/leaderboard" className="text-xs font-mono font-bold text-[var(--success)] hover:underline flex items-center gap-1">
                View Rollup Leaderboard <ArrowRight className="h-3 w-3" />
              </Link>
            </motion.div>

            {/* 03 Network Pressure */}
            <motion.div variants={fadeUp} className="cosmic-card tech-bracket flex flex-col justify-between p-6">
              <div>
                <span className="text-xs font-mono font-bold text-[var(--warning)] uppercase tracking-widest block mb-2">
                  03 · NETWORK PRESSURE
                </span>
                <h3 className="text-xl font-sans font-bold text-[var(--text-primary)] mb-3">
                  Capacity & Congestion Monitoring
                </h3>
                <ul className="space-y-2 font-mono text-xs text-[var(--text-secondary)] mb-6">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-[var(--warning)]" /> Hour-by-hour slot utilization percentage
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-[var(--warning)]" /> 4-State fee market regime classification
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-[var(--warning)]" /> Mempool congestion forecasting via excess gas trends
                  </li>
                </ul>
              </div>
              <Link href="/da-insights" className="text-xs font-mono font-bold text-[var(--warning)] hover:underline flex items-center gap-1">
                Inspect Network Pressure <ArrowRight className="h-3 w-3" />
              </Link>
            </motion.div>

            {/* 04 Protocol Evolution */}
            <motion.div variants={fadeUp} className="cosmic-card tech-bracket flex flex-col justify-between p-6">
              <div>
                <span className="text-xs font-mono font-bold text-[var(--text-primary)] uppercase tracking-widest block mb-2">
                  04 · PROTOCOL EVOLUTION
                </span>
                <h3 className="text-xl font-sans font-bold text-[var(--text-primary)] mb-3">
                  BPO Upgrade Parameter History
                </h3>
                <ul className="space-y-2 font-mono text-xs text-[var(--text-secondary)] mb-6">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-[var(--primary-text)]" /> Dencun (EIP-4844) → Pectra (EIP-7691) → Fusaka (BPO2)
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-[var(--primary-text)]" /> Target vs Max blob capacity parameter shifts
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-[var(--primary-text)]" /> Network throughput scaling multipliers (2×, 4×)
                  </li>
                </ul>
              </div>
              <Link href="/research" className="text-xs font-mono font-bold text-[var(--primary-text)] hover:underline flex items-center gap-1">
                BPO Parameter Specs <ArrowRight className="h-3 w-3" />
              </Link>
            </motion.div>
          </div>
        </div>
      </motion.section>

      {/* ── 6. THE WOW INTELLIGENCE SECTION ("Raw blobs → useful intelligence") ── */}
      <motion.section
        className="py-20 border-t border-dashed border-[var(--border)] relative"
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-60px" }}
        variants={stagger}
      >
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <motion.div variants={fadeUp} className="text-center mb-14">
            <span className="text-[10px] font-mono font-bold uppercase tracking-[0.24em] text-[var(--primary-text)] block mb-2">
              THE INTELLIGENCE ENGINE
            </span>
            <h2 className="text-3xl sm:text-4xl font-sans font-bold tracking-tight text-[var(--text-primary)]">
              From raw blobs → useful intelligence
            </h2>
            <p className="text-sm font-sans text-[var(--text-secondary)] max-w-lg mx-auto mt-2">
              BlobLens doesn&apos;t just display data — it decodes actionable market insight.
            </p>
          </motion.div>

          <motion.div variants={fadeUp} className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center font-mono">
            {/* Step 1: Raw Data */}
            <div className="cosmic-card tech-bracket p-5 text-center">
              <span className="text-[10px] text-[var(--text-muted)] uppercase block mb-2">INPUT DATA</span>
              <h4 className="text-xs font-bold text-[var(--text-primary)] uppercase mb-3">RAW CHAIN DATA</h4>
              <div className="space-y-1 text-[11px] text-[var(--text-secondary)]">
                <div>Block #24,832,256</div>
                <div>3 Blob Transactions</div>
                <div>14 Blobs Payload</div>
              </div>
            </div>

            {/* Step 2: Engine */}
            <div className="cosmic-card tech-bracket p-5 text-center bg-[var(--primary-bg)] border-[var(--primary-border)]">
              <span className="text-[10px] text-[var(--primary-text)] uppercase block mb-2">PROCESSING</span>
              <h4 className="text-xs font-bold text-[var(--primary-text)] uppercase mb-3">BLOBLENS ENGINE</h4>
              <div className="space-y-1 text-[11px] text-[var(--text-primary)]">
                <div>Packing Analysis</div>
                <div>Fee Regime Detection</div>
                <div>Rollup Attribution</div>
              </div>
            </div>

            {/* Step 3: Insight */}
            <div className="cosmic-card tech-bracket p-5 text-center border-[var(--success)]/40 bg-[var(--success-bg)]/20">
              <span className="text-[10px] text-[var(--success)] uppercase block mb-2">OUTPUT INSIGHT</span>
              <h4 className="text-xs font-bold text-[var(--success)] uppercase mb-3">LIVE INTELLIGENCE</h4>
              <p className="text-[11px] text-[var(--text-primary)] italic leading-relaxed">
                &ldquo;Base is currently packing 18% more efficiently than the 24h ecosystem median.&rdquo;
              </p>
            </div>
          </motion.div>
        </div>
      </motion.section>

      {/* ── 7. REDESIGNED UPGRADE TIMELINE ("The blob market keeps changing...") ── */}
      <motion.section
        className="py-20 border-t border-dashed border-[var(--border)] relative bg-[var(--surface-1)]/40"
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-60px" }}
        variants={stagger}
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <motion.div variants={fadeUp} className="text-center mb-14">
            <span className="text-[10px] font-mono font-bold uppercase tracking-[0.24em] text-[var(--primary-text)] block mb-2">
              CONSENSUS EVOLUTION
            </span>
            <h2 className="text-3xl sm:text-4xl font-sans font-bold tracking-tight text-[var(--text-primary)]">
              The blob market keeps changing. BlobLens keeps the history.
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {BPO_UPGRADES.map((u) => (
              <motion.div
                key={u.name}
                variants={fadeUp}
                className="cosmic-card tech-bracket flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-sans font-bold text-[var(--text-primary)]">
                        {u.name}
                      </h3>
                      <p className="text-[10px] font-mono text-[var(--text-muted)] mt-0.5 uppercase">
                        {u.date} · BLOCK #{u.block}
                      </p>
                    </div>
                    <span className={`text-[9px] font-mono font-bold px-2 py-0.5 border rounded-[4px] ${u.badgeStyle}`}>
                      {u.eip}
                    </span>
                  </div>

                  <p className="text-xs font-mono font-semibold text-[var(--text-primary)] mb-2 uppercase">
                    {u.tagline}
                  </p>
                  <p className="text-xs font-sans text-[var(--text-secondary)] leading-relaxed mb-5">
                    {u.description}
                  </p>

                  <div className="space-y-2 border-t border-dashed border-[var(--border)] pt-4 font-mono text-xs">
                    <div className="flex justify-between">
                      <span className="text-[var(--text-muted)] uppercase text-[10px]">Target Capacity</span>
                      <span className="font-bold text-[var(--text-primary)]">{u.target} Blobs / Block</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[var(--text-muted)] uppercase text-[10px]">Max Capacity</span>
                      <span className="font-bold text-[var(--text-primary)]">{u.max} Blobs / Block</span>
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-3 border-t border-[var(--border)] flex items-center justify-between text-[10px] font-mono text-[var(--text-muted)]">
                  <span>{u.footerNote}</span>
                  <span className="h-2 w-2 rounded-full bg-[var(--primary)]" />
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.section>

      {/* ── 8. EXPLORE THE DATA SECTION ("Explore BlobLens") ── */}
      <motion.section
        className="py-20 border-t border-dashed border-[var(--border)] relative"
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-60px" }}
        variants={stagger}
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <motion.div variants={fadeUp} className="text-center mb-14">
            <span className="text-[10px] font-mono font-bold uppercase tracking-[0.24em] text-[var(--primary-text)] block mb-2">
              NAVIGATION
            </span>
            <h2 className="text-3xl sm:text-4xl font-sans font-bold tracking-tight text-[var(--text-primary)]">
              EXPLORE BLOBLENS
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <motion.div variants={fadeUp} className="cosmic-card tech-bracket flex flex-col justify-between p-6">
              <div>
                <LineChart className="h-6 w-6 text-[var(--primary-text)] mb-3" />
                <h3 className="text-lg font-sans font-bold text-[var(--text-primary)] mb-1">BLOB MARKET</h3>
                <p className="text-xs font-mono text-[var(--text-secondary)] mb-6">Fees · Utilization · Regimes</p>
              </div>
              <Link
                href="/market"
                className="px-4 py-2 bg-[var(--surface-sunken)] border border-[var(--border)] rounded-[4px] font-mono text-xs font-bold text-[var(--primary-text)] hover:bg-[var(--primary-bg)] transition-all flex items-center justify-between"
              >
                [ EXPLORE → ]
              </Link>
            </motion.div>

            <motion.div variants={fadeUp} className="cosmic-card tech-bracket flex flex-col justify-between p-6">
              <div>
                <Trophy className="h-6 w-6 text-[var(--success)] mb-3" />
                <h3 className="text-lg font-sans font-bold text-[var(--text-primary)] mb-1">ROLLUPS</h3>
                <p className="text-xs font-mono text-[var(--text-secondary)] mb-6">Efficiency · Costs · Ranks</p>
              </div>
              <Link
                href="/leaderboard"
                className="px-4 py-2 bg-[var(--surface-sunken)] border border-[var(--border)] rounded-[4px] font-mono text-xs font-bold text-[var(--success)] hover:bg-[var(--success-bg)] transition-all flex items-center justify-between"
              >
                [ EXPLORE → ]
              </Link>
            </motion.div>

            <motion.div variants={fadeUp} className="cosmic-card tech-bracket flex flex-col justify-between p-6">
              <div>
                <Activity className="h-6 w-6 text-[var(--warning)] mb-3" />
                <h3 className="text-lg font-sans font-bold text-[var(--text-primary)] mb-1">DA INSIGHTS</h3>
                <p className="text-xs font-mono text-[var(--text-secondary)] mb-6">Throughput · Capacity</p>
              </div>
              <Link
                href="/da-insights"
                className="px-4 py-2 bg-[var(--surface-sunken)] border border-[var(--border)] rounded-[4px] font-mono text-xs font-bold text-[var(--warning)] hover:bg-[var(--warning-bg)] transition-all flex items-center justify-between"
              >
                [ EXPLORE → ]
              </Link>
            </motion.div>

            <motion.div variants={fadeUp} className="cosmic-card tech-bracket flex flex-col justify-between p-6">
              <div>
                <Cpu className="h-6 w-6 text-[var(--primary-text)] mb-3" />
                <h3 className="text-lg font-sans font-bold text-[var(--text-primary)] mb-1">RESEARCH</h3>
                <p className="text-xs font-mono text-[var(--text-secondary)] mb-6">BPO Matrix · Analytics</p>
              </div>
              <Link
                href="/research"
                className="px-4 py-2 bg-[var(--surface-sunken)] border border-[var(--border)] rounded-[4px] font-mono text-xs font-bold text-[var(--primary-text)] hover:bg-[var(--primary-bg)] transition-all flex items-center justify-between"
              >
                [ EXPLORE → ]
              </Link>
            </motion.div>
          </div>
        </div>
      </motion.section>

      {/* ── 9. BUILT FOR PEOPLE WHO CARE ABOUT DA ── */}
      <motion.section
        className="py-20 border-t border-dashed border-[var(--border)] relative bg-[var(--surface-1)]/50"
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-60px" }}
        variants={stagger}
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <motion.div variants={fadeUp} className="text-center mb-14">
            <h2 className="text-2xl sm:text-3xl font-sans font-bold tracking-tight text-[var(--text-primary)] uppercase">
              BUILT FOR PEOPLE WHO CARE ABOUT DATA AVAILABILITY
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <motion.div variants={fadeUp} className="cosmic-card tech-bracket p-5">
              <span className="text-xs font-mono font-bold text-[var(--primary-text)] uppercase block mb-2">
                ROLLUP ENGINEERS
              </span>
              <p className="text-xs font-sans text-[var(--text-secondary)] leading-relaxed">
                Know when your sequencer is overpaying for blob space and optimize payload packing.
              </p>
            </motion.div>

            <motion.div variants={fadeUp} className="cosmic-card tech-bracket p-5">
              <span className="text-xs font-mono font-bold text-[var(--success)] uppercase block mb-2">
                RESEARCHERS
              </span>
              <p className="text-xs font-sans text-[var(--text-secondary)] leading-relaxed">
                Understand how the blob fee market changes and scales epoch by epoch over time.
              </p>
            </motion.div>

            <motion.div variants={fadeUp} className="cosmic-card tech-bracket p-5">
              <span className="text-xs font-mono font-bold text-[var(--warning)] uppercase block mb-2">
                PROTOCOL TEAMS
              </span>
              <p className="text-xs font-sans text-[var(--text-secondary)] leading-relaxed">
                Measure Ethereum&apos;s data availability capacity as consensus parameters evolve.
              </p>
            </motion.div>

            <motion.div variants={fadeUp} className="cosmic-card tech-bracket p-5">
              <span className="text-xs font-mono font-bold text-[var(--text-primary)] uppercase block mb-2">
                ANALYSTS
              </span>
              <p className="text-xs font-sans text-[var(--text-secondary)] leading-relaxed">
                Turn raw blob sidecar activity into actionable, verifiable market intelligence.
              </p>
            </motion.div>
          </div>
        </div>
      </motion.section>

      {/* ── 10. POWERED BY ETHEREUM'S DATA ── */}
      <motion.section
        className="py-16 border-t border-dashed border-[var(--border)] relative"
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-60px" }}
        variants={stagger}
      >
        <div className="max-w-5xl mx-auto px-4 sm:px-6 text-center">
          <motion.div variants={fadeUp} className="mb-8">
            <span className="text-[10px] font-mono font-bold uppercase tracking-[0.24em] text-[var(--primary-text)] block mb-2">
              INFRASTRUCTURE
            </span>
            <h2 className="text-2xl sm:text-3xl font-sans font-bold tracking-tight text-[var(--text-primary)] uppercase">
              POWERED BY ETHEREUM&apos;S DATA
            </h2>
          </motion.div>

          {/* Pipeline */}
          <motion.div variants={fadeUp} className="flex flex-wrap items-center justify-center gap-2 font-mono text-xs text-[var(--text-secondary)] mb-8">
            <span className="px-3 py-1 bg-[var(--surface-sunken)] border border-[var(--border)] rounded-[4px]">Ethereum Mainnet</span>
            <span>→</span>
            <span className="px-3 py-1 bg-[var(--surface-sunken)] border border-[var(--border)] rounded-[4px]">Reth</span>
            <span>→</span>
            <span className="px-3 py-1 bg-[var(--surface-sunken)] border border-[var(--border)] rounded-[4px]">BlobLens Indexer</span>
            <span>→</span>
            <span className="px-3 py-1 bg-[var(--surface-sunken)] border border-[var(--border)] rounded-[4px]">ClickHouse</span>
            <span>→</span>
            <span className="px-3 py-1 bg-[var(--primary-bg)] border border-[var(--primary-border)] text-[var(--primary-text)] font-bold rounded-[4px]">Live Intelligence</span>
          </motion.div>

          {/* Credibility Badges */}
          <motion.div variants={fadeUp} className="flex flex-wrap justify-center gap-4 font-mono text-[10px]">
            <span className="px-3 py-1 border border-[var(--border)] rounded-full text-[var(--text-muted)]">OPEN SOURCE</span>
            <span className="px-3 py-1 border border-[var(--border)] rounded-full text-[var(--text-muted)]">PUBLIC DATA</span>
            <span className="px-3 py-1 border border-[var(--border)] rounded-full text-[var(--text-muted)]">REAL-TIME INDEXING</span>
            <span className="px-3 py-1 border border-[var(--border)] rounded-full text-[var(--text-muted)]">VERIFIABLE METRICS</span>
          </motion.div>
        </div>
      </motion.section>

      {/* ── 11. FINAL CTA ── */}
      <motion.section
        className="py-24 border-t border-dashed border-[var(--border)] relative overflow-hidden"
        initial="hidden"
        whileInView="show"
        viewport={{ once: true }}
        variants={stagger}
      >
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse at 50% 50%, var(--primary) 0%, transparent 70%)",
            opacity: 0.08,
          }}
        />

        <div className="max-w-3xl mx-auto px-4 sm:px-6 relative z-10 text-center">
          <motion.h2
            variants={fadeUp}
            className="text-3xl sm:text-5xl font-sans font-bold tracking-tight text-[var(--text-primary)] mb-3"
          >
            The blob market is already moving.
          </motion.h2>
          <motion.p
            variants={fadeUp}
            className="text-base font-sans text-[var(--text-secondary)] mb-8"
          >
            See where the capacity is going.
          </motion.p>

          <motion.div variants={fadeUp} className="flex items-center justify-center mb-10">
            <Link
              href="/dashboard"
              className="px-10 py-4 bg-[var(--primary)] text-[var(--primary-fg)] border border-[var(--primary)] hover:bg-[var(--primary-hover)] rounded-md font-mono font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-lg hover:shadow-xl group"
            >
              [ OPEN BLOBLENS ] <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </motion.div>

          <motion.div variants={fadeUp} className="flex flex-wrap items-center justify-center gap-6 font-mono text-xs text-[var(--text-muted)]">
            <a href="https://github.com/AvarchLLC/blob_lens" target="_blank" rel="noopener noreferrer" className="hover:text-[var(--primary-text)] transition-colors">GitHub</a>
            <span>·</span>
            <Link href="/research" className="hover:text-[var(--primary-text)] transition-colors">Docs</Link>
            <span>·</span>
            <Link href="/da-insights" className="hover:text-[var(--primary-text)] transition-colors">API</Link>
            <span>·</span>
            <Link href="/research" className="hover:text-[var(--primary-text)] transition-colors">Research</Link>
          </motion.div>
        </div>
      </motion.section>
    </div>
  );
}
