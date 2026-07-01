"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useTheme } from "next-themes";
import { PageHeader } from "@/components/shared/PageHeader";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";

/* ─── token registry ──────────────────────────────────────────────────── */
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
  "0x5a98fcbea516cf06857215779fd812ca3bef1b32": "LDO",
  "0xba100000625a3754423978a60c9317c58a424e3d": "BAL",
  "0x4e3fbd56cd56c3e72c1403e103b45db9da5b9d2b": "CVX",
  "0x853d955acef822db058eb8505911ed77f175b99e": "FRAX",
  "0x68bbed6a47194eff1cf514b50ea91895597fc91e": "ANDY",
  "0x594daad7d77592a2b97b725a7ad59d7e188b5bfa": "APU",
  "0x6e79b51959cf968d87826592f46f819f92466615": "HOPPY",
  "0xa0ef786bf476fe0810408caba05e536ac800ff86": "MYRIA",
  "0x40fd72257597aa14c7231a7b1aaa29fce868f677": "XOR",
  "0xaa95f26e30001251fb905d264aa7b00ee9df6c18": "Kendu",
  "0x27c70cd1946795b66be9d954418546998b546634": "LEASH",
  "0xcf91b70017eabde82c9671e30e5502d312ea6eb2": "puppies",
  "0x467bccd9d29f223bce8043b84e8c8b282827790f": "TEL",
  "0x9ac9468e7e3e1d194080827226b45d0b892c77fd": "Yee",
  "0x80ee5c641a8ffc607545219a3856562f56427fe9": "BRETT",
  "0xf6ce4be313ead51511215f1874c898239a331e37": "BIRDDOG",
  "0x85d19fb57ca7da715695fcf347ca2169144523a7": "CONAN",
  "0xb90b2a35c65dbc466b04240097ca756ad2005295": "BOBO",
  "0x51cb253744189f11241becb29bedd3f1b5384fdb": "DMTR",
  "0x44971abf0251958492fee97da3e5c5ada88b9185": "basedAI",
  "0xb2617246d0c6c0087f18703d576831899ca94f01": "ZIG",
  "0xaaee1a9723aadb7afa2810263653a34ba2c21c7a": "Mog",
  "0x73d7c860998ca3c01ce8c808f5577d94d545d1b4": "IXS",
  "0x8ed97a637a790be1feff5e888d43629dc05408f6": "NPC",
  "0x8248270620aa532e4d64316017be5e873e37cc09": "DEVVE",
  "0x72e4f9f808c49a2a61de9c5896298920dc4eeea9": "BITCOIN",
  "0x747e550a7b848ace786c3cfe754aa78febc8a022": "DODO",
  "0x25931894a86d47441213199621f1f2994e1c39aa": "CGPT",
  "0x7039cd6d7966672f194e8139074c3d5c4e6dcf65": "STRUMP",
  "0x58cb30368ceb2d194740b144eab4c2da8a917dcb": "ZYN",
  "0x33abe795f9c1b6136608c36db211bd7590f5fdae": "WOLF",
  "0xf21661d0d1d76d3ecb8e1b9f1c923dbfffae4097": "RIO",
  "0x1ae7e1d0ce06364ced9ad58225a1705b3e5db92b": "LMEOW",
  "0xf411903cbc70a74d22900a5de66a2dda66507255": "VRA",
  "0x8afe4055ebc86bd2afb3940c0095c9aca511d852": "AIUS",
  "0xca530408c3e552b020a2300debc7bd18820fb42f": "RYU",
  "0x06450dee7fd2fb8e39061434babcfc05599a6fb8": "XEN",
  "0x76e222b07c53d28b89b0bac18602810fc22b49a8": "JOE",
  "0xa35923162c49cf95e6bf26623385eb431ad920d3": "TURBO",
  "0x667102bd3413bfeaa3dffb48fa8288819e480a88": "TKX",
  "0xe0f63a424a4439cbe457d80e4f4b51ad25b2c56c": "SPX",
  "0x26c8afbbfe1ebaca03c2bb082e69d0476bffe099": "CELL",
  "0xa3d4bee77b05d4a0c943877558ce21a763c4fa29": "ROOT",
};
function tokenSymbol(addr: string): string {
  if (!addr) return "?";
  return TOKEN_SYMBOLS[addr.toLowerCase()] ?? addr.slice(2, 6).toUpperCase();
}

/* ─── types ────────────────────────────────────────────────────────────── */
interface MevStats {
  total_sandwiches: string; unique_victims: string; unique_bots: string;
  unique_pools: string; first_block: string; last_block: string;
  sandwich_blocks: string; total_blocks: string;
  v3_count: string; v2_count: string; sushi_count: string; curve_count: string; dodo_count: string;
  total_gross_profit_usd: string; total_gas_cost_usd: string;
}
interface WeekRow {
  week?: string; date?: string; sandwiches: string; active_bots: string; blocks_sandwiched: string;
  v3_count: string; v2_count: string; sushi_count: string; curve_count: string; dodo_count: string;
  victim_usd_total: string; usd_count: string; weekly_victims?: string; daily_victims?: string;
  bot_profit_usd: string; bot_gas_usd: string;
}
interface BlockPctRow { week: string; total_blocks: string; sandwich_blocks: string; }
interface BotRow {
  sandwicher: string; sandwiches: string; unique_victims: string;
  unique_pools: string; first_seen_block: string; last_seen_block: string;
  total_gas_cost_usd: string; total_profit_usd: string; net_profit_usd: string;
}
interface PoolRow { pool: string; token0: string; token1: string; protocol: string; sandwiches: string; unique_victims: string; unique_bots: string; bot_profit_usd: string; }
interface PairRow { token0: string; token1: string; protocol: string; sandwiches: string; unique_victims: string; unique_pools: string; unique_bots: string; victim_usd_total: string; bot_profit_usd: string; }
interface TokenRow { token: string; sandwiches: string; unique_victims: string; unique_bots: string; }
interface RecentRow {
  block_number: string; block_timestamp: string; sandwicher: string; pool: string; protocol: string;
  frontrun_tx: string; frontrun_idx: string; victim_tx: string; victim_idx: string; backrun_tx: string; backrun_idx: string;
  token0: string; token1: string; victim_usd: string; bot_profit_usd: string; gas_cost_usd: string;
}
interface Progress { last_block: string; total_sandwiches: string; dencun_start: number; }
type TabId = "overview" | "tokens" | "pairs" | "bots" | "pools" | "recent";

