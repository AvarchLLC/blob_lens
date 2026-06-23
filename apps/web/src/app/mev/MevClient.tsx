"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

/* ─── well-known token symbols ──────────────────────────── */
const TOKEN_SYMBOLS: Record<string, string> = {
  "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2": "WETH",
  "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48": "USDC",
  "0xdac17f958d2ee523a2206206994597c13d831ec7": "USDT",
  "0x6b175474e89094c44da98b954eedeac495271d0f": "DAI",
  "0x2260fac5e5542a773aa44fbcfedf7c193bc2c599": "WBTC",
  "0x6982508145454ce325ddbe47a25d4ec3d2311933": "PEPE",
  "0x95ad61b0a150d79219dcf64e1e6cc01f0b64c4ce": "SHIB",
  "0x514910771af9ca656af840dff83e8264ecf986ca": "LINK",
  "0x1f9840a85d5af5bf1d1762f925bdaddc4201f984": "UNI",
  "0x7fc66500c84a76ad7e9c93437bfc5ac33e2ddae9": "AAVE",
  "0xae78736cd615f374d3085123a210448e74fc6393": "rETH",
  "0xbe9895146f7af43049ca1c1ae358b0541ea49704": "cbETH",
  "0xd533a949740bb3306d119cc777fa900ba034cd52": "CRV",
  "0x9f8f72aa9304c8b593d555f12ef6589cc3a579a2": "MKR",
  "0x111111111117dc0aa78b770fa6a738034120c302": "1INCH",
};

function tokenSymbol(addr: string): string {
  if (!addr) return "?";
  return TOKEN_SYMBOLS[addr.toLowerCase()] ?? addr.slice(2, 6).toUpperCase();
}

/* ─── types ──────────────────────────────────────────────── */
interface MevStats {
  total_sandwiches: string;
  unique_victims: string;
  unique_bots: string;
  unique_pools: string;
  first_block: string;
  last_block: string;
  sandwich_blocks: string;
  total_blocks: string;
}
interface WeekRow {
  week: string;
  sandwiches: string;
  active_bots: string;
  blocks_sandwiched: string;
  v3_count: string;
  v2_count: string;
}
interface BotRow {
  sandwicher: string;
  sandwiches: string;
  unique_victims: string;
  unique_pools: string;
  first_seen_block: string;
  last_seen_block: string;
}
interface PoolRow {
  pool: string;
  token0: string;
  token1: string;
  protocol: string;
  sandwiches: string;
  unique_victims: string;
  unique_bots: string;
}
interface PairRow {
  token0: string;
  token1: string;
  protocol: string;
  sandwiches: string;
  unique_victims: string;
  unique_pools: string;
  unique_bots: string;
}
interface RecentRow {
  block_number: string;
  block_timestamp: string;
  sandwicher: string;
  pool: string;
  protocol: string;
  frontrun_tx: string;
  frontrun_idx: string;
  victim_tx: string;
  victim_idx: string;
  backrun_tx: string;
  backrun_idx: string;
  token0: string;
  token1: string;
}
interface Progress {
  last_block: string;
  total_sandwiches: string;
  dencun_start: number;
}

/* ─── helpers ────────────────────────────────────────────── */
const API = "/api/mev";
async function get<T>(type: string, extra = ""): Promise<T> {
  const r = await fetch(`${API}?type=${type}${extra}`, { cache: "no-store" });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}
function fmt(n: string | number) {
  return Number(n).toLocaleString();
}
function fmtK(n: string | number) {
  const v = Number(n);
  if (v >= 1_000_000) return (v / 1_000_000).toFixed(1) + "M";
  if (v >= 1_000) return (v / 1_000).toFixed(1) + "K";
  return String(v);
}
function short(addr: string) {
  return addr ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : "—";
}
function ethTx(tx: string) { return `https://etherscan.io/tx/${tx}`; }
function ethAddr(addr: string) { return `https://etherscan.io/address/${addr}`; }

/* ─── common chart config ────────────────────────────────── */
const TOOLTIP_STYLE = {
  contentStyle: {
    background: "#11111a",
    border: "1px solid #ffffff18",
    borderRadius: 8,
    color: "#fff",
    fontSize: 12,
  },
};
const AXIS_TICK = { fill: "#ffffff55", fontSize: 11 };

