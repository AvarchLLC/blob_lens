"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import { useTheme } from "next-themes";
import { RefreshCw, Trophy, ArrowUpDown, ExternalLink } from "lucide-react";
import { TimeRangePicker, type DateRangeState } from "@/components/shared/time-range-picker";
import { DottedCard } from "@/components/ui/dotted-card";
import { EChartWrapper } from "@/components/charts/echart-wrapper";
import { getL2IconPath } from "@/lib/l2-icons";
import Image from "next/image";
import Link from "next/link";
import type { EChartsOption } from "echarts";

function ttBase(dark: boolean) {
  const bg     = dark ? "#121217" : "#FFFFFF";
  const border = dark ? "#3A3275" : "#CBC4FA";
  return {
    confine: true,
    backgroundColor: bg,
    borderColor: border,
    borderWidth: 1,
    padding: [8, 12],
    textStyle: { color: dark ? "#F4F4F8" : "#1A1A24", fontFamily: "Geist Mono, monospace", fontSize: 11 },
    extraCssText: `background:${bg}!important;border:1px solid ${border}!important;border-radius:4px;box-shadow:0 4px 20px rgba(0,0,0,${dark ? "0.45" : "0.12"});`,
  };
}

function SectionLabel({ label, icon: Icon, id }: { label: string; icon?: React.ElementType; id?: string }) {
  return (
    <div id={id} className="flex items-center gap-3 mt-1 scroll-mt-24">
      <span className="inline-flex items-center gap-1.5 text-[10px] font-mono font-bold tracking-widest text-[var(--primary-text)] bg-[var(--primary-bg)] border border-[var(--primary-border)] px-2 py-0.5 rounded-[3px] uppercase whitespace-nowrap">
        {Icon && <Icon className="w-3 h-3" />}
        [ {label} ]
      </span>
      <div className="flex-1 border-t border-dashed border-[var(--border)]" />
    </div>
  );
}

function RollupIcon({ name, color, size = 20 }: { name: string; color: string; size?: number }) {
  const src = getL2IconPath(name);
  if (src) return (
    <Image src={src} alt={name} width={size} height={size}
      className="rounded-[3px] shrink-0"
      style={{ width: size, height: size, objectFit: "contain" }}
      onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
    />
  );
  return (
    <div className="rounded-[3px] shrink-0 flex items-center justify-center font-mono font-bold text-[9px] text-white"
      style={{ width: size, height: size, backgroundColor: color }}>
      {name.slice(0, 2).toUpperCase()}
    </div>
  );
}

// ── Mini sparkline (pure SVG) ─────────────────────────────────────────────
function Sparkline({ data, color }: { data: number[]; color: string }) {
  if (!data.length) return null;
  const max = Math.max(...data); const min = Math.min(...data);
  const range = max - min || 1;
  const W = 56; const H = 20;
  const pts = data.map((v, i) => [
    (i / (data.length - 1)) * W,
    H - ((v - min) / range) * H,
  ]);
  const d = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(" ");
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="shrink-0">
      <path d={d} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}

// ── Score badge ───────────────────────────────────────────────────────────
function ScoreBadge({ val }: { val: number }) {
  const color = val >= 80 ? "#059669" : val >= 60 ? "#D97706" : "#DC2626";
  const bg    = val >= 80 ? "rgba(5,150,105,0.12)" : val >= 60 ? "rgba(217,119,6,0.12)" : "rgba(220,38,38,0.12)";
  return (
    <span className="inline-flex items-center font-mono font-bold text-[11px] px-1.5 py-0.5 rounded-[3px]"
      style={{ color, backgroundColor: bg }}>
      {val}
    </span>
  );
}

type SortKey = "rank" | "blobs" | "efficiency_score" | "packing_score" | "timing_score" | "cost_per_blob_gwei" | "blob_fullness_pct";

