"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

/* ─── types ─────────────────────────────────────────────── */
interface MevStats {
  total_sandwiches: string;
  unique_victims: string;
  unique_bots: string;
  unique_pools: string;
  first_block: string;
  last_block: string;
}
interface WeeklyRow {
  week: string;
  sandwiches: string;
  victims: string;
  bots: string;
  v3_count: string;
  v2_count: string;
}
interface BotRow {
  sandwicher: string;
  sandwiches: string;
  unique_victims: string;
  unique_pools: string;
}
interface PoolRow {
  pool: string;
  protocol: string;
  sandwiches: string;
  unique_victims: string;
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
function short(addr: string) {
  return addr ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : "—";
}
function etherscanTx(tx: string) {
  return `https://etherscan.io/tx/${tx}`;
}
function etherscanAddr(addr: string) {
  return `https://etherscan.io/address/${addr}`;
}
function etherscanDex(pool: string) {
  return `https://app.uniswap.org/explore/pools/ethereum/${pool}`;
}

/* ─── stat card ──────────────────────────────────────────── */
function StatCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 px-5 py-4">
      <p className="text-xs font-medium text-white/50 uppercase tracking-wide">
        {label}
      </p>
      <p className="mt-1 text-2xl font-bold text-white">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-white/40">{sub}</p>}
    </div>
  );
}

/* ─── protocol badge ─────────────────────────────────────── */
function ProtoBadge({ proto }: { proto: string }) {
  const color =
    proto === "uniswap_v3"
      ? "text-pink-400 bg-pink-400/10"
      : proto === "uniswap_v2"
      ? "text-purple-400 bg-purple-400/10"
      : "text-white/50 bg-white/5";
  return (
    <span className={`rounded px-2 py-0.5 text-xs font-medium ${color}`}>
      {proto.replace("uniswap_", "Uni-")}
    </span>
  );
}