/* ─── stat card ──────────────────────────────────────────── */
function Kpi({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: string;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 px-5 py-4">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-white/40">
        {label}
      </p>
      <p
        className={`mt-1 text-2xl font-bold tabular-nums ${
          accent ?? "text-white"
        }`}
      >
        {value}
      </p>
      {sub && <p className="mt-0.5 text-xs text-white/35">{sub}</p>}
    </div>
  );
}

/* ─── card wrapper ───────────────────────────────────────── */
function Card({
  title,
  children,
  className = "",
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-xl border border-white/10 bg-white/5 p-5 ${className}`}
    >
      <h3 className="mb-4 text-xs font-semibold uppercase tracking-wider text-white/50">
        {title}
      </h3>
      {children}
    </div>
  );
}

/* ─── protocol badge ─────────────────────────────────────── */
function Proto({ p }: { p: string }) {
  const cls =
    p === "uniswap_v3"
      ? "text-pink-400 bg-pink-500/15"
      : "text-violet-400 bg-violet-500/15";
  return (
    <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${cls}`}>
      {p === "uniswap_v3" ? "Uni-v3" : "Uni-v2"}
    </span>
  );
}

/* ─── main ───────────────────────────────────────────────── */
export default function MevClient() {
  const [stats, setStats] = useState<MevStats | null>(null);
  const [weekly, setWeekly] = useState<WeekRow[]>([]);
  const [bots, setBots] = useState<BotRow[]>([]);
  const [pools, setPools] = useState<PoolRow[]>([]);
  const [pairs, setPairs] = useState<PairRow[]>([]);
  const [recent, setRecent] = useState<RecentRow[]>([]);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<"overview" | "tokens" | "bots" | "pools" | "recent">(
    "overview"
  );

  const load = useCallback(async () => {
    try {
      const [s, w, b, po, pa, r, pr] = await Promise.all([
        get<MevStats>("stats"),
        get<WeekRow[]>("weekly-trend", "&weeks=16"),
        get<BotRow[]>("top-bots", "&limit=20"),
        get<PoolRow[]>("top-pools", "&limit=20"),
        get<PairRow[]>("top-token-pairs", "&limit=20"),
        get<RecentRow[]>("recent", "&limit=50"),
        get<Progress>("backfill-progress"),
      ]);
      setStats(s);
      setWeekly(w);
      setBots(b);
      setPools(po);
      setPairs(pa);
      setRecent(r);
      setProgress(pr);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const iv = setInterval(load, 60_000);
    return () => clearInterval(iv);
  }, [load]);

  if (loading)
    return (
      <div className="flex h-64 items-center justify-center text-white/40 text-sm">
        Loading MEV data…
      </div>
    );
  if (error)
    return (
      <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-6 text-red-400 text-sm">
        {error}
      </div>
    );

  /* ── derived ───────────────────────────────────────────── */
  const pctBlocks = stats
    ? ((Number(stats.sandwich_blocks) / Number(stats.total_blocks)) * 100).toFixed(1)
    : "—";

  const backfilling =
    progress &&
    stats &&
    Number(progress.last_block) < Number(stats.last_block) - 5000;

  const pct = progress && stats
    ? Math.min(
        100,
        Math.floor(
          ((Number(progress.last_block) - progress.dencun_start) /
            (Number(stats.last_block) - progress.dencun_start)) *
            100
        )
      )
    : 0;

  /* ── chart data ────────────────────────────────────────── */
  const weeklyData = weekly.map((r) => ({
    week: new Date(r.week).toLocaleDateString("en", {
      month: "short",
      day: "numeric",
    }),
    v3: Number(r.v3_count),
    v2: Number(r.v2_count),
    bots: Number(r.active_bots),
    blocks: Number(r.blocks_sandwiched),
  }));

  const v2Total = weekly.reduce((s, r) => s + Number(r.v2_count), 0);
  const v3Total = weekly.reduce((s, r) => s + Number(r.v3_count), 0);
  const total = v2Total + v3Total;
  const protoPie = [
    { name: "Uniswap v3", value: v3Total, fill: "#f472b6" },
    { name: "Uniswap v2", value: v2Total, fill: "#a78bfa" },
  ];

  const TABS = [
    { id: "overview", label: "Overview" },
    { id: "tokens", label: "Token Pairs" },
    { id: "bots", label: "Top Bots" },
    { id: "pools", label: "Top Pools" },
    { id: "recent", label: "Live Feed" },
  ] as const;

  return (
    <div className="space-y-5">
      {/* backfill banner */}
      {backfilling && (
        <div className="rounded-xl border border-amber-500/25 bg-amber-500/8 px-5 py-3">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-amber-300">
              Historical backfill running — {pct}% complete
            </span>
            <span className="text-amber-400/60 text-xs">
              block {fmt(progress!.last_block)} / {fmt(stats?.last_block ?? "")}
            </span>
          </div>
          <div className="mt-2 h-1 rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-amber-400 transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="mt-1.5 text-xs text-amber-400/55">
            {fmt(progress!.total_sandwiches)} sandwiches detected so far
          </p>
        </div>
      )}

      {/* KPI row */}
      {stats && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <Kpi
            label="Total Sandwiches"
            value={fmtK(stats.total_sandwiches)}
            sub="since Dencun"
            accent="text-pink-400"
          />
          <Kpi
            label="Unique Victims"
            value={fmtK(stats.unique_victims)}
            sub="addresses targeted"
          />
          <Kpi
            label="MEV Bots"
            value={fmt(stats.unique_bots)}
            sub="distinct sandwichers"
            accent="text-red-400"
          />
          <Kpi
            label="Pools Targeted"
            value={fmtK(stats.unique_pools)}
          />
          <Kpi
            label="Blocks Sandwiched"
            value={`${pctBlocks}%`}
            sub="of blocks, last 30d"
            accent="text-amber-400"
          />
          <Kpi
            label="Sandwich Rate"
            value={`${(
              (Number(stats.total_sandwiches) /
                Math.max(1, Number(stats.last_block) - Number(stats.first_block))) *
              1000
            ).toFixed(2)}/1K`}
            sub="sandwiches per 1000 blocks"
          />
        </div>
      )}

      {/* tab bar */}
      <div className="flex gap-1 border-b border-white/8">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2.5 text-sm font-medium transition-colors rounded-t-lg ${
              tab === t.id
                ? "text-white bg-white/8 border-b-2 border-pink-400"
                : "text-white/45 hover:text-white/75"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW tab ─────────────────────────────────── */}
      {tab === "overview" && (
        <div className="grid gap-5 lg:grid-cols-3">
          {/* main area chart — full width */}
          <div className="lg:col-span-3">
            <Card title="Weekly Sandwich Count — Uniswap v2 vs v3 (16 weeks)">
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={weeklyData}>
                  <defs>
                    <linearGradient id="gv3" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#f472b6" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="#f472b6" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gv2" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#a78bfa" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="#a78bfa" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff0d" />
                  <XAxis dataKey="week" tick={AXIS_TICK} tickLine={false} />
                  <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} tickFormatter={fmtK} />
                  <Tooltip {...TOOLTIP_STYLE} />
                  <Legend wrapperStyle={{ color: "#ffffff80", fontSize: 12 }} />
                  <Area
                    type="monotone"
                    dataKey="v3"
                    name="Uniswap v3"
                    stackId="1"
                    stroke="#f472b6"
                    fill="url(#gv3)"
                    strokeWidth={2}
                  />
                  <Area
                    type="monotone"
                    dataKey="v2"
                    name="Uniswap v2"
                    stackId="1"
                    stroke="#a78bfa"
                    fill="url(#gv2)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </Card>
          </div>

          {/* bots chart */}
          <div className="lg:col-span-2">
            <Card title="Active Sandwich Bots per Week">
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={weeklyData} barSize={12}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff0d" />
                  <XAxis dataKey="week" tick={AXIS_TICK} tickLine={false} />
                  <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} />
                  <Tooltip {...TOOLTIP_STYLE} />
                  <Bar dataKey="bots" name="Active Bots" fill="#f87171" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </div>

          {/* protocol donut */}
          <Card title="Protocol Split (16 weeks)">
            <div className="flex flex-col items-center gap-4">
              <PieChart width={160} height={160}>
                <Pie
                  data={protoPie}
                  cx={75}
                  cy={75}
                  innerRadius={45}
                  outerRadius={75}
                  dataKey="value"
                  strokeWidth={0}
                >
                  {protoPie.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip
                  {...TOOLTIP_STYLE}
                  formatter={(v: number) => [
                    `${fmtK(v)} (${((v / total) * 100).toFixed(1)}%)`,
                    "",
                  ]}
                />
              </PieChart>
              <div className="space-y-1.5 text-sm w-full">
                {protoPie.map((e) => (
                  <div key={e.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ background: e.fill }}
                      />
                      <span className="text-white/70">{e.name}</span>
                    </div>
                    <span className="tabular-nums text-white/90 font-medium">
                      {((e.value / total) * 100).toFixed(1)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* ── TOKEN PAIRS tab ─────────────────────────────── */}
      {tab === "tokens" && (
        <div className="rounded-xl border border-white/10 bg-white/5 overflow-hidden">
          <div className="px-5 py-3 border-b border-white/8 text-xs text-white/40">
            74.7% of sandwiched pools mapped to token pairs — pools created after Dencun (Mar 2024)
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/8 text-[11px] uppercase tracking-wide text-white/40">
                <th className="px-4 py-3 text-left">#</th>
                <th className="px-4 py-3 text-left">Token Pair</th>
                <th className="px-4 py-3 text-left">Protocol</th>
                <th className="px-4 py-3 text-right">Sandwiches</th>
                <th className="px-4 py-3 text-right">Victims</th>
                <th className="px-4 py-3 text-right">Pools</th>
                <th className="px-4 py-3 text-right">Bots</th>
              </tr>
            </thead>
            <tbody>
              {pairs.map((p, i) => {
                const sym0 = tokenSymbol(p.token0);
                const sym1 = tokenSymbol(p.token1);
                return (
                  <tr
                    key={`${p.token0}-${p.token1}-${i}`}
                    className="border-b border-white/5 hover:bg-white/4 transition-colors"
                  >
                    <td className="px-4 py-2.5 text-white/25 tabular-nums">{i + 1}</td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-white">
                          {sym0}/{sym1}
                        </span>
                        {(sym0.length <= 4 || sym1.length <= 4) && (
                          <span className="text-xs text-white/35 font-mono">
                            {short(p.token0)}/{short(p.token1)}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-2.5">
                      <Proto p={p.protocol} />
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums font-medium text-white">
                      {fmt(p.sandwiches)}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-white/65">
                      {fmt(p.unique_victims)}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-white/65">
                      {fmt(p.unique_pools)}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-white/65">
                      {fmt(p.unique_bots)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── BOTS tab ─────────────────────────────────────── */}
      {tab === "bots" && (
        <div className="rounded-xl border border-white/10 bg-white/5 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/8 text-[11px] uppercase tracking-wide text-white/40">
                <th className="px-4 py-3 text-left">#</th>
                <th className="px-4 py-3 text-left">Address</th>
                <th className="px-4 py-3 text-right">Sandwiches</th>
                <th className="px-4 py-3 text-right">Victims</th>
                <th className="px-4 py-3 text-right">Pools</th>
                <th className="px-4 py-3 text-right">First / Last Block</th>
              </tr>
            </thead>
            <tbody>
              {bots.map((b, i) => (
                <tr
                  key={b.sandwicher}
                  className="border-b border-white/5 hover:bg-white/4 transition-colors"
                >
                  <td className="px-4 py-2.5 text-white/25 tabular-nums">{i + 1}</td>
                  <td className="px-4 py-2.5 font-mono">
                    <a
                      href={ethAddr(b.sandwicher)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-red-400 hover:text-red-300 transition-colors"
                    >
                      {short(b.sandwicher)}
                    </a>
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums font-semibold text-white">
                    {fmt(b.sandwiches)}
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-white/65">
                    {fmt(b.unique_victims)}
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-white/65">
                    {fmt(b.unique_pools)}
                  </td>
                  <td className="px-4 py-2.5 text-right text-xs text-white/35 tabular-nums">
                    {fmt(b.first_seen_block)} → {fmt(b.last_seen_block)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── POOLS tab ────────────────────────────────────── */}
      {tab === "pools" && (
        <div className="rounded-xl border border-white/10 bg-white/5 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/8 text-[11px] uppercase tracking-wide text-white/40">
                <th className="px-4 py-3 text-left">#</th>
                <th className="px-4 py-3 text-left">Pool</th>
                <th className="px-4 py-3 text-left">Pair</th>
                <th className="px-4 py-3 text-left">Protocol</th>
                <th className="px-4 py-3 text-right">Sandwiches</th>
                <th className="px-4 py-3 text-right">Victims</th>
                <th className="px-4 py-3 text-right">Bots</th>
              </tr>
            </thead>
            <tbody>
              {pools.map((p, i) => {
                const sym0 = p.token0 ? tokenSymbol(p.token0) : "?";
                const sym1 = p.token1 ? tokenSymbol(p.token1) : "?";
                const hasPair = p.token0 && p.token1;
                return (
                  <tr
                    key={p.pool}
                    className="border-b border-white/5 hover:bg-white/4 transition-colors"
                  >
                    <td className="px-4 py-2.5 text-white/25 tabular-nums">{i + 1}</td>
                    <td className="px-4 py-2.5 font-mono">
                      <a
                        href={ethAddr(p.pool)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-white/70 hover:text-pink-400 transition-colors"
                      >
                        {short(p.pool)}
                      </a>
                    </td>
                    <td className="px-4 py-2.5 font-semibold text-white/90">
                      {hasPair ? `${sym0}/${sym1}` : <span className="text-white/30">unknown</span>}
                    </td>
                    <td className="px-4 py-2.5">
                      <Proto p={p.protocol} />
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums font-semibold text-white">
                      {fmt(p.sandwiches)}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-white/65">
                      {fmt(p.unique_victims)}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-white/65">
                      {fmt(p.unique_bots)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── LIVE FEED tab ────────────────────────────────── */}
      {tab === "recent" && (
        <div className="rounded-xl border border-white/10 bg-white/5 overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-white/8 text-[10px] uppercase tracking-wide text-white/40">
                <th className="px-3 py-3 text-left">Block</th>
                <th className="px-3 py-3 text-left">Bot</th>
                <th className="px-3 py-3 text-left">Pair</th>
                <th className="px-3 py-3 text-left">Protocol</th>
                <th className="px-3 py-3 text-left">Frontrun #</th>
                <th className="px-3 py-3 text-left">Victim #</th>
                <th className="px-3 py-3 text-left">Backrun #</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((r, i) => {
                const sym0 = r.token0 ? tokenSymbol(r.token0) : "?";
                const sym1 = r.token1 ? tokenSymbol(r.token1) : "?";
                const hasPair = r.token0 && r.token1;
                return (
                  <tr
                    key={`${r.frontrun_tx}-${i}`}
                    className="border-b border-white/5 hover:bg-white/4 transition-colors"
                  >
                    <td className="px-3 py-2 tabular-nums text-white/55">
                      {fmt(r.block_number)}
                    </td>
                    <td className="px-3 py-2 font-mono">
                      <a href={ethAddr(r.sandwicher)} target="_blank" rel="noopener noreferrer" className="text-red-400 hover:text-red-300">
                        {short(r.sandwicher)}
                      </a>
                    </td>
                    <td className="px-3 py-2 font-semibold text-white/85">
                      {hasPair ? `${sym0}/${sym1}` : short(r.pool)}
                    </td>
                    <td className="px-3 py-2">
                      <Proto p={r.protocol} />
                    </td>
                    <td className="px-3 py-2 font-mono">
                      <a href={ethTx(r.frontrun_tx)} target="_blank" rel="noopener noreferrer" className="text-green-400 hover:text-green-300">
                        {short(r.frontrun_tx)}<span className="text-white/30 ml-1">#{r.frontrun_idx}</span>
                      </a>
                    </td>
                    <td className="px-3 py-2 font-mono">
                      <a href={ethTx(r.victim_tx)} target="_blank" rel="noopener noreferrer" className="text-yellow-400 hover:text-yellow-300">
                        {short(r.victim_tx)}<span className="text-white/30 ml-1">#{r.victim_idx}</span>
                      </a>
                    </td>
                    <td className="px-3 py-2 font-mono">
                      <a href={ethTx(r.backrun_tx)} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300">
                        {short(r.backrun_tx)}<span className="text-white/30 ml-1">#{r.backrun_idx}</span>
                      </a>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
