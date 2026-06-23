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
  v3_count: string;
  v2_count: string;
  sushi_count: string;
  curve_count: string;
  dodo_count: string;
}
interface WeekRow {
  week: string;
  sandwiches: string;
  active_bots: string;
  blocks_sandwiched: string;
  v3_count: string;
  v2_count: string;
  sushi_count: string;
  curve_count: string;
  dodo_count: string;
}
interface BlockPctRow {
  week: string;
  total_blocks: string;
  sandwich_blocks: string;
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

/* ─── protocol config ────────────────────────────────────── */
const PROTO_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  uniswap_v3:  { label: "Uni v3",   color: "#f472b6", bg: "bg-pink-500/15 text-pink-400" },
  uniswap_v2:  { label: "Uni v2",   color: "#a78bfa", bg: "bg-violet-500/15 text-violet-400" },
  sushiswap_v2:{ label: "Sushi",    color: "#fb923c", bg: "bg-orange-500/15 text-orange-400" },
  curve:       { label: "Curve",    color: "#34d399", bg: "bg-emerald-500/15 text-emerald-400" },
  dodo:        { label: "DODO",     color: "#facc15", bg: "bg-yellow-500/15 text-yellow-400" },
};

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
      <p className={`mt-1 text-2xl font-bold tabular-nums ${accent ?? "text-white"}`}>
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
    <div className={`rounded-xl border border-white/10 bg-white/5 p-5 ${className}`}>
      <h3 className="mb-4 text-xs font-semibold uppercase tracking-wider text-white/50">
        {title}
      </h3>
      {children}
    </div>
  );
}