/* ─── main component ─────────────────────────────────────── */
export default function MevClient() {
  const [stats, setStats] = useState<MevStats | null>(null);
  const [weekly, setWeekly] = useState<WeeklyRow[]>([]);
  const [bots, setBots] = useState<BotRow[]>([]);
  const [pools, setPools] = useState<PoolRow[]>([]);
  const [recent, setRecent] = useState<RecentRow[]>([]);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<
    "overview" | "bots" | "pools" | "recent"
  >("overview");

  const load = useCallback(async () => {
    try {
      const [s, w, b, p, r, prog] = await Promise.all([
        get<MevStats>("stats"),
        get<WeeklyRow[]>("weekly-trend", "&weeks=12"),
        get<BotRow[]>("top-bots", "&limit=20"),
        get<PoolRow[]>("top-pools", "&limit=20"),
        get<RecentRow[]>("recent", "&limit=50"),
        get<Progress>("backfill-progress"),
      ]);
      setStats(s);
      setWeekly(w);
      setBots(b);
      setPools(p);
      setRecent(r);
      setProgress(prog);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const iv = setInterval(load, 30_000);
    return () => clearInterval(iv);
  }, [load]);

  /* ── backfill progress bar ─────────────────────────────── */
  const pct = progress
    ? Math.min(
        100,
        Math.floor(
          ((Number(progress.last_block) - progress.dencun_start) /
            (Number(stats?.last_block ?? progress.last_block) -
              progress.dencun_start)) *
            100
        )
      )
    : 0;
  const backfilling = progress
    ? Number(progress.last_block) < Number(stats?.last_block ?? "0") - 5000
    : false;

  if (loading)
    return (
      <div className="flex h-64 items-center justify-center text-white/50">
        Loading MEV data…
      </div>
    );
  if (error)
    return (
      <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-6 text-red-400">
        {error}
      </div>
    );

  /* ── weekly chart data ─────────────────────────────────── */
  const weeklyAgg: Record<
    string,
    { week: string; v2: number; v3: number; total: number }
  > = {};
  for (const row of weekly) {
    const d = new Date(row.week).toLocaleDateString("en", {
      month: "short",
      day: "numeric",
    });
    if (!weeklyAgg[d])
      weeklyAgg[d] = { week: d, v2: 0, v3: 0, total: 0 };
    weeklyAgg[d].v2 += Number(row.v2_count);
    weeklyAgg[d].v3 += Number(row.v3_count);
    weeklyAgg[d].total += Number(row.sandwiches);
  }
  const weeklyData = Object.values(weeklyAgg);

  const TABS = [
    { id: "overview", label: "Overview" },
    { id: "bots", label: "Top Bots" },
    { id: "pools", label: "Top Pools" },
    { id: "recent", label: "Recent" },
  ] as const;

  return (
    <div className="space-y-6">
      {/* backfill banner */}
      {backfilling && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-5 py-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-amber-300 font-medium">
              Historical backfill in progress
            </span>
            <span className="text-amber-400/70">
              Block {fmt(progress!.last_block)} /{" "}
              {fmt(stats?.last_block ?? "")} — {pct}%
            </span>
          </div>
          <div className="mt-2 h-1.5 rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-amber-400 transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="mt-1.5 text-xs text-amber-400/60">
            {fmt(progress!.total_sandwiches)} sandwiches detected so far
          </p>
        </div>
      )}

      {/* stat cards */}
      {stats && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard
            label="Total Sandwiches"
            value={fmt(stats.total_sandwiches)}
            sub="since Dencun"
          />
          <StatCard
            label="Unique Victims"
            value={fmt(stats.unique_victims)}
          />
          <StatCard label="MEV Bots" value={fmt(stats.unique_bots)} />
          <StatCard
            label="Sandwiched Pools"
            value={fmt(stats.unique_pools)}
          />
        </div>
      )}

      {/* tabs */}
      <div className="flex gap-2 border-b border-white/10 pb-0">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`px-4 py-2 text-sm font-medium rounded-t transition-colors ${
              activeTab === t.id
                ? "text-white border-b-2 border-pink-400"
                : "text-white/50 hover:text-white/80"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Overview tab ─────────────────────────────────── */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          <div className="rounded-xl border border-white/10 bg-white/5 p-5">
            <h3 className="mb-4 text-sm font-semibold text-white/70 uppercase tracking-wide">
              Weekly Sandwich Count (12 weeks)
            </h3>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={weeklyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff15" />
                <XAxis
                  dataKey="week"
                  tick={{ fill: "#ffffff60", fontSize: 11 }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: "#ffffff60", fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  contentStyle={{
                    background: "#1a1a2e",
                    border: "1px solid #ffffff20",
                    borderRadius: 8,
                    color: "#fff",
                  }}
                />
                <Legend wrapperStyle={{ color: "#ffffff90", fontSize: 12 }} />
                <Bar
                  dataKey="v3"
                  name="Uniswap v3"
                  stackId="a"
                  fill="#f472b6"
                />
                <Bar
                  dataKey="v2"
                  name="Uniswap v2"
                  stackId="a"
                  fill="#a78bfa"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/5 p-5">
            <h3 className="mb-4 text-sm font-semibold text-white/70 uppercase tracking-wide">
              Unique Bots Active per Week
            </h3>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={weeklyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff15" />
                <XAxis
                  dataKey="week"
                  tick={{ fill: "#ffffff60", fontSize: 11 }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: "#ffffff60", fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  contentStyle={{
                    background: "#1a1a2e",
                    border: "1px solid #ffffff20",
                    borderRadius: 8,
                    color: "#fff",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="total"
                  name="Sandwiches"
                  stroke="#34d399"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* ── Top Bots tab ─────────────────────────────────── */}
      {activeTab === "bots" && (
        <div className="rounded-xl border border-white/10 bg-white/5 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 text-white/50 text-xs uppercase">
                <th className="px-4 py-3 text-left">#</th>
                <th className="px-4 py-3 text-left">Address</th>
                <th className="px-4 py-3 text-right">Sandwiches</th>
                <th className="px-4 py-3 text-right">Victims</th>
                <th className="px-4 py-3 text-right">Pools</th>
                <th className="px-4 py-3 text-right">Etherscan</th>
              </tr>
            </thead>
            <tbody>
              {bots.map((b, i) => (
                <tr
                  key={b.sandwicher}
                  className="border-b border-white/5 hover:bg-white/5 transition-colors"
                >
                  <td className="px-4 py-3 text-white/30 tabular-nums">
                    {i + 1}
                  </td>
                  <td className="px-4 py-3 font-mono text-white/80">
                    <a
                      href={etherscanAddr(b.sandwicher)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-pink-400 transition-colors"
                    >
                      {short(b.sandwicher)}
                    </a>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-white">
                    {fmt(b.sandwiches)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-white/70">
                    {fmt(b.unique_victims)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-white/70">
                    {fmt(b.unique_pools)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <a
                      href={etherscanAddr(b.sandwicher)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-white/40 hover:text-white/80 transition-colors"
                    >
                      ↗
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Top Pools tab ────────────────────────────────── */}
      {activeTab === "pools" && (
        <div className="rounded-xl border border-white/10 bg-white/5 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 text-white/50 text-xs uppercase">
                <th className="px-4 py-3 text-left">#</th>
                <th className="px-4 py-3 text-left">Pool</th>
                <th className="px-4 py-3 text-left">Protocol</th>
                <th className="px-4 py-3 text-right">Sandwiches</th>
                <th className="px-4 py-3 text-right">Victims</th>
                <th className="px-4 py-3 text-right">Bots</th>
                <th className="px-4 py-3 text-right">Uniswap</th>
              </tr>
            </thead>
            <tbody>
              {pools.map((p, i) => (
                <tr
                  key={p.pool}
                  className="border-b border-white/5 hover:bg-white/5 transition-colors"
                >
                  <td className="px-4 py-3 text-white/30 tabular-nums">
                    {i + 1}
                  </td>
                  <td className="px-4 py-3 font-mono text-white/80">
                    <a
                      href={etherscanAddr(p.pool)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-pink-400 transition-colors"
                    >
                      {short(p.pool)}
                    </a>
                  </td>
                  <td className="px-4 py-3">
                    <ProtoBadge proto={p.protocol} />
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-white">
                    {fmt(p.sandwiches)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-white/70">
                    {fmt(p.unique_victims)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-white/70">
                    {fmt(p.unique_bots)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <a
                      href={etherscanDex(p.pool)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-white/40 hover:text-white/80 transition-colors"
                    >
                      ↗
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Recent tab ──────────────────────────────────── */}
      {activeTab === "recent" && (
        <div className="rounded-xl border border-white/10 bg-white/5 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 text-white/50 text-xs uppercase">
                <th className="px-4 py-3 text-left">Block</th>
                <th className="px-4 py-3 text-left">Bot</th>
                <th className="px-4 py-3 text-left">Pool</th>
                <th className="px-4 py-3 text-left">Proto</th>
                <th className="px-4 py-3 text-left">Frontrun</th>
                <th className="px-4 py-3 text-left">Victim</th>
                <th className="px-4 py-3 text-left">Backrun</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((r, i) => (
                <tr
                  key={`${r.frontrun_tx}-${i}`}
                  className="border-b border-white/5 hover:bg-white/5 transition-colors"
                >
                  <td className="px-4 py-2 tabular-nums text-white/70">
                    {fmt(r.block_number)}
                  </td>
                  <td className="px-4 py-2 font-mono">
                    <a
                      href={etherscanAddr(r.sandwicher)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-red-400 hover:text-red-300 transition-colors"
                    >
                      {short(r.sandwicher)}
                    </a>
                  </td>
                  <td className="px-4 py-2 font-mono text-white/60">
                    <a
                      href={etherscanAddr(r.pool)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-white/90 transition-colors"
                    >
                      {short(r.pool)}
                    </a>
                  </td>
                  <td className="px-4 py-2">
                    <ProtoBadge proto={r.protocol} />
                  </td>
                  <td className="px-4 py-2 font-mono">
                    <a
                      href={etherscanTx(r.frontrun_tx)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-green-400 hover:text-green-300 transition-colors"
                    >
                      {short(r.frontrun_tx)} #{r.frontrun_idx}
                    </a>
                  </td>
                  <td className="px-4 py-2 font-mono">
                    <a
                      href={etherscanTx(r.victim_tx)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-yellow-400 hover:text-yellow-300 transition-colors"
                    >
                      {short(r.victim_tx)} #{r.victim_idx}
                    </a>
                  </td>
                  <td className="px-4 py-2 font-mono">
                    <a
                      href={etherscanTx(r.backrun_tx)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 hover:text-blue-300 transition-colors"
                    >
                      {short(r.backrun_tx)} #{r.backrun_idx}
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
