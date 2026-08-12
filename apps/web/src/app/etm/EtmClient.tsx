"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useTheme } from "next-themes";
import { PageHeader } from "@/components/shared/PageHeader";
import { TC, DARK, LIGHT } from "@/lib/brutalist-theme";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";

/* ─── types ────────────────────────────────────────────────────────────── */
// All-time baseline comes from the vetted /api/mev?type=stats (same numbers as
// the MEV tracker page). Values arrive as strings/numbers from ClickHouse.
interface MevStats {
  total_sandwiches: string;
  unique_victims: string;
  total_victim_volume_usd: number | string;
  total_gross_profit_usd: number | string;
}
interface TrendRow { date: string; attacks: number; extracted_usd: number; victim_volume_usd: number }
interface Sealed {
  blocks_sampled: number; sample_start: string | null; sample_end: string | null;
  avg_gas_used: number; avg_gas_limit: number; avg_util_pct: number;
  sealed_cap_fraction: number; sealed_cap_gas: number; free_gas: number;
  sealed_fits_in_headroom: boolean;
}

/* ─── helpers ──────────────────────────────────────────────────────────── */
const API = "/api/etm";
async function get<T>(type: string, extra = ""): Promise<T> {
  const r = await fetch(`${API}?type=${type}${extra}`, { cache: "no-store" });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}
const fmt = (n: number | undefined) => Number(n ?? 0).toLocaleString();
function fmtUsd(n: number | undefined) {
  const v = Number(n ?? 0);
  if (!v) return "—";
  if (v >= 1e12) return `$${(v / 1e12).toFixed(2)}T`;
  if (v >= 1e9) return `$${(v / 1e9).toFixed(2)}B`;
  if (v >= 1e6) return `$${(v / 1e6).toFixed(2)}M`;
  if (v >= 1e3) return `$${(v / 1e3).toFixed(1)}K`;
  return `$${v.toFixed(0)}`;
}
function fmtK(n: number | undefined) {
  const v = Number(n ?? 0);
  if (v >= 1e6) return (v / 1e6).toFixed(1) + "M";
  if (v >= 1e3) return (v / 1e3).toFixed(1) + "K";
  return String(v);
}
const fmtGas = (n: number) => `${(n / 1e6).toFixed(1)}M`;

/* ─── chart metric config ──────────────────────────────────────────────── */
type MetricId = "extracted" | "attacks" | "volume";
type NumField = "extracted_usd" | "attacks" | "victim_volume_usd";
const METRICS: Record<MetricId, { label: string; color: string; field: NumField; fmt: (n: number) => string }> = {
  extracted: { label: "Value Extracted", color: "#f43f5e", field: "extracted_usd", fmt: fmtUsd },
  attacks: { label: "Attacks", color: "#e91e8c", field: "attacks", fmt: (n) => fmtK(n) },
  volume: { label: "Order Flow at Risk", color: "#f59e0b", field: "victim_volume_usd", fmt: fmtUsd },
};

/* ─── sub-components ────────────────────────────────────────────────────── */
function Card({ tc, title, sub, badge, children, className = "" }: {
  tc: TC; title: string; sub?: string; badge?: string; children: React.ReactNode; className?: string;
}) {
  return (
    <div className={`rounded-none border ${tc.card} ${tc.cardBorder} p-5 ${className}`}>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className={`text-[13px] font-bold uppercase tracking-wider font-mono ${tc.text}`}>{title}</div>
        {badge && <span className={`rounded-none border ${tc.cardBorder} px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${tc.faint}`}>{badge}</span>}
      </div>
      {sub && <p className={`-mt-2 mb-4 text-xs font-mono opacity-60 ${tc.faint}`}>{sub}</p>}
      {children}
    </div>
  );
}

