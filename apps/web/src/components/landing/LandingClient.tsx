"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { formatNumber } from "@/lib/utils";
import { EcosystemMapPreview } from "./EcosystemMapPreview";
import {
  BarChart3, Github, ShieldCheck, Zap, ArrowRight,
  Search, Activity, Trophy, Layers, CircleDot, TrendingUp,
} from "lucide-react";
import { ThemeToggle } from "@/components/shared/ThemeToggle";
import { useEffect, useState } from "react";

const fadeUp = { hidden: { opacity: 0, y: 30 }, show: { opacity: 1, y: 0 } };
const stagger = { show: { transition: { staggerChildren: 0.1 } } };

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

interface Props {
  stats: { total_txs: number; total_blobs: number; rollup_count: number; avg_utilization_24h: number };
}

export function LandingClient({ stats }: Props) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const el = document.querySelector("[data-landing-scroll]");
    if (!el) return;
    const handler = () => setScrolled(el.scrollTop > 20);
    el.addEventListener("scroll", handler, { passive: true });
    return () => el.removeEventListener("scroll", handler);
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/30">

      {/* ══ Floating Orbs ══ */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0" aria-hidden>
        <div className="landing-orb landing-orb-1" />
        <div className="landing-orb landing-orb-2" />
        <div className="landing-orb landing-orb-3" />
      </div>

      {/* ══ Navbar ══ */}
      <nav className={`fixed top-0 w-full z-50 transition-all duration-500 ${scrolled ? "bg-background/80 backdrop-blur-xl border-b border-border/40 shadow-lg shadow-black/5" : "bg-transparent border-b border-transparent"}`}>
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group">
            <motion.div initial={{ rotate: -180, scale: 0 }} animate={{ rotate: 0, scale: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 15 }}
              className="h-8 w-8 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg shadow-primary/25">
              <img src="/brand/bloblogo.png" alt="" className="h-5 w-5 brightness-200" />
            </motion.div>
            <motion.span initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}
              className="text-lg font-bold tracking-tight">
              Blob<span className="text-primary">Lens</span>
            </motion.span>
          </Link>

          <div className="flex items-center gap-1">
            {["Dashboard", "Leaderboard", "Market"].map((item, i) => (
              <motion.div key={item} initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 + i * 0.05 }}>
                <Link href={`/${item.toLowerCase()}`}
                  className="px-3.5 py-2 text-[13px] font-medium text-text-secondary hover:text-primary hover:bg-primary/5 rounded-lg transition-all hidden md:block">
                  {item}
                </Link>
              </motion.div>
            ))}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
              className="flex items-center gap-2 ml-2">
              <div className="h-5 w-px bg-border/40 hidden md:block" />
              <ThemeToggle />
              <Link href="/dashboard"
                className="group px-4 py-2 bg-gradient-to-r from-primary to-accent text-white text-[11px] font-bold uppercase tracking-widest rounded-lg transition-all hover:shadow-lg hover:shadow-primary/25 hover:-translate-y-px">
                Launch App
              </Link>
            </motion.div>
          </div>
        </div>
      </nav>

      {/* ══ Hero ══ */}
      <section className="relative pt-36 pb-28 overflow-hidden">
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: "radial-gradient(circle, var(--text-secondary) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }} />

        <motion.div className="max-w-5xl mx-auto px-6 relative z-10 text-center"
          variants={stagger} initial="hidden" animate="show">

          <motion.div variants={fadeUp}
            className="inline-flex items-center gap-2.5 px-4 py-2 bg-primary/8 border border-primary/15 rounded-full mb-8 backdrop-blur-sm">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
            </span>
            <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-primary">Live on Ethereum Mainnet</span>
          </motion.div>

          <motion.h1 variants={fadeUp}
            className="text-[3.5rem] md:text-[5rem] font-bold tracking-[-0.04em] mb-6 leading-[1.02]">
            <span className="block">Protocol Intelligence</span>
            <span className="block">for the{" "}
              <span className="relative inline-block">
                <span className="relative z-10 bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent bg-[length:200%_auto] animate-[shimmer_3s_ease-in-out_infinite]">
                  Blob
                </span>
              </span>
              {" "}Era
            </span>
          </motion.h1>

          <motion.p variants={fadeUp}
            className="text-lg md:text-xl text-text-secondary/70 max-w-xl mx-auto mb-12 leading-relaxed font-light">
            Real-time EIP-4844 analytics for researchers, rollup teams, and DA cost optimizers.
          </motion.p>

          <motion.div variants={fadeUp} className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-24">
            <Link href="/dashboard"
              className="group w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-primary to-accent text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all hover:shadow-2xl hover:shadow-primary/30 hover:-translate-y-0.5 active:translate-y-0">
              Explore Dashboard
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
            <a href="https://github.com/AvarchLLC/blob_lens" target="_blank" rel="noopener noreferrer"
              className="w-full sm:w-auto px-8 py-4 bg-surface/60 backdrop-blur border border-border/50 rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-surface-elevated hover:border-primary/20 transition-all">
              <Github className="h-4 w-4" /> View Source
            </a>
          </motion.div>

          {/* Stats */}
          <motion.div variants={fadeUp}
            className="grid grid-cols-2 md:grid-cols-4 gap-px rounded-2xl overflow-hidden border border-border/30 bg-border/30 max-w-4xl mx-auto backdrop-blur-sm">
            {[
              { label: "Total Blobs", val: stats.total_blobs, icon: Layers },
              { label: "Transactions", val: stats.total_txs, icon: TrendingUp },
              { label: "Active Rollups", val: stats.rollup_count, icon: CircleDot },
              { label: "Avg Utilization", val: stats.avg_utilization_24h, icon: Activity, suffix: "%" },
            ].map((s) => (
              <div key={s.label} className="bg-background/80 backdrop-blur-md px-6 py-6 text-center group hover:bg-surface/50 transition-colors">
                <s.icon className="h-4 w-4 text-primary/50 mx-auto mb-2 group-hover:text-primary transition-colors" />
                <p className="font-mono text-2xl md:text-3xl font-bold text-text-primary tracking-tight">
                  <AnimatedCounter value={s.val} suffix={s.suffix} />
                </p>
                <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-text-secondary/40 mt-1.5">{s.label}</p>
              </div>
            ))}
          </motion.div>
        </motion.div>
      </section>

      {/* ══ Problem ══ */}
      <motion.section className="py-24 border-y border-border/20 relative"
        initial="hidden" whileInView="show" viewport={{ once: true, margin: "-100px" }} variants={stagger}>
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <motion.div variants={fadeUp}>
              <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-primary mb-3 block">The Problem</span>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-6 leading-tight">
                Ethereum&apos;s blob market<br />is <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">opaque.</span>
              </h2>
              <p className="text-text-secondary/80 leading-relaxed mb-8">
                EIP-4844 created a new DA layer, but block explorers don&apos;t speak &quot;blob.&quot; They can&apos;t tell you who wastes space, who times the market, or when congestion spikes.
              </p>
              <div className="space-y-3">
                {[
                  { icon: Zap, text: "Rollup teams need to optimize DA cost per byte", color: "from-amber-400 to-orange-500" },
                  { icon: Activity, text: "Researchers need health-checks on market regimes", color: "from-primary to-accent" },
                  { icon: Search, text: "MEV searchers monitor congestion for timing edge", color: "from-violet-400 to-purple-500" },
                ].map((item, i) => (
                  <motion.div key={i} variants={fadeUp} className="flex items-center gap-3 group">
                    <div className={`h-9 w-9 rounded-xl bg-gradient-to-br ${item.color} flex items-center justify-center shrink-0 shadow-lg opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all`}>
                      <item.icon className="h-4 w-4 text-white" />
                    </div>
                    <span className="text-sm font-medium text-text-primary/80 group-hover:text-text-primary transition-colors">{item.text}</span>
                  </motion.div>
                ))}
              </div>
            </motion.div>
            <motion.div variants={fadeUp} className="relative group">
              <div className="absolute -inset-6 bg-gradient-to-tr from-primary/15 via-accent/10 to-transparent rounded-3xl blur-3xl opacity-0 group-hover:opacity-100 transition-all duration-700" />
              <div className="relative rounded-2xl overflow-hidden border border-border/50 shadow-2xl shadow-black/15 dark:shadow-black/40">
                <img src="/bloblens.png" alt="BlobLens Dashboard" className="w-full" />
                <div className="absolute inset-0 bg-gradient-to-t from-background/30 to-transparent" />
              </div>
            </motion.div>
          </div>
        </div>
      </motion.section>

      {/* ══ Features ══ */}
      <motion.section className="py-28" initial="hidden" whileInView="show" viewport={{ once: true, margin: "-100px" }} variants={stagger}>
        <div className="max-w-6xl mx-auto px-6">
          <motion.div variants={fadeUp} className="text-center mb-16">
            <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-primary mb-3 block">Capabilities</span>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">Two Gaps. One Platform.</h2>
            <p className="text-text-secondary/60 max-w-lg mx-auto">Closing the critical observability gaps in EIP-4844.</p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              {
                icon: Trophy, bg: "from-amber-500/20 to-orange-500/10",
                glow: "from-amber-500/10 via-transparent to-transparent",
                title: "DA Cost Efficiency Scoring",
                desc: <>Every rollup scored on packing density, timing, and DA cost. Our <span className="text-primary font-semibold">Efficiency Score</span> reveals who overpays.</>,
                bullets: ["Cost per byte actually used", "Blobfulness ratio diagnostics", "Timing vs. network average fee"],
                link: "/leaderboard", linkText: "View Leaderboard",
              },
              {
                icon: Activity, bg: "from-primary/20 to-accent/10",
                glow: "from-primary/10 via-transparent to-transparent",
                title: "Fee Market Health Layer",
                desc: <>Four distinct market regimes classified in real-time with <span className="text-primary font-semibold">Congestion Forecasts</span> for operators.</>,
                bullets: ["4–12 slot congestion prediction", "Live market regime classification", "Excess blob gas tracking"],
                link: "/market", linkText: "Monitor Fee Market",
              },
            ].map((f, i) => (
              <motion.div key={i} variants={fadeUp}
                className="relative rounded-2xl border border-border/50 bg-surface/50 backdrop-blur p-8 md:p-10 overflow-hidden group hover:border-primary/25 transition-all duration-500">
                {/* Gradient glow on hover */}
                <div className={`absolute inset-0 bg-gradient-to-br ${f.glow} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
                {/* Top accent line */}
                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent scale-x-0 group-hover:scale-x-100 transition-transform duration-500" />

                <div className="relative">
                  <div className={`inline-flex items-center justify-center h-12 w-12 rounded-2xl bg-gradient-to-br ${f.bg} mb-6 group-hover:scale-110 transition-transform`}>
                    <f.icon className="h-5 w-5 text-text-primary" />
                  </div>
                  <h3 className="text-xl font-bold mb-3 tracking-tight">{f.title}</h3>
                  <p className="text-sm text-text-secondary/80 leading-relaxed mb-6">{f.desc}</p>
                  <ul className="space-y-2.5 mb-6">
                    {f.bullets.map((t) => (
                      <li key={t} className="flex items-center gap-2 text-xs text-text-secondary/70">
                        <ShieldCheck className="h-3 w-3 text-primary shrink-0" /> {t}
                      </li>
                    ))}
                  </ul>
                  <Link href={f.link} className="inline-flex items-center gap-1.5 text-sm font-bold text-primary hover:gap-3 transition-all">
                    {f.linkText} <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.section>

      {/* ══ Ecosystem Map ══ */}
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

      {/* ══ CTA ══ */}
      <motion.section className="py-28 relative overflow-hidden"
        initial="hidden" whileInView="show" viewport={{ once: true }} variants={stagger}>
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: "radial-gradient(ellipse at 50% 50%, var(--primary) 0%, transparent 65%)", opacity: 0.04 }} />
        <div className="max-w-3xl mx-auto px-6 text-center relative z-10">
          <motion.h2 variants={fadeUp} className="text-3xl md:text-5xl font-bold tracking-tight mb-4">
            Ready to see through<br />the <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">blobs</span>?
          </motion.h2>
          <motion.p variants={fadeUp} className="text-text-secondary/50 mb-10">Join researchers and rollup teams using BlobLens.</motion.p>
          <motion.div variants={fadeUp} className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/dashboard"
              className="w-full sm:w-auto px-10 py-4 bg-gradient-to-r from-primary to-accent text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all hover:shadow-2xl hover:shadow-primary/30 hover:-translate-y-0.5">
              Enter Dashboard <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/leaderboard"
              className="w-full sm:w-auto px-10 py-4 bg-surface/60 backdrop-blur border border-border/50 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-surface-elevated transition-all">
              <BarChart3 className="h-4 w-4" /> Rollup Rankings
            </Link>
          </motion.div>
        </div>
      </motion.section>

      {/* ══ Footer ══ */}
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
                Open-source protocol intelligence for Ethereum&apos;s data availability layer. Built by Avarch LLC.
              </p>
            </div>
            <div>
              <h5 className="text-[9px] font-bold uppercase tracking-[0.2em] text-text-primary/80 mb-5">Product</h5>
              <ul className="space-y-3">
                {[{ href: "/dashboard", l: "Overview" }, { href: "/leaderboard", l: "Leaderboard" }, { href: "/market", l: "Market Health" }, { href: "/research", l: "Deep Research" }].map((x) => (
                  <li key={x.href}><Link href={x.href} className="text-sm text-text-secondary/50 hover:text-primary transition-colors">{x.l}</Link></li>
                ))}
              </ul>
            </div>
            <div>
              <h5 className="text-[9px] font-bold uppercase tracking-[0.2em] text-text-primary/80 mb-5">Resources</h5>
              <ul className="space-y-3">
                {[{ href: "https://github.com/AvarchLLC/blob_lens", l: "GitHub" }, { href: "https://eipsinsight.com", l: "EIPsInsight" }, { href: "https://giveth.io", l: "Support Us" }].map((x) => (
                  <li key={x.href}><a href={x.href} target="_blank" rel="noopener noreferrer" className="text-sm text-text-secondary/50 hover:text-primary transition-colors">{x.l}</a></li>
                ))}
              </ul>
            </div>
          </div>
          <div className="flex flex-col md:flex-row items-center justify-between pt-8 border-t border-border/15">
            <p className="text-[11px] text-text-secondary/30">© 2026 Avarch LLC · MIT License</p>
            <a href="https://github.com/AvarchLLC/blob_lens" target="_blank" rel="noopener noreferrer"
              className="text-text-secondary/30 hover:text-primary transition-colors mt-3 md:mt-0">
              <Github className="h-4 w-4" />
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
