"use client";

import { motion, useInView } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { useRef } from "react";

// ── Data ──────────────────────────────────────────────────────────────────────

const STATS = [
  { value: "110K+", label: "Blobs indexed" },
  { value: "40+", label: "Rollups tracked" },
  { value: "12s", label: "Live refresh" },
  { value: "100%", label: "Open source" },
];

const ROLLUPS = [
  { name: "Base", color: "#2563EB" },
  { name: "Arbitrum One", color: "#1D4ED8" },
  { name: "OP Mainnet", color: "#DC2626" },
  { name: "zkSync Era", color: "#8B5CF6" },
  { name: "Starknet", color: "#E11D48" },
  { name: "Linea", color: "#0EA5E9" },
  { name: "Scroll", color: "#FBBF24" },
  { name: "Taiko", color: "#F97316" },
  { name: "World Chain", color: "#10B981" },
  { name: "Unichain", color: "#FF007A" },
  { name: "Blast", color: "#FCD34D" },
  { name: "Zora", color: "#7C3AED" },
  { name: "Soneium", color: "#06B6D4" },
  { name: "Mode", color: "#84CC16" },
  { name: "Mantle", color: "#A3E635" },
  { name: "Morph", color: "#34D399" },
  { name: "Lisk", color: "#60A5FA" },
  { name: "Cyber", color: "#C084FC" },
];

const REGIME_STATES = [
  { label: "Undersaturated", color: "#3f3f46", desc: "Quiet market, post cheaply" },
  { label: "Healthy", color: "#00df81", desc: "Near target, optimal window" },
  { label: "Congested", color: "#fcbb00", desc: "Above target, fees rising" },
  { label: "Spike", color: "#fb2c36", desc: "Fully packed, fee surge" },
];

const FORECAST_ROWS = [
  { slot: "+4 slots", regime: "Healthy", color: "#00df81", delta: "+2%" },
  { slot: "+8 slots", regime: "Healthy", color: "#00df81", delta: "+5%" },
  { slot: "+12 slots", regime: "Congested", color: "#fcbb00", delta: "+18%" },
  { slot: "+25 slots", regime: "Congested", color: "#fcbb00", delta: "+31%" },
  { slot: "+50 slots", regime: "Spike", color: "#fb2c36", delta: "+72%" },
];

const LEADERBOARD_ROWS = [
  { rank: 1, name: "Linea", packing: 100, timing: 88, efficiency: 96, cost: "0.0042" },
  { rank: 2, name: "Starknet", packing: 99, timing: 82, efficiency: 94, cost: "0.0051" },
  { rank: 3, name: "Base", packing: 83, timing: 91, efficiency: 89, cost: "0.0068" },
  { rank: 4, name: "OP Mainnet", packing: 83, timing: 79, efficiency: 82, cost: "0.0074" },
  { rank: 5, name: "Arbitrum One", packing: 50, timing: 76, efficiency: 58, cost: "0.0093" },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  visible: (i = 0) => ({ opacity: 1, y: 0, transition: { duration: 0.55, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] } }),
};