function Kpi({ tc, label, value, sub, accent, borderAccent }: {
  tc: TC; label: string; value: string; sub?: string; accent?: string; borderAccent?: string;
}) {
  return (
    <div className={`rounded-none border ${tc.kpiBg} ${tc.kpiBorder} ${borderAccent ?? "border-t-2 border-t-white/10"} px-5 py-4`}>
      <p className={`text-[10px] font-bold uppercase tracking-widest font-mono ${tc.muted}`}>{label}</p>
      <p className={`mt-2 font-mono text-2xl font-bold ${accent ?? tc.text}`}>{value}</p>
      {sub && <p className={`mt-1 text-[11px] font-mono ${tc.faint}`}>{sub}</p>}
    </div>
  );
}

/* Awaiting-devnet metric definition tile */
function TelemetryTile({ tc, name, formula, purpose, unit }: {
  tc: TC; name: string; formula: string; purpose: string; unit: string;
}) {
  return (
    <div className={`relative rounded-none border border-dashed ${tc.cardBorder} ${tc.kpiBg} p-4`}>
      <div className="flex items-start justify-between gap-2">
        <p className={`text-[11px] font-bold uppercase tracking-wide font-mono ${tc.text}`}>{name}</p>
        <span className={`shrink-0 rounded-none border ${tc.cardBorder} px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider ${tc.faint}`}>{unit}</span>
      </div>
      <p className={`mt-3 font-mono text-xl font-bold ${tc.veryFaint}`}>—</p>
      <p className={`mt-0.5 text-[9px] font-bold uppercase tracking-widest ${tc.faint}`}>awaiting devnet</p>
      <p className={`mt-3 text-[11px] leading-relaxed ${tc.muted}`}>{purpose}</p>
      <p className={`mt-2 font-mono text-[10px] leading-relaxed ${tc.faint}`}>{formula}</p>
    </div>
  );
}

const DOMAINS: { domain: string; metrics: { name: string; formula: string; purpose: string; unit: string }[] }[] = [
  {
    domain: "Key Publication & Slashing",
    metrics: [
      { name: "Key Reveal Success Rate", unit: "%", formula: "keys_revealed(N+1) / tickets_included(N)", purpose: "Primary health metric — share of sealed tickets successfully decrypted at N+1." },
      { name: "Key Withholding Rate", unit: "%", formula: "100 − reveal_success_rate", purpose: "Detects builder/user equivocation or key-propagation failures." },
      { name: "Slashed Top-of-Block Fees", unit: "ETH", formula: "Σ top_of_block_fee × 1/64", purpose: "Financial penalties levied for unrevealed keys." },
    ],
  },
  {
    domain: "PTC Consensus Health",
    metrics: [
      { name: "LucidKey Vote Participation", unit: "%", formula: "ptc_votes_cast / committee_size", purpose: "Validator committee engagement in key-availability voting." },
      { name: "PTC Consensus Agreement", unit: "%", formula: "majority_votes / total_votes", purpose: "Clarity of key-availability signals among the committee." },
      { name: "Builder PTC Adherence", unit: "%", formula: "blocks_following_ptc / total_blocks", purpose: "Detects builders including txs the PTC flagged missing." },
    ],
  },
  {
    domain: "MEV Protection & Reverts",
    metrics: [
      { name: "Post-Decryption Revert Rate", unit: "%", formula: "reverted_decrypted / total_decrypted", purpose: "State contention when sealed txs execute at block N+1." },
      { name: "Reclaimed Block Gas", unit: "gas", formula: "Σ gas_limit − gas_used_on_revert", purpose: "Builder gas saved when failing tickets drop without full execution." },
      { name: "Top-of-Block Fee Premium", unit: "gwei", formula: "avg(sealed_fee) − avg(priority_fee)", purpose: "Premium users pay for front-running protection." },
    ],
  },
  {
    domain: "Whitelist & Cartelization",
    metrics: [
      { name: "Publisher Concentration (HHI)", unit: "index", formula: "Σ (stake_share_publisher_i)²", purpose: "Validator vote concentration on key publishers — cartelization risk." },
      { name: "Newcomer Approval Time", unit: "days", formula: "t(registration → 51% votes)", purpose: "Chicken-and-egg friction for new key publishers." },
      { name: "Ciphertext Overhead Ratio", unit: "%", formula: "(ciphertext − plaintext) / plaintext", purpose: "Bandwidth bloat from AEAD / threshold-scheme encapsulation." },
    ],
  },
];