/* ─── theme ─────────────────────────────────────────────────────────────── */
type Theme = "dark" | "light";
interface TC {
  pageBg: string; pageText: string;
  card: string; cardBorder: string;
  text: string; muted: string; faint: string; veryFaint: string;
  tableRow: string; tableBorder: string; tableHead: string;
  tabBar: string; tabActive: string; tabInactive: string;
  kpiBg: string; kpiBorder: string;
  bannerBg: string; bannerBorder: string; bannerText: string; bannerSub: string; bannerBar: string; bannerBarBg: string;
  ttBg: string; ttBorder: string; ttColor: string;
  axis: string; grid: string;
}
const DARK: TC = {
  pageBg: "bg-[#0c0c16]", pageText: "text-white",
  card: "bg-[#13131f]", cardBorder: "border-white/[0.08]",
  text: "text-white", muted: "text-white/50", faint: "text-white/30", veryFaint: "text-white/20",
  tableRow: "hover:bg-white/[0.03]", tableBorder: "border-white/[0.06]", tableHead: "text-white/35",
  tabBar: "border-white/10",
  tabActive: "text-white border-b-2 border-pink-400 bg-white/[0.06]",
  tabInactive: "text-white/40 hover:text-white/70",
  kpiBg: "bg-white/[0.04]", kpiBorder: "border-white/[0.08]",
  bannerBg: "bg-amber-500/10", bannerBorder: "border-amber-500/25",
  bannerText: "text-amber-300", bannerSub: "text-amber-400/60",
  bannerBar: "bg-amber-400", bannerBarBg: "bg-white/10",
  ttBg: "#11111a", ttBorder: "#ffffff15", ttColor: "#fff",
  axis: "#ffffff40", grid: "#ffffff08",
};
const LIGHT: TC = {
  pageBg: "bg-slate-50", pageText: "text-gray-900",
  card: "bg-white", cardBorder: "border-slate-200",
  text: "text-gray-900", muted: "text-gray-500", faint: "text-gray-400", veryFaint: "text-gray-300",
  tableRow: "hover:bg-slate-50", tableBorder: "border-slate-100", tableHead: "text-gray-400",
  tabBar: "border-slate-200",
  tabActive: "text-gray-900 border-b-2 border-pink-500 bg-slate-100",
  tabInactive: "text-gray-400 hover:text-gray-700",
  kpiBg: "bg-white", kpiBorder: "border-slate-200",
  bannerBg: "bg-amber-50", bannerBorder: "border-amber-200",
  bannerText: "text-amber-700", bannerSub: "text-amber-500",
  bannerBar: "bg-amber-500", bannerBarBg: "bg-amber-100",
  ttBg: "#ffffff", ttBorder: "#e2e8f0", ttColor: "#111827",
  axis: "#9ca3af", grid: "#f1f5f9",
};