function Section({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  return (
    <motion.section
      ref={ref}
      initial="hidden"
      animate={inView ? "visible" : "hidden"}
      className={className}
    >
      {children}
    </motion.section>
  );
}

function Tag({ text, color = "#00df81" }: { text: string; color?: string }) {
  return (
    <span
      className="wordmark-sub inline-block rounded-full px-2.5 py-0.5"
      style={{ background: `${color}18`, color, border: `1px solid ${color}30` }}
    >
      {text}
    </span>
  );
}

// ── Feature Cards ─────────────────────────────────────────────────────────────

function LeaderboardCard() {
  return (
    <div className="flex flex-col gap-3 h-full">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] font-mono text-[#71717a] uppercase tracking-widest">Rollup</span>
        <span className="text-[10px] font-mono text-[#71717a] uppercase tracking-widest">Efficiency</span>
      </div>
      {LEADERBOARD_ROWS.map((row, i) => (
        <motion.div
          key={row.name}
          custom={i}
          variants={fadeUp}
          className="flex items-center gap-3"
        >
          <span className="w-4 text-[11px] font-mono text-[#52525b]">{row.rank}</span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[12px] font-semibold text-[#e4e4e7] truncate">{row.name}</span>
              <span className="text-[11px] font-mono text-[#00df81] ml-2">{row.efficiency}</span>
            </div>
            <div className="h-1 rounded-full bg-[#27272a] overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                style={{ background: "linear-gradient(90deg, #00df81, #27a98d)" }}
                initial={{ width: 0 }}
                animate={{ width: `${row.efficiency}%` }}
                transition={{ duration: 0.8, delay: 0.3 + i * 0.1, ease: "easeOut" }}
              />
            </div>
          </div>
          <span className="text-[10px] font-mono text-[#52525b] w-14 text-right">{row.cost} ETH</span>
        </motion.div>
      ))}
    </div>
  );
}

function ForecastCard() {
  return (
    <div className="flex flex-col gap-2 h-full">
      <div className="flex items-center gap-2 mb-1">
        <span className="h-1.5 w-1.5 rounded-full bg-[#fcbb00] animate-pulse" />
        <span className="text-[10px] font-mono text-[#fcbb00]">FEE PRESSURE · RISING</span>
      </div>
      {FORECAST_ROWS.map((row, i) => (
        <motion.div
          key={row.slot}
          custom={i}
          variants={fadeUp}
          className="flex items-center justify-between rounded-lg px-3 py-2"
          style={{ background: `${row.color}0a`, border: `1px solid ${row.color}20` }}
        >
          <span className="text-[11px] font-mono text-[#a1a1aa]">{row.slot}</span>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono" style={{ color: row.color }}>{row.regime}</span>
            <span className="text-[10px] font-mono text-[#71717a]">{row.delta}</span>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

function RegimeCard() {
  return (
    <div className="flex flex-col gap-3 h-full">
      <p className="text-[11px] text-[#71717a] font-mono">Real-time classification from <span className="text-[#a1a1aa]">max_blobs_in_block</span></p>
      {REGIME_STATES.map((s, i) => (
        <motion.div
          key={s.label}
          custom={i}
          variants={fadeUp}
          className="flex items-center gap-3 rounded-lg px-3 py-2.5"
          style={{ background: `${s.color}0d`, border: `1px solid ${s.color}25` }}
        >
          <span className="h-2 w-2 rounded-full shrink-0" style={{ background: s.color, boxShadow: `0 0 6px ${s.color}` }} />
          <div>
            <p className="text-[12px] font-semibold" style={{ color: s.color }}>{s.label}</p>
            <p className="text-[10px] text-[#71717a]">{s.desc}</p>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

function AlertCard() {
  return (
    <div className="flex flex-col gap-3 h-full">
      <p className="text-[11px] text-[#71717a] font-mono">Webhook fires when regime crosses threshold</p>
      <div className="rounded-lg border border-[#27272a] bg-[#0f0f11] p-3 font-mono text-[10px] leading-relaxed text-[#52525b]">
        <span className="text-[#27a98d]">POST</span> <span className="text-[#a1a1aa]">https://your-webhook.io/alerts</span>
        <br />
        <span className="text-[#3f3f46]">{`{`}</span>
        <br />
        <span className="text-[#52525b]">&nbsp;&nbsp;"event":</span> <span className="text-[#fbbf24]">"regime_change"</span>,
        <br />
        <span className="text-[#52525b]">&nbsp;&nbsp;"regime":</span> <span className="text-[#fb2c36]">"congested"</span>,
        <br />
        <span className="text-[#52525b]">&nbsp;&nbsp;"fee_gwei":</span> <span className="text-[#60a5fa]">0.142</span>,
        <br />
        <span className="text-[#52525b]">&nbsp;&nbsp;"timestamp":</span> <span className="text-[#fbbf24]">"2026-05-13T..."</span>
        <br />
        <span className="text-[#3f3f46]">{`}`}</span>
      </div>
      <div className="flex gap-2">
        {["Healthy+", "Congested+", "Spike only"].map((t, i) => (
          <span key={t} className="rounded-full px-2 py-0.5 text-[9px] font-mono border border-[#27272a] text-[#71717a]"
            style={i === 1 ? { borderColor: "#fcbb0040", color: "#fcbb00" } : {}}>
            {t}
          </span>
        ))}
      </div>
    </div>
  );
}

function HowItWorksStep({ n, title, desc, delay }: { n: string; title: string; desc: string; delay: number }) {
  return (
    <motion.div variants={fadeUp} custom={delay} className="flex gap-5 items-start">
      <div className="wordmark-sub shrink-0 h-9 w-9 rounded-xl flex items-center justify-center font-bold text-[#09090b]"
        style={{ background: "linear-gradient(135deg, #00df81, #27a98d)" }}>
        {n}
      </div>
      <div>
        <p className="wordmark text-[1rem] text-[#e4e4e7] mb-1">{title}</p>
        <p className="wordmark-sub text-[0.8rem] text-[#71717a] leading-relaxed normal-case tracking-normal">{desc}</p>
      </div>
    </motion.div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#09090b] text-[#fafafa] overflow-x-hidden">

      {/* ── Ambient background ── */}
      <div className="fixed inset-0 pointer-events-none" aria-hidden>
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[600px] rounded-full opacity-[0.07]"
          style={{ background: "radial-gradient(ellipse at 50% 0%, #00df81 0%, transparent 70%)" }} />
        <div className="absolute top-[40%] right-0 w-[500px] h-[500px] rounded-full opacity-[0.04]"
          style={{ background: "radial-gradient(circle, #2563eb 0%, transparent 70%)" }} />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full opacity-[0.04]"
          style={{ background: "radial-gradient(circle, #7c3aed 0%, transparent 70%)" }} />
      </div>

      {/* ── Hero ── */}
      <section className="relative pt-24 pb-20 px-6 max-w-5xl mx-auto text-center">
        <motion.div initial={{ opacity: 0, scale: 0.88 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="flex justify-center mb-8">
          <div className="relative">
            <div className="absolute inset-0 rounded-2xl blur-2xl opacity-40"
              style={{ background: "radial-gradient(circle, #00df81 0%, transparent 70%)" }} />
            <Image
              src="/brand/bloblogo.png"
              alt="BlobLens"
              width={80}
              height={80}
              className="relative rounded-2xl"
              priority
            />
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55, delay: 0.1 }}>
          <h1 className="wordmark text-5xl sm:text-7xl tracking-tight mb-5 leading-[1.05]">
            <span style={{ background: "linear-gradient(135deg, #ffffff 30%, #a1a1aa)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              Blob
            </span>
            <span style={{ background: "linear-gradient(135deg, #00df81, #27a98d)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              Lens
            </span>
          </h1>
        </motion.div>

        <motion.p initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55, delay: 0.18 }}
          className="wordmark text-[18px] sm:text-[22px] font-normal text-[#a1a1aa] max-w-xl mx-auto leading-relaxed mb-4">
          Real-time EIP-4844 analytics for the Ethereum blob market.
        </motion.p>
        <motion.p initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55, delay: 0.24 }}
          className="wordmark-sub text-[0.85rem] normal-case tracking-normal text-[#52525b] max-w-lg mx-auto leading-relaxed mb-10">
          Track rollup efficiency, forecast congestion, and receive webhook alerts — all from a single open-source dashboard.
        </motion.p>

        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.32 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-16">
          <Link href="/"
            className="group relative px-7 py-3 rounded-xl font-semibold text-[15px] text-[#09090b] transition-all duration-200 overflow-hidden"
            style={{ background: "linear-gradient(135deg, #00df81, #27a98d)" }}>
            <span className="relative z-10">Open Dashboard →</span>
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
              style={{ background: "linear-gradient(135deg, #27a98d, #00df81)" }} />
          </Link>
          <a href="https://github.com/AvarchLLC/blob_lens" target="_blank" rel="noopener noreferrer"
            className="px-7 py-3 rounded-xl font-semibold text-[15px] text-[#a1a1aa] border border-[#27272a] hover:border-[#3f3f46] hover:text-[#fafafa] transition-all duration-200 bg-[#09090b]/50 backdrop-blur-sm">
            GitHub ↗
          </a>
        </motion.div>

        {/* Stats strip */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.4 }}
          className="grid grid-cols-2 sm:grid-cols-4 gap-px rounded-2xl overflow-hidden border border-[#27272a]">
          {STATS.map((s) => (
            <div key={s.label} className="bg-[#18181b]/80 backdrop-blur-sm px-6 py-5 text-center">
              <p className="text-[26px] font-bold tracking-tight" style={{ background: "linear-gradient(135deg, #00df81, #27a98d)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                {s.value}
              </p>
              <p className="text-[11px] text-[#71717a] mt-0.5 uppercase tracking-widest font-mono">{s.label}</p>
            </div>
          ))}
        </motion.div>
      </section>

      {/* ── Divider ── */}
      <div className="h-px bg-gradient-to-r from-transparent via-[#27272a] to-transparent" />

      {/* ── Feature grid ── */}
      <Section className="py-24 px-6 max-w-5xl mx-auto">
        <motion.div variants={fadeUp} custom={0} className="text-center mb-14">
          <Tag text="Features" />
          <h2 className="wordmark mt-4 text-3xl sm:text-4xl tracking-tight">
            Everything the blob market needs
          </h2>
          <p className="wordmark-sub mt-3 text-[#71717a] text-[0.85rem] max-w-md mx-auto normal-case tracking-normal leading-relaxed">
            Built to close two specific gaps in Ethereum DA tooling — efficiency scoring and live market health.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 auto-rows-auto">

          {/* Large: Leaderboard */}
          <motion.div variants={fadeUp} custom={1}
            className="md:col-span-2 rounded-2xl border border-[#27272a] bg-[#0f0f11] p-6 hover:border-[#3f3f46] transition-colors duration-300 group relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-px" style={{ background: "linear-gradient(90deg, transparent, #00df8140, transparent)" }} />
            <div className="flex items-start justify-between mb-5">
              <div>
                <Tag text="Gap 1 · Efficiency Scoring" />
                <h3 className="wordmark mt-2 text-[1.1rem] text-[#fafafa]">Rollup Efficiency Leaderboard</h3>
                <p className="wordmark-sub mt-1 max-w-sm text-[0.75rem] normal-case tracking-normal text-[#71717a]">Every rollup scored on packing, timing, fullness ratio and DA cost. See who wastes blob space and who doesn&apos;t.</p>
              </div>
            </div>
            <LeaderboardCard />
          </motion.div>

          {/* Congestion Forecast */}
          <motion.div variants={fadeUp} custom={2}
            className="rounded-2xl border border-[#27272a] bg-[#0f0f11] p-6 hover:border-[#3f3f46] transition-colors duration-300 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-px" style={{ background: "linear-gradient(90deg, transparent, #fcbb0040, transparent)" }} />
            <Tag text="Gap 2 · Forecast" color="#fcbb00" />
            <h3 className="wordmark mt-2 text-[1.05rem] text-[#fafafa] mb-1">Congestion Forecast</h3>
            <p className="wordmark-sub text-[0.75rem] normal-case tracking-normal text-[#71717a] mb-4">4–50 block fee projections using the exact EIP-4844 formula from <code className="font-mono text-[#a1a1aa]">excess_blob_gas</code>.</p>
            <ForecastCard />
          </motion.div>

          {/* Regime Classifier */}
          <motion.div variants={fadeUp} custom={3}
            className="rounded-2xl border border-[#27272a] bg-[#0f0f11] p-6 hover:border-[#3f3f46] transition-colors duration-300 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-px" style={{ background: "linear-gradient(90deg, transparent, #00df8130, transparent)" }} />
            <Tag text="Gap 2 · Classifier" />
            <h3 className="wordmark mt-2 text-[1.05rem] text-[#fafafa] mb-1">Market Regime</h3>
            <p className="wordmark-sub text-[0.75rem] normal-case tracking-normal text-[#71717a] mb-4">4-state real-time classification derived from <code className="font-mono text-[#a1a1aa]">max_blobs_in_block</code>.</p>
            <RegimeCard />
          </motion.div>

          {/* Webhook Alerts */}
          <motion.div variants={fadeUp} custom={4}
            className="rounded-2xl border border-[#27272a] bg-[#0f0f11] p-6 hover:border-[#3f3f46] transition-colors duration-300 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-px" style={{ background: "linear-gradient(90deg, transparent, #fb2c3630, transparent)" }} />
            <Tag text="Gap 2 · Alerts" color="#fb2c36" />
            <h3 className="wordmark mt-2 text-[1.05rem] text-[#fafafa] mb-1">Webhook Alerts</h3>
            <p className="wordmark-sub text-[0.75rem] normal-case tracking-normal text-[#71717a] mb-4">Register a URL, pick a threshold. BlobLens fires a POST when the market crosses it.</p>
            <AlertCard />
          </motion.div>

          {/* Blob Viewer + Network Graph combined */}
          <motion.div variants={fadeUp} custom={5}
            className="rounded-2xl border border-[#27272a] bg-[#0f0f11] p-6 hover:border-[#3f3f46] transition-colors duration-300 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-px" style={{ background: "linear-gradient(90deg, transparent, #7c3aed30, transparent)" }} />
            <Tag text="Explorer" color="#7c3aed" />
            <h3 className="wordmark mt-2 text-[1.05rem] text-[#fafafa] mb-1">Blob Data Viewer</h3>
            <p className="wordmark-sub text-[0.75rem] normal-case tracking-normal text-[#71717a] mb-4">Inspect raw blob content. Auto-detects OP-Stack, zlib, zstd, and Arbitrum encoding from first bytes.</p>
            <div className="rounded-lg bg-[#09090b] border border-[#27272a] p-3 font-mono text-[10px] leading-relaxed">
              <div className="flex items-center gap-2 mb-2">
                <span className="rounded px-1.5 py-0.5 text-[9px]" style={{ background: "#0052FF18", color: "#60A5FA", border: "1px solid #0052FF30" }}>OP-Stack</span>
                <span className="text-[#71717a]">field-element packed</span>
                <span className="ml-auto text-[#00df81]">63.2% full</span>
              </div>
              <div className="h-1.5 rounded-full bg-[#27272a] overflow-hidden mb-2">
                <div className="h-full rounded-full bg-gradient-to-r from-[#00df81] to-[#27a98d]" style={{ width: "63.2%" }} />
              </div>
              <span className="text-[#3f3f46]">0x</span>
              <span className="text-[#52525b]">00 2f 8a 14 b9 c3 </span>
              <span className="text-[#71717a]">e7 04 11 5d a2 f0</span>
              <span className="text-[#52525b]"> 8c 3b...</span>
            </div>
          </motion.div>

        </div>
      </Section>

      {/* ── Rollup marquee ── */}
      <div className="border-y border-[#27272a] py-8 overflow-hidden">
        <p className="wordmark-sub text-center text-[#52525b] mb-6">
          Tracking {ROLLUPS.length}+ rollups live
        </p>
        <div className="flex gap-4 animate-marquee whitespace-nowrap">
          {[...ROLLUPS, ...ROLLUPS].map((r, i) => (
            <span key={i}
              className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-[12px] font-medium border shrink-0"
              style={{ borderColor: `${r.color}30`, color: r.color, background: `${r.color}0a` }}>
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: r.color }} />
              {r.name}
            </span>
          ))}
        </div>
      </div>

      {/* ── How it works ── */}
      <Section className="py-24 px-6 max-w-3xl mx-auto">
        <motion.div variants={fadeUp} custom={0} className="text-center mb-14">
          <Tag text="Architecture" color="#7c3aed" />
          <h2 className="wordmark mt-4 text-3xl sm:text-4xl tracking-tight">How it works</h2>
          <p className="wordmark-sub mt-3 text-[#71717a] text-[0.85rem] normal-case tracking-normal">
            From raw Ethereum blocks to insight in one pipeline.
          </p>
        </motion.div>

        <div className="flex flex-col gap-8">
          <HowItWorksStep
            n="1"
            title="Index every blob transaction"
            desc="A Rust service streams all Type-3 transactions via Alchemy WebSocket. Each block writes blob count, excess_blob_gas, and per-tx metadata to Postgres in real time."
            delay={1}
          />
          <div className="ml-4 w-px h-6 bg-[#27272a]" />
          <HowItWorksStep
            n="2"
            title="Score rollup efficiency"
            desc="Packing score, timing score, fullness ratio, ghost blob detection, and DA cost are computed per rollup every query. No batch job — always fresh."
            delay={2}
          />
          <div className="ml-4 w-px h-6 bg-[#27272a]" />
          <HowItWorksStep
            n="3"
            title="Visualize and alert"
            desc="The Next.js dashboard queries Postgres directly — no middleman API. Webhook alerts fire when your registered regime threshold is crossed."
            delay={3}
          />
        </div>
      </Section>

      {/* ── Open source callout ── */}
      <Section className="py-16 px-6 max-w-5xl mx-auto">
        <motion.div variants={fadeUp} custom={0}
          className="relative rounded-3xl border border-[#27272a] bg-[#0f0f11] p-10 sm:p-14 text-center overflow-hidden">
          <div className="absolute inset-0 pointer-events-none" aria-hidden>
            <div className="absolute top-0 left-0 right-0 h-px" style={{ background: "linear-gradient(90deg, transparent, #00df8150, transparent)" }} />
            <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[500px] h-[300px] rounded-full opacity-[0.06]"
              style={{ background: "radial-gradient(ellipse, #00df81 0%, transparent 70%)" }} />
          </div>
          <Tag text="Self-hostable" />
          <h2 className="wordmark mt-5 text-3xl sm:text-4xl tracking-tight max-w-lg mx-auto leading-tight">
            One command to run the whole stack
          </h2>
          <p className="wordmark-sub mt-4 text-[#71717a] text-[0.85rem] max-w-md mx-auto leading-relaxed normal-case tracking-normal">
            Postgres + Rust indexer + Next.js dashboard — all wired up in a single <code className="text-[#a1a1aa] bg-[#27272a] px-1.5 py-0.5 rounded">docker-compose</code>.
            Add your <code className="text-[#a1a1aa] bg-[#27272a] px-1.5 py-0.5 rounded">ALCHEMY_KEY</code> and start indexing.
          </p>
          <div className="mt-8 max-w-sm mx-auto rounded-xl border border-[#27272a] bg-[#09090b] px-5 py-4 font-mono text-[13px] text-left">
            <span className="text-[#52525b]">$ </span>
            <span className="text-[#a1a1aa]">cp .env.example .env</span>
            <br />
            <span className="text-[#52525b]">$ </span>
            <span className="text-[#00df81]">docker-compose up --build</span>
          </div>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/"
              className="px-7 py-3 rounded-xl font-semibold text-[15px] text-[#09090b] transition-all duration-200"
              style={{ background: "linear-gradient(135deg, #00df81, #27a98d)" }}>
              Open Dashboard →
            </Link>
            <a href="https://github.com/AvarchLLC/blob_lens" target="_blank" rel="noopener noreferrer"
              className="px-7 py-3 rounded-xl font-semibold text-[15px] text-[#a1a1aa] border border-[#27272a] hover:border-[#3f3f46] hover:text-[#fafafa] transition-all duration-200">
              View on GitHub ↗
            </a>
          </div>
        </motion.div>
      </Section>

      {/* ── Footer ── */}
      <footer className="border-t border-[#27272a] py-10 px-6 text-center">
        <div className="flex items-center justify-center gap-3 mb-4">
          <Image src="/brand/bloblogo.png" alt="BlobLens" width={24} height={24} className="rounded-md opacity-80" />
          <span className="wordmark text-[1.1rem] text-[#a1a1aa]">BlobLens</span>
        </div>
        <p className="text-[12px] text-[#52525b]">
          Open-source EIP-4844 analytics by{" "}
          <a href="https://github.com/AvarchLLC" target="_blank" rel="noopener noreferrer" className="text-[#71717a] hover:text-[#a1a1aa] transition-colors">
            Avarch LLC
          </a>
          . Public goods infrastructure for Ethereum.
        </p>
      </footer>

      {/* ── Marquee keyframes ── */}
      <style>{`
        @keyframes marquee {
          from { transform: translateX(0); }
          to   { transform: translateX(-50%); }
        }
        .animate-marquee {
          animation: marquee 32s linear infinite;
        }
        .animate-marquee:hover {
          animation-play-state: paused;
        }
      `}</style>

    </div>
  );
}