/* ─── main ─────────────────────────────────────────────────────────────── */
export default function EtmClient() {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const tc = mounted && resolvedTheme === "light" ? LIGHT : DARK;

  const [stats, setStats] = useState<MevStats | null>(null);
  const [trend, setTrend] = useState<TrendRow[]>([]);
  const [sealed, setSealed] = useState<Sealed | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [metric, setMetric] = useState<MetricId>("extracted");
  const [gran, setGran] = useState<"daily" | "weekly">("daily");

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    (async () => {
      try {
        const [mevStats, t, s] = await Promise.all([
          fetch("/api/mev?type=stats", { cache: "no-store" }).then((r) => r.json()),
          get<{ rows: TrendRow[] }>("trend", "&days=90"),
          get<Sealed>("sealed"),
        ]);
        setStats(mevStats);
        setTrend(t.rows ?? []);
        setSealed(s);
      } catch (e) {
        setErr((e as Error).message);
      }
    })();
  }, []);

  // All-time baseline (vetted, matches MEV tracker).
  const at = useMemo(() => ({
    total_attacks: Number(stats?.total_sandwiches ?? 0),
    unique_victims: Number(stats?.unique_victims ?? 0),
    victim_volume_usd: Number(stats?.total_victim_volume_usd ?? 0),
    extracted_usd: Number(stats?.total_gross_profit_usd ?? 0),
  }), [stats]);

  // Last-30d rollup derived from the daily trend (recent data is clean).
  const d30 = useMemo(() => {
    const last30 = trend.slice(-30);
    return {
      attacks: last30.reduce((s, r) => s + Number(r.attacks), 0),
      extracted_usd: last30.reduce((s, r) => s + Number(r.extracted_usd), 0),
    };
  }, [trend]);

  // Chart series for the selected metric + granularity. Weekly buckets sum
  // consecutive 7-day groups (trend is 90 sorted daily rows), labelled by the
  // last day in each bucket.
  const chartData = useMemo(() => {
    const field = METRICS[metric].field;
    const rows = trend.map((r) => ({
      date: r.date,
      extracted_usd: Number(r.extracted_usd),
      attacks: Number(r.attacks),
      victim_volume_usd: Number(r.victim_volume_usd),
    }));
    if (gran === "daily") {
      return rows.map((r) => ({ label: r.date.slice(5), value: r[field] }));
    }
    const weeks: { label: string; value: number }[] = [];
    for (let i = 0; i < rows.length; i += 7) {
      const grp = rows.slice(i, i + 7);
      if (!grp.length) continue;
      weeks.push({
        label: grp[grp.length - 1].date.slice(5),
        value: grp.reduce((s, r) => s + r[field], 0),
      });
    }
    return weeks;
  }, [trend, metric, gran]);

  const activeMetric = METRICS[metric];

  // Sealed-capacity model figures.
  const utilPct = sealed?.avg_util_pct ?? 0;
  const sealedCapPctOfLimit = sealed ? (sealed.sealed_cap_fraction * 100) : 12.5;
  const freePctOfLimit = sealed && sealed.avg_gas_limit ? (sealed.free_gas / sealed.avg_gas_limit) * 100 : 0;

  return (
    <div className="animate-page-in space-y-6">
      <PageHeader
        meta="Encrypted Mempool Telemetry"
        title="🔒 Encrypted Mempool Console"
        summary="EIP-8184 (Lucid) observability — the MEV surface encrypted mempools erase, the block space they reserve, and the protocol telemetry to verify them once live."
      >
        <div className="flex flex-wrap gap-2 font-mono">
          {["EIP-8184 · Lucid", "Research → Devnet", "Baseline: live"].map((t) => (
            <span key={t} className={`rounded-none border ${tc.cardBorder} px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider ${tc.faint}`}>{t}</span>
          ))}
        </div>
      </PageHeader>

      {err && (
        <div className={`rounded-none border border-dashed ${tc.bannerBorder} ${tc.bannerBg} px-5 py-3 font-mono text-sm ${tc.bannerText}`}>
          Failed to load telemetry — {err}
        </div>
      )}

      {/* ── status banner ───────────────────────────────────────────────── */}
      <div className={`rounded-none border border-dashed ${tc.bannerBorder} ${tc.bannerBg} px-5 py-3.5 font-mono`}>
        <p className={`text-sm font-bold uppercase tracking-wide ${tc.bannerText}`}>EIP-8184 is not yet live on mainnet</p>
        <p className={`mt-1 text-xs leading-relaxed ${tc.bannerSub}`}>
          Protocol telemetry — key-reveal rate, PTC consensus, slashing, revert dynamics — activates the moment an encrypted-mempool devnet (Kurtosis / Fusaka + EIP-8184 branch) is indexed. Until then, the console measures the <span className="font-bold">baseline an encrypted mempool eliminates</span> from live chain data, and models the block space EIP-8184 reserves.
        </p>
      </div>

      {/* ── Section 1: the problem, measured live ───────────────────────── */}
      <div>
        <div className="mb-3 flex flex-wrap items-baseline gap-2">
          <h2 className={`text-sm font-bold uppercase tracking-wider font-mono ${tc.text}`}>1 · The Problem, Measured Live</h2>
          <span className={`text-[11px] font-mono ${tc.faint}`}>sandwich MEV since Dencun</span>
        </div>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Kpi tc={tc} label="Sandwich Attacks" value={fmtK(at.total_attacks)} sub={`${fmtK(d30.attacks)} in last 30d`} accent="text-pink-500" borderAccent="border-t-2 border-t-pink-500" />
          <Kpi tc={tc} label="Users Sandwiched" value={fmtK(at.unique_victims)} sub="distinct victim addresses" accent="text-purple-500" borderAccent="border-t-2 border-t-purple-500" />
          <Kpi tc={tc} label="Order Flow at Risk" value={fmtUsd(at.victim_volume_usd)} sub="victim swap volume exposed" accent="text-amber-500" borderAccent="border-t-2 border-t-amber-500" />
          <Kpi tc={tc} label="Value Extracted" value={fmtUsd(at.extracted_usd)} sub={`${fmtUsd(d30.extracted_usd)} in last 30d`} accent="text-rose-500" borderAccent="border-t-2 border-t-rose-500" />
        </div>
        <p className={`mt-2 text-[11px] leading-relaxed ${tc.muted}`}>
          Sandwich attacks exist <span className="font-bold">only because pending transactions are public before inclusion.</span> Sealing them until inclusion (EIP-8184) removes this front-running surface — the figures above are its live, on-chain cost.
        </p>
      </div>

      {/* ── trend chart ─────────────────────────────────────────────────── */}
      <div className={`rounded-none border ${tc.card} ${tc.cardBorder} p-5`}>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className={`text-[13px] font-bold uppercase tracking-wider font-mono ${tc.text}`}>
              The Surface, Over Time
              <span className={`ml-2 rounded-none border ${tc.cardBorder} px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${tc.faint}`}>live · 90d</span>
            </div>
            <p className={`mt-0.5 text-xs font-mono opacity-60 ${tc.faint}`}>Sandwich MEV encrypted mempools erase — {gran} over the last 90 days</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {/* metric pills */}
            <div className={`flex rounded-none border ${tc.cardBorder} overflow-hidden`}>
              {(Object.keys(METRICS) as MetricId[]).map((m) => (
                <button
                  key={m}
                  onClick={() => setMetric(m)}
                  className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider font-mono transition-colors ${metric === m ? tc.tabActive : tc.tabInactive}`}
                >
                  {METRICS[m].label}
                </button>
              ))}
            </div>
            {/* granularity toggle */}
            <div className={`flex rounded-none border ${tc.cardBorder} overflow-hidden`}>
              {(["daily", "weekly"] as const).map((g) => (
                <button
                  key={g}
                  onClick={() => setGran(g)}
                  className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider font-mono transition-colors ${gran === g ? tc.tabActive : tc.tabInactive}`}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="etmMetric" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={activeMetric.color} stopOpacity={0.5} />
                  <stop offset="100%" stopColor={activeMetric.color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke={tc.grid} vertical={false} />
              <XAxis dataKey="label" tick={{ fill: tc.axis, fontSize: 10, fontFamily: "monospace" }} interval="preserveStartEnd" minTickGap={28} />
              <YAxis tickFormatter={(v) => activeMetric.fmt(v)} tick={{ fill: tc.axis, fontSize: 10, fontFamily: "monospace" }} width={54} />
              <Tooltip
                contentStyle={{ background: tc.ttBg, border: `1px solid ${tc.ttBorder}`, borderRadius: 0, color: tc.ttColor, fontFamily: "monospace", fontSize: 12 }}
                formatter={(val: number) => [activeMetric.fmt(val), activeMetric.label]}
              />
              <Area type="monotone" dataKey="value" stroke={activeMetric.color} strokeWidth={1.5} fill="url(#etmMetric)" isAnimationActive={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Section 2: sealed-capacity model ────────────────────────────── */}
      <div>
        <div className="mb-3 flex flex-wrap items-baseline gap-2">
          <h2 className={`text-sm font-bold uppercase tracking-wider font-mono ${tc.text}`}>2 · EIP-8184 Sealed-Capacity Model</h2>
          <span className={`text-[11px] font-mono ${tc.faint}`}>
            {sealed ? `from ${fmt(sealed.blocks_sampled)} blocks · last 7d` : "modeled from live execution-layer gas"}
          </span>
        </div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Card tc={tc} title="Block Gas Envelope" badge="live gas">
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between text-[11px] font-mono">
                  <span className={tc.muted}>Avg block utilization</span>
                  <span className={`font-bold ${tc.text}`}>{utilPct.toFixed(1)}%</span>
                </div>
                <div className={`mt-1.5 h-2 w-full ${tc.bannerBarBg} overflow-hidden`}>
                  <div className="h-full bg-purple-500" style={{ width: `${Math.min(100, utilPct)}%` }} />
                </div>
                <p className={`mt-1 text-[10px] font-mono ${tc.faint}`}>
                  {sealed ? `${fmtGas(sealed.avg_gas_used)} used / ${fmtGas(sealed.avg_gas_limit)} limit` : "—"}
                </p>
              </div>
              <div>
                <div className="flex items-center justify-between text-[11px] font-mono">
                  <span className={tc.muted}>Sealed lane cap (1/8 limit)</span>
                  <span className={`font-bold text-cyan-400`}>{sealedCapPctOfLimit.toFixed(1)}%</span>
                </div>
                <div className={`mt-1.5 h-2 w-full ${tc.bannerBarBg} overflow-hidden`}>
                  <div className="h-full bg-cyan-400" style={{ width: `${Math.min(100, sealedCapPctOfLimit)}%` }} />
                </div>
                <p className={`mt-1 text-[10px] font-mono ${tc.faint}`}>
                  {sealed ? `${fmtGas(sealed.sealed_cap_gas)} reserved for encrypted txs` : "—"}
                </p>
              </div>
            </div>
          </Card>

          <Card tc={tc} title="Sealed Headroom" badge="model">
            <p className={`font-mono text-4xl font-bold ${sealed?.sealed_fits_in_headroom ? "text-emerald-500" : "text-amber-500"}`}>
              {freePctOfLimit.toFixed(1)}%
            </p>
            <p className={`mt-1 text-[11px] font-mono ${tc.muted}`}>of block gas currently unused</p>
            <p className={`mt-4 text-[12px] leading-relaxed ${tc.muted}`}>
              {sealed?.sealed_fits_in_headroom
                ? "Today's blocks have enough free gas to absorb the entire 1/8 sealed lane without displacing plaintext demand."
                : "The 1/8 sealed lane exceeds current free gas — encrypted demand would compete with plaintext at peak load."}
            </p>
          </Card>

          <Card tc={tc} title="How the Cap Works" badge="EIP-8184">
            <ul className={`space-y-2.5 text-[12px] leading-relaxed ${tc.muted}`}>
              <li><span className={`font-bold ${tc.text}`}>1/8 baseline.</span> Sealed transactions are capped at one-eighth of the block gas limit.</li>
              <li><span className={`font-bold ${tc.text}`}>Up to 1/2 catch-up.</span> The cap expands during congestion so sealed backlog can clear.</li>
              <li><span className={`font-bold ${tc.text}`}>Two-slot.</span> Block N reserves the space + ciphertext; block N+1 reveals keys and executes.</li>
            </ul>
          </Card>
        </div>
      </div>

      {/* ── Section 3: two-slot pipeline ────────────────────────────────── */}
      <Card tc={tc} title="The Two-Slot Pipeline" sub="How a Lucid ticket moves from sealed reservation to decrypted execution" badge="EIP-8184 · Lucid">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div className={`rounded-none border ${tc.cardBorder} ${tc.kpiBg} p-4`}>
            <div className="flex items-center gap-2">
              <span className={`rounded-none bg-pink-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-pink-500`}>Block N</span>
              <span className={`text-[11px] font-bold uppercase tracking-wide font-mono ${tc.text}`}>Reserve &amp; Seal</span>
            </div>
            <ul className={`mt-3 space-y-1.5 text-[12px] leading-relaxed ${tc.muted}`}>
              <li>• Ticket reserves block space in the sealed lane</li>
              <li>• AEAD ciphertext (RFC 9180) committed — contents hidden</li>
              <li>• Top-of-block fee paid; 1/64 held against key withholding</li>
            </ul>
          </div>
          <div className={`rounded-none border ${tc.cardBorder} ${tc.kpiBg} p-4`}>
            <div className="flex items-center gap-2">
              <span className={`rounded-none bg-cyan-400/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-cyan-400`}>Block N+1</span>
              <span className={`text-[11px] font-bold uppercase tracking-wide font-mono ${tc.text}`}>Reveal &amp; Execute</span>
            </div>
            <ul className={`mt-3 space-y-1.5 text-[12px] leading-relaxed ${tc.muted}`}>
              <li>• Key revealed; PTC votes on key availability (LucidKey)</li>
              <li>• Transactions decrypted &amp; executed in order</li>
              <li>• Unrevealed keys slashed 1/64 of top-of-block fee</li>
            </ul>
          </div>
        </div>
      </Card>

      {/* ── Section 4: telemetry console (awaiting devnet) ──────────────── */}
      <div>
        <div className="mb-1 flex flex-wrap items-baseline gap-2">
          <h2 className={`text-sm font-bold uppercase tracking-wider font-mono ${tc.text}`}>3 · Protocol Telemetry</h2>
          <span className={`rounded-none border ${tc.bannerBorder} ${tc.bannerBg} px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${tc.bannerText}`}>Awaiting devnet</span>
        </div>
        <p className={`mb-4 max-w-3xl text-[11px] leading-relaxed ${tc.muted}`}>
          The verification layer. Each metric is defined and query-ready against the planned <span className="font-mono">etm_tickets</span> / <span className="font-mono">etm_block_stats</span> tables; values populate once an EIP-8184 devnet is indexed. This is what lets the community <span className="font-bold">verify encryption works</span> rather than trust the claim.
        </p>
        <div className="space-y-5">
          {DOMAINS.map((d) => (
            <div key={d.domain}>
              <p className={`mb-2 text-[11px] font-bold uppercase tracking-widest font-mono ${tc.faint}`}>{d.domain}</p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {d.metrics.map((m) => (
                  <TelemetryTile key={m.name} tc={tc} name={m.name} formula={m.formula} purpose={m.purpose} unit={m.unit} />
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* ingestion schema — ready for devnet */}
        <details className={`group mt-5 rounded-none border ${tc.cardBorder} ${tc.card}`}>
          <summary className={`flex cursor-pointer list-none items-center justify-between gap-2 px-5 py-3.5 ${tc.text}`}>
            <span className="flex flex-wrap items-center gap-2">
              <span className="text-[13px] font-bold uppercase tracking-wider font-mono">Ingestion Schema</span>
              <span className={`rounded-none border ${tc.cardBorder} px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${tc.faint}`}>ready for devnet</span>
            </span>
            <span className={`text-[10px] font-mono ${tc.faint} group-open:hidden`}>show DDL ▾</span>
            <span className={`hidden text-[10px] font-mono ${tc.faint} group-open:inline`}>hide ▴</span>
          </summary>
          <div className="border-t px-5 py-4" style={{ borderColor: tc.ttBorder }}>
            <p className={`mb-3 text-[11px] leading-relaxed ${tc.muted}`}>
              The ClickHouse tables the indexer writes once a Lucid devnet is reachable. Populating them lights up every metric above — no schema or query work is left, only data.
            </p>
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
              {[
                {
                  name: "blob_lens.etm_tickets",
                  ddl: `CREATE TABLE blob_lens.etm_tickets (
  block_number         UInt64,
  block_timestamp      DateTime,
  ticket_hash          FixedString(32),
  sender               LowCardinality(String),
  top_of_block_fee_wei UInt128,
  gas_limit            UInt64,
  ciphertext_bytes     UInt32,
  is_revealed          UInt8,
  reveal_block_number  Nullable(UInt64),
  key_hash             Nullable(FixedString(32)),
  is_canonical         UInt8,
  version              UInt64
) ENGINE = ReplacingMergeTree(version)
ORDER BY (block_number, ticket_hash);`,
                },
                {
                  name: "blob_lens.etm_block_stats",
                  ddl: `CREATE TABLE blob_lens.etm_block_stats (
  block_number             UInt64,
  block_timestamp          DateTime,
  total_tickets            UInt16,
  revealed_tickets         UInt16,
  withheld_tickets         UInt16,
  sealed_gas_used          UInt64,
  sealed_gas_limit         UInt64,
  slashed_fees_wei         UInt128,
  ptc_vote_participation_pct Float32,
  decrypted_revert_count   UInt16,
  is_canonical             UInt8,
  version                  UInt64
) ENGINE = ReplacingMergeTree(version)
ORDER BY (block_number);`,
                },
              ].map((t) => (
                <div key={t.name} className={`rounded-none border ${tc.cardBorder} ${tc.kpiBg}`}>
                  <p className={`border-b px-3 py-2 text-[11px] font-bold font-mono ${tc.text}`} style={{ borderColor: tc.ttBorder }}>{t.name}</p>
                  <pre className={`overflow-x-auto px-3 py-2.5 text-[10px] leading-relaxed font-mono ${tc.muted}`}>{t.ddl}</pre>
                </div>
              ))}
            </div>
          </div>
        </details>
      </div>

      <p className={`pt-2 text-center text-[10px] font-mono ${tc.faint}`}>
        Baseline & gas model: live from BlobLens (ethereum.blocks, mev_sandwiches) · Protocol telemetry: EIP-8184 spec (ETM WG #000–#007), pending devnet data
      </p>
    </div>
  );
}