/* ─── protocol config ──────────────────────────────────────────────────── */
const PROTO_CONFIG: Record<string, { label: string; color: string; dark: string; light: string }> = {
  uniswap_v3: { label: "Uni v3", color: "#e91e8c", dark: "bg-pink-500/15 text-pink-400 border-pink-500/30", light: "bg-pink-50 text-pink-600 border-pink-200" },
  uniswap_v2: { label: "Uni v2", color: "#8b5cf6", dark: "bg-violet-500/15 text-violet-400 border-violet-500/30", light: "bg-violet-50 text-violet-600 border-violet-200" },
  sushiswap_v2: { label: "Sushi", color: "#f97316", dark: "bg-orange-500/15 text-orange-400 border-orange-500/30", light: "bg-orange-50 text-orange-600 border-orange-200" },
  curve: { label: "Curve", color: "#10b981", dark: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30", light: "bg-emerald-50 text-emerald-600 border-emerald-200" },
  dodo: { label: "DODO", color: "#eab308", dark: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30", light: "bg-yellow-50 text-yellow-600 border-yellow-200" },
};
const CHART_COLORS = ["#e91e8c", "#8b5cf6", "#f97316", "#10b981", "#eab308", "#06b6d4", "#ef4444", "#22c55e", "#a855f7", "#f43f5e", "#3b82f6", "#f59e0b"];

/* ─── helpers ──────────────────────────────────────────────────────────── */
const API = "/api/mev";
async function apiFetch<T>(type: string, extra = ""): Promise<T> {
  const r = await fetch(`${API}?type=${type}${extra}`, { cache: "no-store" });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}
const fmt = (n: string | number) => Number(n).toLocaleString();
function fmtK(n: string | number) {
  const v = Number(n);
  if (v >= 1_000_000) return (v / 1_000_000).toFixed(1) + "M";
  if (v >= 1_000) return (v / 1_000).toFixed(1) + "K";
  return String(v);
}
function fmtUsd(n: string | number) {
  const v = Number(n);
  if (!v) return "—";
  if (v >= 1_000_000_000) return `$${(v / 1_000_000_000).toFixed(2)}B`;
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(2)}M`;
  if (v >= 1_000) return `$${(v / 1_000).toFixed(1)}K`;
  return `$${v.toFixed(0)}`;
}
const short = (s: string) => s ? `${s.slice(0, 6)}…${s.slice(-4)}` : "—";
const ethTx = (tx: string) => `https://etherscan.io/tx/${tx}`;
const ethAddr = (a: string) => `https://etherscan.io/address/${a}`;

/* ─── sub-components ────────────────────────────────────────────────────── */
function InfoTooltip({ text, tc }: { text: string; tc: TC }) {
  return (
    <div className="relative inline-block group ml-1 align-middle">
      <span className={`cursor-help text-[9px] font-bold border rounded-full h-3.5 w-3.5 inline-flex items-center justify-center opacity-40 hover:opacity-90 transition-opacity font-mono ${tc.text} ${tc.cardBorder}`}>
        i
      </span>
      <div className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block w-56 p-3 text-[11px] font-mono leading-relaxed border z-50 shadow-2xl rounded-none ${tc.card} ${tc.cardBorder} ${tc.text}`}>
        {text}
        <div className={`absolute top-full left-1/2 -translate-x-1/2 border-r border-b w-2 h-2 rotate-45 -mt-1 ${tc.card} ${tc.cardBorder}`} />
      </div>
    </div>
  );
}

function Card({ tc, title, sub, children, className = "", tooltip }: {
  tc: TC; title: string; sub?: string; children: React.ReactNode; className?: string; tooltip?: string;
}) {
  return (
    <div className={`rounded-none border ${tc.card} ${tc.cardBorder} p-5 ${className}`}>
      <div className="mb-4">
        <div className={`text-[13px] font-bold uppercase tracking-wider font-mono ${tc.text}`}>
          {title}
          {tooltip && <InfoTooltip text={tooltip} tc={tc} />}
        </div>
        {sub && <p className={`text-xs mt-0.5 font-mono opacity-60 ${tc.faint}`}>{sub}</p>}
      </div>
      {children}
    </div>
  );
}

function Kpi({ tc, label, value, sub, accent, borderAccent, tooltip }: { tc: TC; label: string; value: string; sub?: string; accent?: string; borderAccent?: string; tooltip?: string }) {
  return (
    <div className={`rounded-none border ${tc.kpiBg} ${tc.kpiBorder} ${borderAccent ?? "border-t border-t-white/10"} px-5 py-4 hover:scale-[1.02] hover:shadow-md transition-all duration-200`}>
      <div className="flex items-center justify-between">
        <p className={`text-[10px] font-bold uppercase tracking-widest font-mono ${tc.muted}`}>{label}</p>
        {tooltip && <InfoTooltip text={tooltip} tc={tc} />}
      </div>
      <p className={`mt-1.5 text-2xl font-bold tabular-nums font-mono ${accent ?? tc.text}`}>{value}</p>
      {sub && <p className={`mt-0.5 text-xs font-mono opacity-60 ${tc.faint}`}>{sub}</p>}
    </div>
  );
}

function Proto({ p, isDark }: { p: string; isDark: boolean }) {
  const cfg = PROTO_CONFIG[p];
  if (!cfg) return (
    <span className={`rounded-none border px-2 py-0.5 text-[10px] font-bold font-mono uppercase tracking-wider ${isDark ? "bg-white/10 text-white/40 border-white/10" : "bg-gray-100 text-gray-400 border-gray-200"}`}>
      {p}
    </span>
  );
  return (
    <span className={`rounded-none border px-2 py-0.5 text-[10px] font-bold font-mono uppercase tracking-wider ${isDark ? cfg.dark : cfg.light}`}>
      {cfg.label}
    </span>
  );
}

function EmptyState({ tc, msg = "No data available" }: { tc: TC; msg?: string }) {
  return (
    <div className={`flex items-center justify-center py-16 text-xs font-mono opacity-50 uppercase tracking-wider ${tc.text}`}>
      {msg}
    </div>
  );
}

function TableShell({ tc, title, sub, head, children }: {
  tc: TC; title: string; sub?: string;
  head: React.ReactNode; children: React.ReactNode;
}) {
  return (
    <div className={`rounded-none border ${tc.cardBorder} ${tc.card} overflow-hidden`}>
      <div className={`border-b ${tc.tableBorder} px-5 py-3`}>
        <p className={`text-[13px] font-bold uppercase tracking-wider font-mono ${tc.text}`}>{title}</p>
        {sub && <p className={`text-xs ${tc.muted} mt-0.5 font-mono opacity-60`}>{sub}</p>}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className={`border-b ${tc.tableBorder} text-[10px] uppercase tracking-widest font-mono ${tc.tableHead}`}>{head}</tr></thead>
          <tbody>{children}</tbody>
        </table>
      </div>
    </div>
  );
}

function DonutCard({ tc, title, sub, data, total, className = "", tooltip }: {
  tc: TC; title: string; sub?: string;
  data: { name: string; value: number; fill: string }[];
  total: number; className?: string; tooltip?: string;
}) {
  return (
    <Card tc={tc} title={title} sub={sub} className={className} tooltip={tooltip}>
      <div className="flex flex-col items-center gap-3">
        <PieChart width={180} height={180}>
          <Pie data={data} cx={87} cy={87} innerRadius={52} outerRadius={84} dataKey="value" strokeWidth={0}>
            {data.map((e, i) => <Cell key={i} fill={e.fill} />)}
          </Pie>
          <Tooltip
            contentStyle={{ background: tc.ttBg, border: `1px solid ${tc.ttBorder}`, borderRadius: 0, color: tc.ttColor, fontSize: 12, fontFamily: "var(--font-geist-mono)" }}
            formatter={(v: number) => [`${fmtK(v)} (${((v / total) * 100).toFixed(1)}%)`, ""]}
          />
        </PieChart>
        <div className="w-full space-y-1.5 text-xs font-mono">
          {data.map((e) => (
            <div key={e.name} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-none flex-shrink-0" style={{ background: e.fill }} />
                <span className={tc.muted}>{e.name}</span>
              </div>
              <span className={`tabular-nums font-bold ${tc.text}`}>{((e.value / total) * 100).toFixed(1)}%</span>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}

/* ─── main ──────────────────────────────────────────────────────────────── */
export default function MevClient() {
  const { theme } = useTheme();
  const isDark = theme !== "light";
  const tc = isDark ? DARK : LIGHT;

  const [stats, setStats] = useState<MevStats | null>(null);
  const [weekly, setWeekly] = useState<WeekRow[]>([]);
  const [blocksPct, setBlocksPct] = useState<BlockPctRow[]>([]);
  const [bots, setBots] = useState<BotRow[]>([]);
  const [pools, setPools] = useState<PoolRow[]>([]);
  const [pairs, setPairs] = useState<PairRow[]>([]);
  const [tokens, setTokens] = useState<TokenRow[]>([]);
  const [recent, setRecent] = useState<RecentRow[]>([]);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<TabId>("overview");
  const [timeframe, setTimeframe] = useState<"daily" | "weekly">("weekly");

  const load = useCallback(async () => {
    try {
      const [s, w, bp, b, po, pa, tk, r, pr] = await Promise.all([
        apiFetch<MevStats>("stats"),
        apiFetch<WeekRow[]>(timeframe === "daily" ? "daily-trend" : "weekly-trend", timeframe === "daily" ? "&days=30" : "&weeks=16"),
        apiFetch<BlockPctRow[]>("blocks-pct", "&weeks=16"),
        apiFetch<BotRow[]>("top-bots", "&limit=25"),
        apiFetch<PoolRow[]>("top-pools", "&limit=25"),
        apiFetch<PairRow[]>("top-token-pairs", "&limit=25"),
        apiFetch<TokenRow[]>("top-tokens", "&limit=30"),
        apiFetch<RecentRow[]>("recent", "&limit=50"),
        apiFetch<Progress>("backfill-progress"),
      ]);
      setStats(s); setWeekly(w); setBlocksPct(bp); setBots(b);
      setPools(po); setPairs(pa); setTokens(tk); setRecent(r); setProgress(pr);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [timeframe]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    const iv = setInterval(load, 30_000);
    return () => clearInterval(iv);
  }, [load]);

  if (loading)
    return (
      <div className="flex items-center justify-center py-32 font-mono">
        <p className="text-xs text-text-secondary/50 uppercase tracking-widest animate-pulse">
          LOADING TELEMETRY DATA…
        </p>
      </div>
    );
  if (error)
    return (
      <div className="border border-dashed border-red-500/30 bg-red-500/5 p-6 text-red-400 text-xs font-mono whitespace-pre-wrap">
        [ ERROR ] {error}
      </div>
    );

  /* ── derived stats ──────────────────────────────────────────────────── */
  const pctBlocks = stats
    ? ((Number(stats.sandwich_blocks) / Number(stats.total_blocks)) * 100).toFixed(1) : "—";
  const backfilling = progress && stats && Number(progress.last_block) < Number(stats.last_block) - 5000;
  const bfPct = progress && stats
    ? Math.min(100, Math.floor(((Number(progress.last_block) - progress.dencun_start) / (Number(stats.last_block) - progress.dencun_start)) * 100))
    : 0;

  /* ── chart helpers ─────────────────────────────────────────────────── */
  const TICK = { fill: tc.axis, fontSize: 11, fontFamily: "var(--font-geist-mono)" };
  const TIP = {
    contentStyle: {
      background: tc.ttBg, border: `1px solid ${tc.ttBorder}`,
      borderRadius: 0, color: tc.ttColor, fontSize: 12, fontFamily: "var(--font-geist-mono)"
    },
  };
  const LEG = { color: tc.ttColor, fontSize: 12, opacity: 0.65, fontFamily: "var(--font-geist-mono)" };

  /* ── chart data ─────────────────────────────────────────────────────── */
  const weeklyData = weekly.map((r) => {
    const gross = Number(r.bot_profit_usd);
    const gas = Number(r.bot_gas_usd);
    const dateVal = r.week || r.date || "";
    return {
      week: new Date(dateVal).toLocaleDateString("en", { month: "short", day: "numeric" }),
      v3: Number(r.v3_count), v2: Number(r.v2_count), sushi: Number(r.sushi_count),
      curve: Number(r.curve_count), dodo: Number(r.dodo_count),
      bots: Number(r.active_bots), victims: Number(r.weekly_victims ?? r.daily_victims ?? 0),
      usd: Number(r.victim_usd_total),
      usdPct: r.usd_count && r.sandwiches ? Math.round((Number(r.usd_count) / Number(r.sandwiches)) * 100) : 0,
      bot_profit_usd: gross,
      bot_gas_usd: gas,
      bot_net_profit_usd: Math.max(0, gross - gas),
    };
  });

  const shareData = weekly.map((r) => {
    const tot = Number(r.v3_count) + Number(r.v2_count) + Number(r.sushi_count) + Number(r.curve_count) + Number(r.dodo_count) || 1;
    const dateVal = r.week || r.date || "";
    return {
      week: new Date(dateVal).toLocaleDateString("en", { month: "short", day: "numeric" }),
      v3: +((Number(r.v3_count) / tot) * 100).toFixed(1),
      v2: +((Number(r.v2_count) / tot) * 100).toFixed(1),
      sushi: +((Number(r.sushi_count) / tot) * 100).toFixed(1),
      curve: +((Number(r.curve_count) / tot) * 100).toFixed(1),
      dodo: +((Number(r.dodo_count) / tot) * 100).toFixed(1),
    };
  });

  const blkData = blocksPct.map((r) => {
    const sw = (Number(r.sandwich_blocks) / Math.max(1, Number(r.total_blocks))) * 100;
    return {
      week: new Date(r.week).toLocaleDateString("en", { month: "short", day: "numeric" }),
      sandwich: +sw.toFixed(2),
      other: +(100 - sw).toFixed(2),
      sw: Number(r.sandwich_blocks),
      total: Number(r.total_blocks),
    };
  });

  /* ── donut data ─────────────────────────────────────────────────────── */
  const v3T = Number(stats?.v3_count ?? 0), v2T = Number(stats?.v2_count ?? 0);
  const sushiT = Number(stats?.sushi_count ?? 0), curveT = Number(stats?.curve_count ?? 0), dodoT = Number(stats?.dodo_count ?? 0);
  const protoTot = v3T + v2T + sushiT + curveT + dodoT || 1;
  const protoPie = [
    { name: "Uniswap v3", value: v3T, fill: "#e91e8c" },
    { name: "Uniswap v2", value: v2T, fill: "#8b5cf6" },
    { name: "SushiSwap", value: sushiT, fill: "#f97316" },
    { name: "Curve", value: curveT, fill: "#10b981" },
    { name: "DODO", value: dodoT, fill: "#eab308" },
  ].filter((e) => e.value > 0);

  const pairsTot = pairs.reduce((s, p) => s + Number(p.sandwiches), 0) || 1;
  const pairsPie = pairs.slice(0, 12).map((p, i) => ({
    name: `${tokenSymbol(p.token0)}/${tokenSymbol(p.token1)}`,
    value: Number(p.sandwiches), fill: CHART_COLORS[i % CHART_COLORS.length],
  }));

  const tokensTot = tokens.reduce((s, t) => s + Number(t.sandwiches), 0) || 1;
  const tokensPie = tokens.slice(0, 12).map((t, i) => ({
    name: tokenSymbol(t.token), value: Number(t.sandwiches), fill: CHART_COLORS[i % CHART_COLORS.length],
  }));

  const TABS: { id: TabId; label: string }[] = [
    { id: "overview", label: "Overview" },
    { id: "tokens", label: "Tokens" },
    { id: "pairs", label: "Token Pairs" },
    { id: "bots", label: "Bots" },
    { id: "pools", label: "Pools" },
    { id: "recent", label: "Live Feed" },
  ];

  return (
    <div className="animate-page-in space-y-6">
      <PageHeader
        meta="MEV Observability Feed"
        title="🥪 MEV Sandwich Tracker"
        summary="Native on-chain detection — Uniswap v2/v3, SushiSwap, Curve, DODO · all sandwiches since Dencun"
      >
        <div className="flex flex-wrap gap-2 font-mono">
          {[
            "Source: ethereum.logs",
            "Refreshes 30s",
          ].map((t) => (
            <span key={t} className={`rounded-none border ${tc.cardBorder} px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider ${tc.faint}`}>{t}</span>
          ))}
        </div>
      </PageHeader>

      {/* ── backfill banner ─────────────────────────────────────────── */}
      {backfilling && progress && stats && (
        <div className={`rounded-none border border-dashed ${tc.bannerBorder} ${tc.bannerBg} px-5 py-3 font-mono`}>
          <div className="flex items-center justify-between text-sm">
            <span className={`font-bold ${tc.bannerText} uppercase tracking-wide`}>Historical backfill running — {bfPct}% complete</span>
            <span className={`text-xs ${tc.bannerSub}`}>block {fmt(progress.last_block)} / {fmt(stats.last_block)}</span>
          </div>
          <div className={`mt-2 h-1.5 rounded-none bg-background border border-border/30 overflow-hidden`}>
            <div className={`h-full rounded-none ${tc.bannerBar} transition-all`} style={{ width: `${bfPct}%` }} />
          </div>
          <p className={`mt-1.5 text-xs ${tc.bannerSub}`}>{fmt(progress.total_sandwiches)} sandwiches detected so far</p>
        </div>
      )}

      {/* ── KPIs (4x2 Grid) ── */}
      {stats && (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <Kpi
            tc={tc}
            label="Total Sandwiches"
            value={fmtK(stats.total_sandwiches)}
            sub="since Dencun"
            accent="text-pink-500"
            borderAccent="border-t-2 border-t-pink-500"
            tooltip="Total EIP-4844 sandwich transactions detected since the Dencun upgrade (block 19,426,587)."
          />
          <Kpi
            tc={tc}
            label="Gross Revenue"
            value={fmtUsd(stats.total_gross_profit_usd)}
            sub="estimated bot revenue"
            accent="text-emerald-500"
            borderAccent="border-t-2 border-t-emerald-500"
            tooltip="Estimated total USD value extracted by sandwich searcher contracts from victim slippage."
          />
          <Kpi
            tc={tc}
            label="Net Bot Profit"
            value={fmtUsd(Number(stats.total_gross_profit_usd) - Number(stats.total_gas_cost_usd))}
            sub="revenue minus gas"
            accent="text-cyan-400"
            borderAccent="border-t-2 border-t-cyan-400"
            tooltip="Net sandwich bot profit: gross revenue minus the gas fees paid to block builders for frontrun and backrun transactions."
          />
          <Kpi
            tc={tc}
            label="MEV Bots"
            value={fmt(stats.unique_bots)}
            sub="unique sandwichers"
            accent="text-red-500"
            borderAccent="border-t-2 border-t-red-500"
            tooltip="Number of unique searcher contract addresses executing sandwich attacks."
          />
          <Kpi
            tc={tc}
            label="Unique Victims"
            value={fmtK(stats.unique_victims)}
            sub="distinct txs targeted"
            borderAccent="border-t border-t-slate-200 dark:border-t-white/15"
            tooltip="Number of unique victim transactions targeted by sandwich attacks."
          />
          <Kpi
            tc={tc}
            label="Pools Targeted"
            value={fmtK(stats.unique_pools)}
            sub="distinct DEX pools"
            borderAccent="border-t border-t-slate-200 dark:border-t-white/15"
            tooltip="Number of unique decentralized exchange liquidity pools where sandwich attacks were executed."
          />
          <Kpi
            tc={tc}
            label="Blocks Sandwiched"
            value={`${pctBlocks}%`}
            sub="of blocks, last 30d"
            accent="text-amber-500"
            borderAccent="border-t-2 border-t-amber-500"
            tooltip="Percentage of Ethereum blocks containing at least one sandwich transaction over the last 30 days."
          />
          <Kpi
            tc={tc}
            label="Rate"
            value={`${((Number(stats.total_sandwiches) / Math.max(1, Number(stats.last_block) - Number(stats.first_block))) * 1000).toFixed(2)}/1K`}
            sub="per 1000 blocks"
            borderAccent="border-t border-t-slate-200 dark:border-t-white/15"
            tooltip="Average number of sandwich transactions per 1,000 Ethereum blocks."
          />
        </div>
      )}

      {/* ── tab bar ─────────────────────────────────────────────────── */}
      <div className={`flex gap-0.5 border-b ${tc.tabBar} font-mono`}>
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-4 py-2.5 text-[12px] font-bold uppercase tracking-wider transition-all rounded-none ${tab === t.id ? tc.tabActive : tc.tabInactive}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ╔══════════════════════ OVERVIEW ══════════════════════════════╗ */}
      {tab === "overview" && (
        <div className="space-y-5">
          {/* Timeframe Granularity Toggle */}
          <div className={`flex justify-between items-center ${tc.card} border ${tc.cardBorder} px-4 py-3 font-mono text-[10px]`}>
            <span className={`font-bold ${tc.muted} uppercase tracking-wider`}>Chart Timeframe Granularity</span>
            <div className="flex gap-1">
              {(["weekly", "daily"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTimeframe(t)}
                  className={`px-3 py-1 font-bold uppercase tracking-wider transition-all border text-[9px] ${
                    timeframe === t
                      ? "bg-pink-500 text-white border-pink-500"
                      : `${tc.text} border-transparent hover:${tc.kpiBg} hover:${tc.cardBorder}`
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* absolute stacked area */}
          <Card
            tc={tc}
            title="Sandwiched Transactions"
            sub="ethereum, Weekly"
            tooltip="Weekly count of EIP-4844 sandwich transactions, broken down by decentralized exchange (DEX) protocol."
          >
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={weeklyData}>
                <defs>
                  {[["gv3", "#e91e8c"], ["gv2", "#8b5cf6"], ["gs", "#f97316"], ["gc", "#10b981"], ["gd", "#eab308"]].map(([id, c]) => (
                    <linearGradient key={id} id={id} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={c} stopOpacity={0.55} />
                      <stop offset="100%" stopColor={c} stopOpacity={0.04} />
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={tc.grid} />
                <XAxis dataKey="week" tick={TICK} tickLine={false} />
                <YAxis tick={TICK} tickLine={false} axisLine={false} tickFormatter={fmtK} />
                <Tooltip {...TIP} />
                <Legend wrapperStyle={LEG} />
                <Area type="monotone" dataKey="v3" name="Uniswap v3" stackId="1" stroke="#e91e8c" fill="url(#gv3)" strokeWidth={1.5} />
                <Area type="monotone" dataKey="v2" name="Uniswap v2" stackId="1" stroke="#8b5cf6" fill="url(#gv2)" strokeWidth={1.5} />
                <Area type="monotone" dataKey="sushi" name="SushiSwap" stackId="1" stroke="#f97316" fill="url(#gs)" strokeWidth={1.5} />
                <Area type="monotone" dataKey="curve" name="Curve" stackId="1" stroke="#10b981" fill="url(#gc)" strokeWidth={1.5} />
                <Area type="monotone" dataKey="dodo" name="DODO" stackId="1" stroke="#eab308" fill="url(#gd)" strokeWidth={1.5} />
              </AreaChart>
            </ResponsiveContainer>
          </Card>

          {/* 100% share + protocol donut */}
          <div className="grid gap-5 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <Card
                tc={tc}
                title="Sandwiched Transactions per Protocol"
                sub="ethereum, % share, Weekly"
                tooltip="Weekly percentage share of sandwich volume across Uniswap v2/v3, SushiSwap, Curve, and DODO."
              >
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={shareData}>
                    <CartesianGrid strokeDasharray="3 3" stroke={tc.grid} />
                    <XAxis dataKey="week" tick={TICK} tickLine={false} />
                    <YAxis tick={TICK} tickLine={false} axisLine={false} domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                    <Tooltip {...TIP} formatter={(v: number, name: string) => [`${v.toFixed(1)}%`, name]} />
                    <Legend wrapperStyle={LEG} />
                    <Area type="monotone" dataKey="v3" name="Uniswap v3" stackId="1" stroke="#e91e8c" fill="#e91e8c30" strokeWidth={1.5} />
                    <Area type="monotone" dataKey="v2" name="Uniswap v2" stackId="1" stroke="#8b5cf6" fill="#8b5cf630" strokeWidth={1.5} />
                    <Area type="monotone" dataKey="sushi" name="SushiSwap" stackId="1" stroke="#f97316" fill="#f9731630" strokeWidth={1.5} />
                    <Area type="monotone" dataKey="curve" name="Curve" stackId="1" stroke="#10b981" fill="#10b98130" strokeWidth={1.5} />
                    <Area type="monotone" dataKey="dodo" name="DODO" stackId="1" stroke="#eab308" fill="#eab30830" strokeWidth={1.5} />
                  </AreaChart>
                </ResponsiveContainer>
              </Card>
            </div>
            <DonutCard
              tc={tc}
              title="Protocol Split"
              sub="all-time"
              data={protoPie}
              total={protoTot}
              tooltip="All-time distribution of sandwich transactions across DEX protocols."
            />
          </div>

          {/* victim addresses + blocks % */}
          <div className="grid gap-5 lg:grid-cols-2">
            <Card
              tc={tc}
              title="Sandwiched DEX Trading Addresses"
              sub="ethereum, Weekly (unique victim txs)"
              tooltip="Weekly count of unique victim transactions. Indicates the number of retail/institutional traders affected."
            >
              {weeklyData.some((r) => r.victims > 0) ? (
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={weeklyData}>
                    <defs>
                      <linearGradient id="gvic" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#f87171" stopOpacity={0.5} />
                        <stop offset="100%" stopColor="#f87171" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={tc.grid} />
                    <XAxis dataKey="week" tick={TICK} tickLine={false} />
                    <YAxis tick={TICK} tickLine={false} axisLine={false} tickFormatter={fmtK} />
                    <Tooltip {...TIP} formatter={(v: number) => [fmtK(v), "Unique victim txs"]} />
                    <Area type="monotone" dataKey="victims" name="Victim Txs" stroke="#f87171" fill="url(#gvic)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : <EmptyState tc={tc} msg="Available after backfill" />}
            </Card>

            <Card
              tc={tc}
              title="Portion of Blocks with Sandwich Trades"
              sub="ethereum, % weekly"
              tooltip="Weekly percentage of Ethereum blocks containing at least one sandwich trade."
            >
              {blkData.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={blkData}>
                    <CartesianGrid strokeDasharray="3 3" stroke={tc.grid} />
                    <XAxis dataKey="week" tick={TICK} tickLine={false} />
                    <YAxis tick={TICK} tickLine={false} axisLine={false} domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                    <Tooltip
                      {...TIP}
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      formatter={(v: number, name: string, entry: any) =>
                        name === "Sandwich"
                          ? [`${v}%  (${fmt(entry.payload?.sw ?? 0)} / ${fmt(entry.payload?.total ?? 0)} blocks)`, "Blocks w/ sandwich"]
                          : [`${v}%`, "Other blocks"]
                      }
                    />
                    <Legend wrapperStyle={LEG} />
                    <Area type="monotone" dataKey="other" name="Other" stackId="1" stroke="#10b981" fill="#10b98125" strokeWidth={1} />
                    <Area type="monotone" dataKey="sandwich" name="Sandwich" stackId="1" stroke="#f43f5e" fill="#f43f5e55" strokeWidth={1.5} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : <EmptyState tc={tc} />}
            </Card>
          </div>

          {/* bots weekly + USD */}
          <div className="grid gap-5 lg:grid-cols-3">
            <Card
              tc={tc}
              title="Sandwich Bots"
              sub="ethereum, Weekly (active bots)"
              tooltip="Weekly count of unique, active sandwich bot contracts executing trades."
            >
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={weeklyData} barSize={10}>
                  <CartesianGrid strokeDasharray="3 3" stroke={tc.grid} />
                  <XAxis dataKey="week" tick={TICK} tickLine={false} />
                  <YAxis tick={TICK} tickLine={false} axisLine={false} />
                  <Tooltip {...TIP} />
                  <Bar dataKey="bots" name="Active Bots" fill="#818cf8" radius={0} />
                </BarChart>
              </ResponsiveContainer>
            </Card>

            <Card
              tc={tc}
              title="Weekly Bot Profits & Gas (USD)"
              sub="estimated gross profit vs gas costs"
              tooltip="Weekly breakdown of estimated bot net profits (cyan) vs. gas costs (orange). The total height of each bar represents the estimated gross revenue."
            >
              {weeklyData.some((r) => r.bot_profit_usd > 0) ? (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={weeklyData} barSize={10}>
                    <CartesianGrid strokeDasharray="3 3" stroke={tc.grid} />
                    <XAxis dataKey="week" tick={TICK} tickLine={false} />
                    <YAxis tick={TICK} tickLine={false} axisLine={false} tickFormatter={fmtUsd} />
                    <Tooltip {...TIP} formatter={(v: number, name: string) => [fmtUsd(v), name]} />
                    <Legend wrapperStyle={LEG} />
                    <Bar dataKey="bot_net_profit_usd" name="Net Profit" stackId="a" fill="#06b6d4" radius={0} />
                    <Bar dataKey="bot_gas_usd" name="Gas Cost" stackId="a" fill="#f97316" radius={0} />
                  </BarChart>
                </ResponsiveContainer>
              ) : <EmptyState tc={tc} msg="No profit data yet" />}
            </Card>

            <Card
              tc={tc}
              title="Weekly Victim Volume (USD)"
              sub={weeklyData.some(r => r.usd > 0) ? "USDC/USDT/DAI/WETH pairs" : "Populates as backfill completes"}
              tooltip="Weekly estimate of the total USD volume of victim trades that were sandwiched (only includes priced pairs)."
            >
              {weeklyData.some((r) => r.usd > 0) ? (
                <>
                  <p className={`mb-2 text-xs font-mono opacity-60 ${tc.faint}`}>
                    {weeklyData.length > 0 ? weeklyData[weeklyData.length - 1].usdPct : 0}% priced in latest week
                  </p>
                  <ResponsiveContainer width="100%" height={170}>
                    <BarChart data={weeklyData} barSize={10}>
                      <CartesianGrid strokeDasharray="3 3" stroke={tc.grid} />
                      <XAxis dataKey="week" tick={TICK} tickLine={false} />
                      <YAxis tick={TICK} tickLine={false} axisLine={false} tickFormatter={fmtUsd} />
                      <Tooltip {...TIP} formatter={(v: number) => [fmtUsd(v), "Victim Volume"]} />
                      <Bar dataKey="usd" name="Victim USD" fill="#34d399" radius={0} />
                    </BarChart>
                  </ResponsiveContainer>
                </>
              ) : <EmptyState tc={tc} msg="No USD data yet" />}
            </Card>
          </div>
        </div>
      )}

      {/* ╔══════════════════════ TOKENS ════════════════════════════════╗ */}
      {tab === "tokens" && (
        <div className="grid gap-5 lg:grid-cols-3">
          <DonutCard
            tc={tc}
            title="Sandwiched Tokens"
            sub="ethereum, Top 12"
            data={tokensPie}
            total={tokensTot}
            tooltip="Distribution of sandwich transactions across the top 12 targeted ERC-20 tokens."
          />
          <div className="lg:col-span-2">
            <TableShell
              tc={tc} title="Sandwiched Tokens" sub="ethereum — token appears in either leg of the sandwich"
              head={
                <>
                  <th className="px-4 py-3 text-left w-8">#</th>
                  <th className="px-4 py-3 text-left">Token</th>
                  <th className="px-4 py-3 text-right">Sandwiches</th>
                  <th className="px-4 py-3 text-right">Share</th>
                  <th className="px-4 py-3 text-right">Victims</th>
                  <th className="px-4 py-3 text-right">Bots</th>
                </>
              }
            >
              {tokens.map((t, i) => (
                <tr key={t.token} className={`border-b ${tc.tableBorder} ${tc.tableRow} transition-colors font-mono text-xs`}>
                  <td className={`px-4 py-2.5 tabular-nums ${tc.veryFaint}`}>{i + 1}</td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-none flex-shrink-0" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                      <span className={`font-bold ${tc.text}`}>{tokenSymbol(t.token)}</span>
                      <span className={`text-[10px] ${tc.faint}`}>{short(t.token)}</span>
                    </div>
                  </td>
                  <td className={`px-4 py-2.5 text-right tabular-nums font-bold ${tc.text}`}>{fmt(t.sandwiches)}</td>
                  <td className={`px-4 py-2.5 text-right tabular-nums ${tc.muted}`}>{((Number(t.sandwiches) / tokensTot) * 100).toFixed(1)}%</td>
                  <td className={`px-4 py-2.5 text-right tabular-nums ${tc.muted}`}>{fmt(t.unique_victims)}</td>
                  <td className={`px-4 py-2.5 text-right tabular-nums ${tc.muted}`}>{fmt(t.unique_bots)}</td>
                </tr>
              ))}
            </TableShell>
          </div>
        </div>
      )}

      {/* ╔══════════════════════ PAIRS ═════════════════════════════════╗ */}
      {tab === "pairs" && (
        <div className="grid gap-5 lg:grid-cols-3">
          <DonutCard
            tc={tc}
            title="Sandwiched Token Pairs"
            sub="ethereum, Top 12"
            data={pairsPie}
            total={pairsTot}
            tooltip="Distribution of sandwich transactions across the top 12 targeted token pairs."
          />
          <div className="lg:col-span-2">
            <TableShell
              tc={tc} title="Sandwiched Token Pairs" sub="ethereum · 74.7% pool coverage (post-Dencun factory events)"
              head={
                <>
                  <th className="px-4 py-3 text-left w-8">#</th>
                  <th className="px-4 py-3 text-left">Token Pair</th>
                  <th className="px-4 py-3 text-left">DEX</th>
                  <th className="px-4 py-3 text-right">Sandwiches</th>
                  <th className="px-4 py-3 text-right">Share</th>
                  <th className="px-4 py-3 text-right">Victim Vol</th>
                  <th className="px-4 py-3 text-right">Bot Profits</th>
                  <th className="px-4 py-3 text-right">Victims</th>
                  <th className="px-4 py-3 text-right">Bots</th>
                </>
              }
            >
              {pairs.map((p, i) => {
                const tot = pairs.reduce((s, r) => s + Number(r.sandwiches), 0) || 1;
                return (
                  <tr key={`${p.token0}-${p.token1}-${i}`} className={`border-b ${tc.tableBorder} ${tc.tableRow} transition-colors font-mono text-xs`}>
                    <td className={`px-4 py-2.5 tabular-nums ${tc.veryFaint}`}>{i + 1}</td>
                    <td className={`px-4 py-2.5 font-bold ${tc.text}`}>{tokenSymbol(p.token0)}/{tokenSymbol(p.token1)}</td>
                    <td className="px-4 py-2.5"><Proto p={p.protocol} isDark={isDark} /></td>
                    <td className={`px-4 py-2.5 text-right tabular-nums font-bold ${tc.text}`}>{fmt(p.sandwiches)}</td>
                    <td className={`px-4 py-2.5 text-right tabular-nums ${tc.muted}`}>{((Number(p.sandwiches) / tot) * 100).toFixed(1)}%</td>
                    <td className="px-4 py-2.5 text-right tabular-nums font-bold text-emerald-500">{fmtUsd(p.victim_usd_total)}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums font-bold text-cyan-400">{fmtUsd(p.bot_profit_usd)}</td>
                    <td className={`px-4 py-2.5 text-right tabular-nums ${tc.muted}`}>{fmt(p.unique_victims)}</td>
                    <td className={`px-4 py-2.5 text-right tabular-nums ${tc.muted}`}>{fmt(p.unique_bots)}</td>
                  </tr>
                );
              })}
            </TableShell>
          </div>
        </div>
      )}

      {/* ╔══════════════════════ BOTS ══════════════════════════════════╗ */}
      {tab === "bots" && (
        <div className="space-y-5">
          <Card
            tc={tc}
            title="Active Sandwich Bots"
            sub="ethereum, Weekly"
            tooltip="Weekly count of unique, active sandwich bot contracts executing trades."
          >
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={weeklyData} barSize={14}>
                <CartesianGrid strokeDasharray="3 3" stroke={tc.grid} />
                <XAxis dataKey="week" tick={TICK} tickLine={false} />
                <YAxis tick={TICK} tickLine={false} axisLine={false} />
                <Tooltip {...TIP} />
                <Bar dataKey="bots" name="Active Bots" fill="#818cf8" radius={0} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
          <TableShell
            tc={tc} title="Top Sandwich Bots" sub="ethereum, all-time, ranked by sandwich count"
            head={
              <>
                <th className="px-4 py-3 text-left w-8">#</th>
                <th className="px-4 py-3 text-left">Address</th>
                <th className="px-4 py-3 text-right">Sandwiches</th>
                <th className="px-4 py-3 text-right">Victims</th>
                <th className="px-4 py-3 text-right">Gross Profit</th>
                <th className="px-4 py-3 text-right">Gas Cost</th>
                <th className="px-4 py-3 text-right">Net Profit</th>
                <th className="px-4 py-3 text-right">Pools</th>
                <th className="px-4 py-3 text-right">Active Range</th>
              </>
            }
          >
            {bots.map((b, i) => (
              <tr key={b.sandwicher} className={`border-b ${tc.tableBorder} ${tc.tableRow} transition-colors font-mono text-xs`}>
                <td className={`px-4 py-2.5 tabular-nums ${tc.veryFaint}`}>{i + 1}</td>
                <td className="px-4 py-2.5">
                  <a href={ethAddr(b.sandwicher)} target="_blank" rel="noopener noreferrer" className="text-pink-500 hover:text-pink-400 font-bold transition-colors">
                    {short(b.sandwicher)}
                  </a>
                </td>
                <td className={`px-4 py-2.5 text-right tabular-nums font-bold ${tc.text}`}>{fmt(b.sandwiches)}</td>
                <td className={`px-4 py-2.5 text-right tabular-nums ${tc.muted}`}>{fmt(b.unique_victims)}</td>
                <td className="px-4 py-2.5 text-right tabular-nums font-bold text-emerald-500">{fmtUsd(b.total_profit_usd)}</td>
                <td className="px-4 py-2.5 text-right tabular-nums font-bold text-orange-500">{fmtUsd(b.total_gas_cost_usd)}</td>
                <td className={`px-4 py-2.5 text-right tabular-nums font-bold ${Number(b.net_profit_usd) >= 0 ? "text-cyan-400" : "text-red-400"}`}>{fmtUsd(b.net_profit_usd)}</td>
                <td className={`px-4 py-2.5 text-right tabular-nums ${tc.muted}`}>{fmt(b.unique_pools)}</td>
                <td className={`px-4 py-2.5 text-right tabular-nums ${tc.faint}`}>{fmt(b.first_seen_block)} → {fmt(b.last_seen_block)}</td>
              </tr>
            ))}
          </TableShell>
        </div>
      )}

      {/* ╔══════════════════════ POOLS ═════════════════════════════════╗ */}
      {tab === "pools" && (
        <div className="grid gap-5 lg:grid-cols-3">
          <Card
            tc={tc}
            title="Top Pools by Sandwiches"
            sub="DEX pools ranked by sandwich count"
            tooltip="DEX pools ranked by the total number of sandwich transactions executed in them."
          >
            {pools.length > 0 ? (
              <ResponsiveContainer width="100%" height={380}>
                <BarChart
                  data={pools.slice(0, 10).map((p) => ({
                    name: p.token0 && p.token1 ? `${tokenSymbol(p.token0)}/${tokenSymbol(p.token1)}` : short(p.pool),
                    sandwiches: Number(p.sandwiches),
                  }))}
                  layout="vertical"
                  barSize={12}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke={tc.grid} />
                  <XAxis type="number" tick={TICK} tickLine={false} axisLine={false} />
                  <YAxis type="category" dataKey="name" tick={TICK} tickLine={false} width={90} />
                  <Tooltip {...TIP} formatter={(v: number) => [fmt(v), "Sandwiches"]} />
                  <Bar dataKey="sandwiches" fill="#e91e8c" radius={0} />
                </BarChart>
              </ResponsiveContainer>
            ) : <EmptyState tc={tc} />}
          </Card>
          <div className="lg:col-span-2">
            <TableShell
              tc={tc} title="Top Sandwiched Pools" sub="ethereum, all-time, ranked by sandwich count"
              head={
                <>
                  <th className="px-4 py-3 text-left w-8">#</th>
                  <th className="px-4 py-3 text-left">Pool</th>
                  <th className="px-4 py-3 text-left">Pair</th>
                  <th className="px-4 py-3 text-left">DEX</th>
                  <th className="px-4 py-3 text-right">Sandwiches</th>
                  <th className="px-4 py-3 text-right">Bot Profits</th>
                  <th className="px-4 py-3 text-right">Victims</th>
                  <th className="px-4 py-3 text-right">Bots</th>
                </>
              }
            >
              {pools.map((p, i) => (
                <tr key={p.pool} className={`border-b ${tc.tableBorder} ${tc.tableRow} transition-colors font-mono text-xs`}>
                  <td className={`px-4 py-2.5 tabular-nums ${tc.veryFaint}`}>{i + 1}</td>
                  <td className="px-4 py-2.5">
                    <a href={ethAddr(p.pool)} target="_blank" rel="noopener noreferrer" className={`${tc.muted} hover:text-pink-500 transition-colors font-bold`}>{short(p.pool)}</a>
                  </td>
                  <td className={`px-4 py-2.5 font-bold ${tc.text}`}>
                    {p.token0 && p.token1
                      ? `${tokenSymbol(p.token0)}/${tokenSymbol(p.token1)}`
                      : <span className={tc.veryFaint}>unknown</span>}
                  </td>
                  <td className="px-4 py-2.5"><Proto p={p.protocol} isDark={isDark} /></td>
                  <td className={`px-4 py-2.5 text-right tabular-nums font-bold ${tc.text}`}>{fmt(p.sandwiches)}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums font-bold text-cyan-400">{fmtUsd(p.bot_profit_usd)}</td>
                  <td className={`px-4 py-2.5 text-right tabular-nums ${tc.muted}`}>{fmt(p.unique_victims)}</td>
                  <td className={`px-4 py-2.5 text-right tabular-nums ${tc.muted}`}>{fmt(p.unique_bots)}</td>
                </tr>
              ))}
            </TableShell>
          </div>
        </div>
      )}

      {/* ╔══════════════════════ LIVE FEED ═════════════════════════════╗ */}
      {tab === "recent" && (
        <TableShell
          tc={tc} title="Live Sandwich Feed" sub="50 most recent · auto-refreshes every 30s"
          head={
            <>
              <th className="px-3 py-3 text-left">Block</th>
              <th className="px-3 py-3 text-left">Bot</th>
              <th className="px-3 py-3 text-left">Pair</th>
              <th className="px-3 py-3 text-left">DEX</th>
              <th className="px-3 py-3 text-right">Victim $</th>
              <th className="px-3 py-3 text-right">Bot Profit</th>
              <th className="px-3 py-3 text-right">Gas Cost</th>
              <th className="px-3 py-3 text-left">Frontrun</th>
              <th className="px-3 py-3 text-left">Victim</th>
              <th className="px-3 py-3 text-left">Backrun</th>
            </>
          }
        >
          {recent.map((r, i) => (
            <tr key={`${r.frontrun_tx}-${i}`} className={`border-b ${tc.tableBorder} ${tc.tableRow} transition-colors text-xs font-mono`}>
              <td className={`px-3 py-2.5 tabular-nums ${tc.muted}`}>{fmt(r.block_number)}</td>
              <td className="px-3 py-2.5">
                <a href={ethAddr(r.sandwicher)} target="_blank" rel="noopener noreferrer" className="text-pink-500 hover:text-pink-400 font-bold">{short(r.sandwicher)}</a>
              </td>
              <td className={`px-3 py-2.5 font-bold ${tc.text}`}>
                {r.token0 && r.token1 ? `${tokenSymbol(r.token0)}/${tokenSymbol(r.token1)}` : short(r.pool)}
              </td>
              <td className="px-3 py-2.5"><Proto p={r.protocol} isDark={isDark} /></td>
              <td className="px-3 py-2.5 text-right tabular-nums">
                {Number(r.victim_usd) > 0
                  ? <span className="text-emerald-500 font-bold">{fmtUsd(r.victim_usd)}</span>
                  : <span className={tc.veryFaint}>—</span>}
              </td>
              <td className="px-3 py-2.5 text-right tabular-nums">
                {Number(r.bot_profit_usd) > 0
                  ? <span className="text-cyan-400 font-bold">{fmtUsd(r.bot_profit_usd)}</span>
                  : <span className={tc.veryFaint}>—</span>}
              </td>
              <td className="px-3 py-2.5 text-right tabular-nums">
                {Number(r.gas_cost_usd) > 0
                  ? <span className="text-orange-500 font-bold">{fmtUsd(r.gas_cost_usd)}</span>
                  : <span className={tc.veryFaint}>—</span>}
              </td>
              <td className="px-3 py-2.5">
                <a href={ethTx(r.frontrun_tx)} target="_blank" rel="noopener noreferrer" className="text-green-500 hover:text-green-400 font-bold">
                  {short(r.frontrun_tx)}<span className={`ml-0.5 text-[10px] ${tc.veryFaint}`}>#{r.frontrun_idx}</span>
                </a>
              </td>
              <td className="px-3 py-2.5">
                <a href={ethTx(r.victim_tx)} target="_blank" rel="noopener noreferrer" className="text-yellow-500 hover:text-yellow-400 font-bold">
                  {short(r.victim_tx)}<span className={`ml-0.5 text-[10px] ${tc.veryFaint}`}>#{r.victim_idx}</span>
                </a>
              </td>
              <td className="px-3 py-2.5">
                <a href={ethTx(r.backrun_tx)} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:text-blue-400 font-bold">
                  {short(r.backrun_tx)}<span className={`ml-0.5 text-[10px] ${tc.veryFaint}`}>#{r.backrun_idx}</span>
                </a>
              </td>
            </tr>
          ))}
        </TableShell>
      )}
    </div>
  );
}