// ── Main component ────────────────────────────────────────────────────────
export function LeaderboardClient() {
  const { resolvedTheme } = useTheme();
  const dark = resolvedTheme === "dark";

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<DateRangeState>({ preset: "24h" });
  const hours = useMemo(() => {
    if (dateRange.preset === "custom" && dateRange.startDate && dateRange.endDate) {
      const ms = new Date(dateRange.endDate).getTime() - new Date(dateRange.startDate).getTime();
      return String(Math.max(1, Math.round(ms / 3_600_000)));
    }
    if (dateRange.preset === "7d")  return "168";
    if (dateRange.preset === "30d") return "720";
    if (dateRange.preset === "90d") return "2160";
    return "24";
  }, [dateRange]);
  const [sortKey, setSortKey] = useState<SortKey>("rank");
  const [sortAsc, setSortAsc] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try { setData(await (await fetch(`/api/leaderboard?hours=${hours}`)).json()); }
    catch { /* ignore */ }
    finally { setLoading(false); }
  }, [hours]);

  useEffect(() => { loadData(); }, [loadData]);

  const tt = ttBase(dark);

  const rows: any[] = useMemo(() => {
    if (!data?.data) return [];
    const sorted = [...data.data].sort((a: any, b: any) => {
      const av = a[sortKey]; const bv = b[sortKey];
      return sortAsc ? av - bv : bv - av;
    });
    return sorted;
  }, [data, sortKey, sortAsc]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(key === "rank"); }
  }

  // ── Volume donut ─────────────────────────────────────────────────────────
  const donutOption: EChartsOption = useMemo(() => {
    if (!data?.data) return {} as EChartsOption;
    return {
      backgroundColor: "transparent",
      tooltip: { trigger: "item", ...tt, formatter: (p: any) => `<div style="font-family:var(--font-mono);font-size:11px"><strong>${p.name}</strong><br/>${p.data.blobs?.toLocaleString()} blobs &nbsp; <strong style="color:${p.color}">${p.data.share_pct}%</strong></div>` },
      series: [{
        type: "pie", radius: ["40%", "68%"], avoidLabelOverlap: false,
        itemStyle: { borderRadius: 3, borderColor: dark ? "#0D0D14" : "#FFFFFF", borderWidth: 2 },
        label: { show: false },
        data: data.data.map((r: any) => ({ name: r.name, value: r.blobs, blobs: r.blobs, share_pct: r.share_pct, itemStyle: { color: r.color } })),
      }],
    };
  }, [data, dark]);

  // ── Efficiency scatter ────────────────────────────────────────────────────
  const scatterOption: EChartsOption = useMemo(() => {
    if (!data?.data) return {} as EChartsOption;
    return {
      backgroundColor: "transparent",
      tooltip: { trigger: "item", ...tt, formatter: (p: any) => {
        const r = p.data;
        return `<div style="font-family:var(--font-mono);font-size:11px"><strong style="color:${r[4]}">${r[3]}</strong><br/>Packing: <strong>${r[0]}</strong> · Timing: <strong>${r[1]}</strong><br/>Fullness: <strong>${r[2]}%</strong></div>`;
      }},
      grid: { top: 16, right: 20, bottom: 36, left: 10, containLabel: true },
      xAxis: { type: "value", min: 40, max: 100, name: "Packing Score →", nameLocation: "middle", nameGap: 22, nameTextStyle: { color: dark ? "#68687D" : "#9C9CAE", fontSize: 9, fontFamily: "var(--font-mono)" }, axisLabel: { color: dark ? "#68687D" : "#9C9CAE", fontSize: 9, fontFamily: "var(--font-mono)" }, splitLine: { lineStyle: { color: dark ? "#1A1A24" : "#F3F3F7", type: "dashed" } } },
      yAxis: { type: "value", min: 40, max: 100, name: "Timing Score →", nameLocation: "middle", nameGap: 30, nameTextStyle: { color: dark ? "#68687D" : "#9C9CAE", fontSize: 9, fontFamily: "var(--font-mono)" }, axisLabel: { color: dark ? "#68687D" : "#9C9CAE", fontSize: 9, fontFamily: "var(--font-mono)" }, splitLine: { lineStyle: { color: dark ? "#1A1A24" : "#F3F3F7", type: "dashed" } } },
      series: [{
        type: "scatter",
        symbolSize: (d: any) => 8 + (d[2] - 70) * 0.8,
        data: data.data.map((r: any) => [r.packing_score, r.timing_score, r.blob_fullness_pct, r.name, r.color]),
        itemStyle: { color: (p: any) => p.data[4], opacity: 0.85, borderColor: dark ? "#0D0D14" : "#FFFFFF", borderWidth: 1.5 },
        label: { show: true, position: "right", formatter: (p: any) => p.data[3].split(" ")[0], fontSize: 9, fontFamily: "var(--font-mono)", color: dark ? "#68687D" : "#9C9CAE" },
      }],
    };
  }, [data, dark]);

  // ── Table header helper ───────────────────────────────────────────────────
  const TH = ({ col, label }: { col: SortKey; label: string }) => (
    <th onClick={() => toggleSort(col)}
      className="px-3 py-2 text-left text-[9px] font-mono font-bold uppercase tracking-widest text-[var(--text-muted)] cursor-pointer hover:text-[var(--text-primary)] transition-colors whitespace-nowrap select-none">
      <span className="flex items-center gap-1">{label} {sortKey === col && <ArrowUpDown className="w-2.5 h-2.5" />}</span>
    </th>
  );

  return (
    <div className="flex flex-col gap-5 w-full max-w-7xl mx-auto py-2 font-sans">

      {/* ── Header ── */}
      <div className="flex flex-col gap-3 pb-4 border-b border-dashed border-[var(--border)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2 font-mono text-[10px]">
            <span className="px-2 py-0.5 font-bold tracking-widest text-[var(--primary-text)] bg-[var(--primary-bg)] border border-[var(--primary-border)] uppercase rounded-[4px]">
              [ ROLLUP LEADERBOARD ]
            </span>
            <span className="px-2 py-0.5 border border-[var(--border)] rounded-[4px] text-[var(--text-secondary)]">
              DA EFFICIENCY · PACKING · TIMING · COST
            </span>
          </div>
          <button onClick={loadData}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[4px] bg-[var(--surface-sunken)] border border-[var(--border)] text-xs font-mono font-bold text-[var(--text-primary)] hover:border-[var(--primary-border)] transition-all uppercase tracking-wider">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-[var(--primary-text)]" : ""}`} />
            [ SYNC ]
          </button>
        </div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--text-primary)]">
          Rollup DA Performance Rankings
        </h1>
        <p className="max-w-2xl text-xs text-[var(--text-secondary)] leading-relaxed">
          Ranked by composite efficiency score (70% packing · 30% timing). Click any rollup to view its full performance profile.
        </p>
      </div>

      {/* ── KPI + time filter ── */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-3 bg-[var(--surface-sunken)] border border-[var(--border)] rounded-[8px] font-mono text-xs">
        <div className="flex flex-wrap items-center gap-3">
          {[
            { label: "Rollups Tracked", val: data?.data?.length ?? "—" },
            { label: "Total Blobs", val: data?.meta?.total_blobs?.toLocaleString() ?? "—" },
            { label: "Avg Efficiency", val: data?.meta?.avg_eff != null ? `${data.meta.avg_eff}/100` : "—" },
            { label: "Avg Fullness", val: data?.meta?.avg_fullness != null ? `${data.meta.avg_fullness}%` : "—" },
          ].map(({ label, val }) => (
            <div key={label} className="flex flex-col">
              <span className="text-[9px] text-[var(--text-muted)] uppercase tracking-widest">{label}</span>
              <span className="text-sm font-bold text-[var(--text-primary)] tabular-nums">{val}</span>
            </div>
          ))}
        </div>
        <TimeRangePicker value={dateRange} onChange={setDateRange} presets={["24h", "7d", "30d", "custom"]} />
      </div>

      {/* ── Charts row ── */}
      <SectionLabel id="network-overview" label="NETWORK OVERVIEW" icon={Trophy} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <DottedCard title="Blob Volume Share" subtitle="Relative throughput per rollup for the selected window" badge="Share" badgeType="iris" techBracket>
          <div className="flex gap-4">
            <EChartWrapper option={donutOption} style={{ height: "180px", flex: "0 0 160px" }} loading={loading} showFooter={false} />
            <div className="flex flex-col justify-center gap-1.5 overflow-hidden">
              {data?.data?.slice(0, 6).map((r: any) => (
                <div key={r.name} className="flex items-center gap-1.5 text-[10px] font-mono min-w-0">
                  <span className="w-2 h-2 rounded-sm shrink-0" style={{ backgroundColor: r.color }} />
                  <span className="text-[var(--text-secondary)] truncate">{r.name}</span>
                  <span className="ml-auto font-bold text-[var(--text-primary)] tabular-nums shrink-0">{r.share_pct}%</span>
                </div>
              ))}
            </div>
          </div>
        </DottedCard>

        <DottedCard title="Efficiency Scatter — Packing vs Timing" subtitle="Bubble size = blob fullness. Best performers: top-right corner" badge="Efficiency" badgeType="default" techBracket>
          <EChartWrapper option={scatterOption} style={{ height: "180px", width: "100%" }} loading={loading} showFooter={false} />
        </DottedCard>
      </div>

      {/* ── Rankings table ── */}
      <SectionLabel id="rankings" label="RANKINGS TABLE" icon={ArrowUpDown} />

      <DottedCard techBracket className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="border-b border-[var(--border)] bg-[var(--surface-sunken)]">
              <tr>
                <TH col="rank" label="#" />
                <th className="px-3 py-2 text-left text-[9px] font-mono font-bold uppercase tracking-widest text-[var(--text-muted)] whitespace-nowrap">Rollup</th>
                <TH col="blobs" label="Blobs" />
                <TH col="efficiency_score" label="Efficiency" />
                <TH col="packing_score" label="Packing" />
                <TH col="timing_score" label="Timing" />
                <TH col="cost_per_blob_gwei" label="Cost/Blob" />
                <TH col="blob_fullness_pct" label="Fullness" />
                <th className="px-3 py-2 text-left text-[9px] font-mono font-bold uppercase tracking-widest text-[var(--text-muted)]">7D Trend</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {loading && !rows.length ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="border-b border-dashed border-[var(--border)] animate-pulse">
                    <td colSpan={10} className="px-3 py-3">
                      <div className="h-4 bg-[var(--surface-sunken)] rounded w-full" />
                    </td>
                  </tr>
                ))
              ) : rows.map((r: any, idx: number) => (
                <tr key={r.slug}
                  className={`border-b border-dashed border-[var(--border)] transition-colors hover:bg-[var(--surface-sunken)] ${idx % 2 === 0 ? "" : "bg-[var(--surface-0)]"}`}>
                  <td className="px-3 py-2.5 font-mono font-bold text-[var(--text-muted)] text-[11px]">
                    {r.rank <= 3 ? ["🥇","🥈","🥉"][r.rank - 1] : r.rank}
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <RollupIcon name={r.name} color={r.color} />
                      <div className="min-w-0">
                        <Link href={`/rollup/${r.slug}`} className="font-bold text-[var(--text-primary)] hover:text-[var(--primary-text)] transition-colors truncate block font-mono text-[11px]">
                          {r.name}
                        </Link>
                        <span className="text-[9px] text-[var(--text-muted)]">{r.category}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-2.5 font-mono text-[11px] text-[var(--text-primary)] tabular-nums">{r.blobs.toLocaleString()}</td>
                  <td className="px-3 py-2.5"><ScoreBadge val={r.efficiency_score} /></td>
                  <td className="px-3 py-2.5"><ScoreBadge val={r.packing_score} /></td>
                  <td className="px-3 py-2.5"><ScoreBadge val={r.timing_score} /></td>
                  <td className="px-3 py-2.5 font-mono text-[11px] text-[var(--text-primary)] tabular-nums">{r.cost_per_blob_gwei} <span className="text-[var(--text-muted)]">Gwei</span></td>
                  <td className="px-3 py-2.5 font-mono text-[11px] text-[var(--text-primary)] tabular-nums">{r.blob_fullness_pct}%</td>
                  <td className="px-3 py-2.5">
                    <Sparkline data={r.sparkline.map((s: any) => s.v)} color={r.color} />
                  </td>
                  <td className="px-3 py-2.5">
                    <Link href={`/rollup/${r.slug}`}
                      className="inline-flex items-center gap-1 text-[9px] font-mono uppercase tracking-wider text-[var(--text-muted)] hover:text-[var(--primary-text)] transition-colors">
                      View <ExternalLink className="w-2.5 h-2.5" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DottedCard>

    </div>
  );
}