/* ─── protocol badge ─────────────────────────────────────── */
function Proto({ p }: { p: string }) {
  const cfg = PROTO_CONFIG[p] ?? { label: p, bg: "bg-white/10 text-white/50" };
  return (
    <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${cfg.bg}`}>
      {cfg.label}
    </span>
  );
}

/* ─── main ───────────────────────────────────────────────── */
export default function MevClient() {
  const [stats, setStats] = useState<MevStats | null>(null);
  const [weekly, setWeekly] = useState<WeekRow[]>([]);
  const [blocksPct, setBlocksPct] = useState<BlockPctRow[]>([]);
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
      const [s, w, bp, b, po, pa, r, pr] = await Promise.all([
        get<MevStats>("stats"),
        get<WeekRow[]>("weekly-trend", "&weeks=16"),
        get<BlockPctRow[]>("blocks-pct", "&weeks=16"),
        get<BotRow[]>("top-bots", "&limit=20"),
        get<PoolRow[]>("top-pools", "&limit=20"),
        get<PairRow[]>("top-token-pairs", "&limit=20"),
        get<RecentRow[]>("recent", "&limit=50"),
        get<Progress>("backfill-progress"),
      ]);
      setStats(s);
      setWeekly(w);
      setBlocksPct(bp);
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
    week: new Date(r.week).toLocaleDateString("en", { month: "short", day: "numeric" }),
    v3:    Number(r.v3_count),
    v2:    Number(r.v2_count),
    sushi: Number(r.sushi_count),
    curve: Number(r.curve_count),
    dodo:  Number(r.dodo_count),
    bots:  Number(r.active_bots),
    blocks: Number(r.blocks_sandwiched),
  }));

  // 100% normalised protocol share for stacked area
  const weeklyShareData = weekly.map((r) => {
    const total = Number(r.v3_count) + Number(r.v2_count) + Number(r.sushi_count)
                + Number(r.curve_count) + Number(r.dodo_count) || 1;
    return {
      week:  new Date(r.week).toLocaleDateString("en", { month: "short", day: "numeric" }),
      v3:    +((Number(r.v3_count)    / total) * 100).toFixed(1),
      v2:    +((Number(r.v2_count)    / total) * 100).toFixed(1),
      sushi: +((Number(r.sushi_count) / total) * 100).toFixed(1),
      curve: +((Number(r.curve_count) / total) * 100).toFixed(1),
      dodo:  +((Number(r.dodo_count)  / total) * 100).toFixed(1),
    };
  });

  // blocks sandwiched % per week
  const blocksPctData = blocksPct.map((r) => ({
    week: new Date(r.week).toLocaleDateString("en", { month: "short", day: "numeric" }),
    pct: +((Number(r.sandwich_blocks) / Math.max(1, Number(r.total_blocks))) * 100).toFixed(2),
    sw:    Number(r.sandwich_blocks),
    total: Number(r.total_blocks),
  }));

  const v3Total    = stats ? Number(stats.v3_count)    : 0;
  const v2Total    = stats ? Number(stats.v2_count)    : 0;
  const sushiTotal = stats ? Number(stats.sushi_count) : 0;
  const curveTotal = stats ? Number(stats.curve_count) : 0;
  const dodoTotal  = stats ? Number(stats.dodo_count)  : 0;
  const protoTotal = v3Total + v2Total + sushiTotal + curveTotal + dodoTotal || 1;

  const protoPie = [
    { name: "Uniswap v3", value: v3Total,    fill: "#f472b6" },
    { name: "Uniswap v2", value: v2Total,    fill: "#a78bfa" },
    { name: "SushiSwap",  value: sushiTotal, fill: "#fb923c" },
    { name: "Curve",      value: curveTotal, fill: "#34d399" },
    { name: "DODO",       value: dodoTotal,  fill: "#facc15" },
  ].filter((e) => e.value > 0);

  // top-12 pairs pie (by sandwich count)
  const pairsPieTotal = pairs.reduce((s, p) => s + Number(p.sandwiches), 0) || 1;
  const PAIR_COLORS = [
    "#f472b6","#a78bfa","#fb923c","#34d399","#facc15",
    "#38bdf8","#f87171","#4ade80","#c084fc","#fb7185",
    "#60a5fa","#fbbf24",
  ];
  const pairsPie = pairs.slice(0, 12).map((p, i) => ({
    name: `${tokenSymbol(p.token0)}/${tokenSymbol(p.token1)}`,
    value: Number(p.sandwiches),
    fill: PAIR_COLORS[i % PAIR_COLORS.length],
    protocol: p.protocol,
  }));

  const TABS = [
    { id: "overview", label: "Overview" },
    { id: "tokens",   label: "Token Pairs" },
    { id: "bots",     label: "Top Bots" },
    { id: "pools",    label: "Top Pools" },
    { id: "recent",   label: "Live Feed" },
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
          <Kpi label="Pools Targeted" value={fmtK(stats.unique_pools)} />
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
        <div className="space-y-5">
          {/* Row 1: absolute stacked area */}
          <Card title="Weekly Sandwiches by DEX (count)">
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={weeklyData}>
                <defs>
                  {[
                    { id: "gv3",    color: "#f472b6" },
                    { id: "gv2",    color: "#a78bfa" },
                    { id: "gsushi", color: "#fb923c" },
                    { id: "gcurve", color: "#34d399" },
                    { id: "gdodo",  color: "#facc15" },
                  ].map(({ id, color }) => (
                    <linearGradient key={id} id={id} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%"   stopColor={color} stopOpacity={0.45} />
                      <stop offset="100%" stopColor={color} stopOpacity={0} />
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff0d" />
                <XAxis dataKey="week" tick={AXIS_TICK} tickLine={false} />
                <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} tickFormatter={fmtK} />
                <Tooltip {...TOOLTIP_STYLE} />
                <Legend wrapperStyle={{ color: "#ffffff80", fontSize: 12 }} />
                <Area type="monotone" dataKey="v3"    name="Uniswap v3" stackId="1" stroke="#f472b6" fill="url(#gv3)"    strokeWidth={2} />
                <Area type="monotone" dataKey="v2"    name="Uniswap v2" stackId="1" stroke="#a78bfa" fill="url(#gv2)"    strokeWidth={2} />
                <Area type="monotone" dataKey="sushi" name="SushiSwap"  stackId="1" stroke="#fb923c" fill="url(#gsushi)" strokeWidth={1.5} />
                <Area type="monotone" dataKey="curve" name="Curve"      stackId="1" stroke="#34d399" fill="url(#gcurve)" strokeWidth={1.5} />
                <Area type="monotone" dataKey="dodo"  name="DODO"       stackId="1" stroke="#facc15" fill="url(#gdodo)"  strokeWidth={1.5} />
              </AreaChart>
            </ResponsiveContainer>
          </Card>

          {/* Row 2: 100% share area + donut */}
          <div className="grid gap-5 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <Card title="Sandwiched Transactions per Protocol — % Share">
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={weeklyShareData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff0d" />
                    <XAxis dataKey="week" tick={AXIS_TICK} tickLine={false} />
                    <YAxis
                      tick={AXIS_TICK}
                      tickLine={false}
                      axisLine={false}
                      domain={[0, 100]}
                      tickFormatter={(v) => `${v}%`}
                    />
                    <Tooltip
                      {...TOOLTIP_STYLE}
                      formatter={(v: number, name: string) => [`${v.toFixed(1)}%`, name]}
                    />
                    <Legend wrapperStyle={{ color: "#ffffff80", fontSize: 12 }} />
                    <Area type="monotone" dataKey="v3"    name="Uniswap v3" stackId="1" stroke="#f472b6" fill="#f472b640" strokeWidth={1.5} />
                    <Area type="monotone" dataKey="v2"    name="Uniswap v2" stackId="1" stroke="#a78bfa" fill="#a78bfa40" strokeWidth={1.5} />
                    <Area type="monotone" dataKey="sushi" name="SushiSwap"  stackId="1" stroke="#fb923c" fill="#fb923c40" strokeWidth={1.5} />
                    <Area type="monotone" dataKey="curve" name="Curve"      stackId="1" stroke="#34d399" fill="#34d39940" strokeWidth={1.5} />
                    <Area type="monotone" dataKey="dodo"  name="DODO"       stackId="1" stroke="#facc15" fill="#facc1540" strokeWidth={1.5} />
                  </AreaChart>
                </ResponsiveContainer>
              </Card>
            </div>

            <Card title="Protocol Split (all time)">
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
                      `${fmtK(v)} (${((v / protoTotal) * 100).toFixed(1)}%)`,
                      "",
                    ]}
                  />
                </PieChart>
                <div className="space-y-1.5 text-sm w-full">
                  {protoPie.map((e) => (
                    <div key={e.name} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ background: e.fill }} />
                        <span className="text-white/70">{e.name}</span>
                      </div>
                      <span className="tabular-nums text-white/90 font-medium">
                        {((e.value / protoTotal) * 100).toFixed(1)}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          </div>

          {/* Row 3: bots weekly + blocks sandwiched % */}
          <div className="grid gap-5 lg:grid-cols-2">
            <Card title="Active Sandwich Bots per Week">
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={weeklyData} barSize={14}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff0d" />
                  <XAxis dataKey="week" tick={AXIS_TICK} tickLine={false} />
                  <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} />
                  <Tooltip {...TOOLTIP_STYLE} />
                  <Bar dataKey="bots" name="Active Bots" fill="#f87171" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Card>

            <Card title="Portion of Blocks with Sandwich Trades (% weekly)">
              {blocksPctData.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={blocksPctData}>
                    <defs>
                      <linearGradient id="gblockpct" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%"   stopColor="#38bdf8" stopOpacity={0.4} />
                        <stop offset="100%" stopColor="#38bdf8" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff0d" />
                    <XAxis dataKey="week" tick={AXIS_TICK} tickLine={false} />
                    <YAxis
                      tick={AXIS_TICK}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v) => `${v}%`}
                    />
                    <Tooltip
                      {...TOOLTIP_STYLE}
                      formatter={(v: number, _: string, props: { payload?: { sw?: number; total?: number } }) => [
                        `${v}% (${fmt(props.payload?.sw ?? 0)} / ${fmt(props.payload?.total ?? 0)} blocks)`,
                        "Blocks sandwiched",
                      ]}
                    />
                    <Area
                      type="monotone"
                      dataKey="pct"
                      name="% Blocks Sandwiched"
                      stroke="#38bdf8"
                      fill="url(#gblockpct)"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-48 items-center justify-center text-white/25 text-sm">
                  Loading block data…
                </div>
              )}
            </Card>
          </div>
        </div>
      )}

      {/* ── TOKEN PAIRS tab ─────────────────────────────── */}
      {tab === "tokens" && (
        <div className="space-y-5">
          {/* pie + legend */}
          {pairsPie.length > 0 && (
            <div className="grid gap-5 lg:grid-cols-3">
              <Card title="Top 12 Sandwiched Token Pairs" className="lg:col-span-1">
                <div className="flex flex-col items-center gap-3">
                  <PieChart width={200} height={200}>
                    <Pie
                      data={pairsPie}
                      cx={95}
                      cy={95}
                      outerRadius={90}
                      dataKey="value"
                      strokeWidth={0}
                    >
                      {pairsPie.map((entry, i) => (
                        <Cell key={i} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip
                      {...TOOLTIP_STYLE}
                      formatter={(v: number) => [
                        `${fmtK(v)} (${((v / pairsPieTotal) * 100).toFixed(1)}%)`,
                        "",
                      ]}
                    />
                  </PieChart>
                  <div className="w-full space-y-1 text-xs">
                    {pairsPie.map((e) => (
                      <div key={e.name} className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span className="h-2 w-2 rounded-full flex-shrink-0" style={{ background: e.fill }} />
                          <span className="text-white/70 truncate max-w-[100px]">{e.name}</span>
                        </div>
                        <span className="tabular-nums text-white/80">
                          {((e.value / pairsPieTotal) * 100).toFixed(1)}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>

              {/* summary note */}
              <div className="lg:col-span-2 flex flex-col justify-center gap-3">
                <div className="rounded-xl border border-white/8 bg-white/3 p-4 text-sm text-white/60">
                  <p className="font-semibold text-white/80 mb-1">Coverage note</p>
                  <p>74.7% of sandwiched pools are mapped to token pairs — these are pools created after
                  Dencun (Mar 2024) whose factory events are in our archive. Older pools show as "unknown"
                  in the table below.</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3">
                    <p className="text-[10px] uppercase tracking-wide text-white/40">Total pairs detected</p>
                    <p className="mt-1 text-xl font-bold text-white">{fmt(pairs.length)}+</p>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3">
                    <p className="text-[10px] uppercase tracking-wide text-white/40">Top pair sandwiches</p>
                    <p className="mt-1 text-xl font-bold text-pink-400">
                      {pairs[0] ? fmt(pairs[0].sandwiches) : "—"}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* full table */}
          <div className="rounded-xl border border-white/10 bg-white/5 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/8 text-[11px] uppercase tracking-wide text-white/40">
                  <th className="px-4 py-3 text-left">#</th>
                  <th className="px-4 py-3 text-left">Token Pair</th>
                  <th className="px-4 py-3 text-left">Protocol</th>
                  <th className="px-4 py-3 text-right">Sandwiches</th>
                  <th className="px-4 py-3 text-right">Share</th>
                  <th className="px-4 py-3 text-right">Victims</th>
                  <th className="px-4 py-3 text-right">Pools</th>
                  <th className="px-4 py-3 text-right">Bots</th>
                </tr>
              </thead>
              <tbody>
                {pairs.map((p, i) => {
                  const sym0 = tokenSymbol(p.token0);
                  const sym1 = tokenSymbol(p.token1);
                  const pairTotal = pairs.reduce((s, r) => s + Number(r.sandwiches), 0) || 1;
                  return (
                    <tr
                      key={`${p.token0}-${p.token1}-${i}`}
                      className="border-b border-white/5 hover:bg-white/4 transition-colors"
                    >
                      <td className="px-4 py-2.5 text-white/25 tabular-nums">{i + 1}</td>
                      <td className="px-4 py-2.5">
                        <span className="font-semibold text-white">{sym0}/{sym1}</span>
                      </td>
                      <td className="px-4 py-2.5"><Proto p={p.protocol} /></td>
                      <td className="px-4 py-2.5 text-right tabular-nums font-medium text-white">
                        {fmt(p.sandwiches)}
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-white/50">
                        {((Number(p.sandwiches) / pairTotal) * 100).toFixed(1)}%
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
        </div>
      )}

      {/* ── BOTS tab ─────────────────────────────────────── */}
      {tab === "bots" && (
        <div className="space-y-5">
          {/* bots weekly bar chart */}
          <Card title="Unique Active Bots per Week">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={weeklyData} barSize={16}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff0d" />
                <XAxis dataKey="week" tick={AXIS_TICK} tickLine={false} />
                <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} />
                <Tooltip {...TOOLTIP_STYLE} />
                <Bar dataKey="bots" name="Unique Bots" fill="#f87171" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>

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
                    <td className="px-4 py-2.5"><Proto p={p.protocol} /></td>
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
                    <td className="px-3 py-2"><Proto p={r.protocol} /></td>
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
