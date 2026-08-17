"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import { useTheme } from "next-themes";
import { RefreshCw, Coins, Database, Gauge, ArrowUpRight, Activity, BarChart3, TrendingUp, Layers, Info } from "lucide-react";
import { TimeRangePicker, type DateRangeState } from "@/components/shared/time-range-picker";
import { DottedCard } from "@/components/ui/dotted-card";
import { EChartWrapper } from "@/components/charts/echart-wrapper";
import { getL2IconPath } from "@/lib/l2-icons";
import Image from "next/image";
import type { EChartsOption } from "echarts";
import { cn } from "@/lib/utils";

// ── Design helpers ────────────────────────────────────────────────────────

function axisBase(dark: boolean) {
  return {
    axisLine:  { lineStyle: { color: dark ? "#22222E" : "#E5E5E7" } },
    axisLabel: { color: dark ? "#68687D" : "#9C9CAE", fontFamily: "var(--font-mono)", fontSize: 10 },
    splitLine: { lineStyle: { color: dark ? "#1A1A24" : "#F3F3F7", type: "dashed" as const } },
    axisTick:  { show: false },
  };
}
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

const REGIME_COLOR  = { congested: "#F59E0B", healthy: "#22C55E", quiet: "#60A5FA" } as const;
const REGIME_LABEL  = { congested: "CONGESTED", healthy: "HEALTHY", quiet: "QUIET" } as const;
type Regime = keyof typeof REGIME_COLOR;

const PRESETS = [
  { label: "24H",  hours: 24 },
  { label: "7D",   hours: 168 },
  { label: "30D",  hours: 720 },
  { label: "90D",  hours: 2160 },
];
const ROLLUP_COLORS = ["#8B7BFF", "#00C7FF", "#FF6B6B", "#FFD166", "#06D6A0"];

function fmtCompact(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}
function todayStr() {
  return new Date().toISOString().slice(0, 10);
}
function sevenDaysAgoStr() {
  const d = new Date(); d.setDate(d.getDate() - 7);
  return d.toISOString().slice(0, 10);
}

// ── Protocol narration ────────────────────────────────────────────────────

function MetricNarration({ whatIsThis, whyItMatters, whatToDo }: {
  whatIsThis: string;
  whyItMatters: string;
  whatToDo: string;
}) {
  return (
    <div className="p-3.5 my-2.5 bg-[var(--surface-sunken)] border border-dashed border-[var(--border)] rounded-[6px] text-xs font-sans space-y-2">
      <div className="flex items-center gap-1.5 font-mono font-bold uppercase tracking-wider text-[var(--primary-text)]">
        <Info className="w-4 h-4 text-[var(--primary)] shrink-0" />
        PROTOCOL NARRATION &amp; METRIC GUIDANCE
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 pt-2 border-t border-[var(--border)]">
        <div>
          <span className="text-[var(--text-muted)] font-mono font-bold block text-[11px] uppercase tracking-wider">1. WHAT IS THIS?</span>
          <p className="text-[var(--text-secondary)] leading-relaxed mt-1">{whatIsThis}</p>
        </div>
        <div>
          <span className="text-[var(--text-muted)] font-mono font-bold block text-[11px] uppercase tracking-wider">2. WHY DOES IT MATTER?</span>
          <p className="text-[var(--text-secondary)] leading-relaxed mt-1">{whyItMatters}</p>
        </div>
        <div>
          <span className="text-[var(--text-muted)] font-mono font-bold block text-[11px] uppercase tracking-wider">3. OPERATOR TAKEAWAY</span>
          <p className="text-[var(--text-primary)] font-semibold leading-relaxed mt-1">{whatToDo}</p>
        </div>
      </div>
    </div>
  );
}

// ── Section label ─────────────────────────────────────────────────────────

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

// ── Rollup icon ───────────────────────────────────────────────────────────

function RollupIcon({ name, color, size = 18 }: { name: string; color: string; size?: number }) {
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
      style={{ width: size, height: size, background: color }}>
      {name.slice(0, 2).toUpperCase()}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────

export function MarketClient() {
  const { resolvedTheme } = useTheme();
  const dark = resolvedTheme === "dark";

  const [data, setData]             = useState<any>(null);
  const [loading, setLoading]       = useState(true);
  const [dateRange, setDateRange] = useState<DateRangeState>({ preset: "24h" });

  const hours = useMemo(() => {
    if (dateRange.preset === "custom" && dateRange.startDate && dateRange.endDate) {
      const ms = new Date(dateRange.endDate).getTime() - new Date(dateRange.startDate).getTime();
      return Math.max(1, Math.round(ms / 3_600_000));
    }
    if (dateRange.preset === "7d")  return 168;
    if (dateRange.preset === "30d") return 720;
    if (dateRange.preset === "90d") return 2160;
    return 24; // "24h" default
  }, [dateRange]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try { setData(await (await fetch(`/api/market?hours=${hours}`)).json()); }
    catch { /* ignore */ }
    finally { setLoading(false); }
  }, [hours]);

  useEffect(() => { loadData(); }, [loadData]);

  const ax = axisBase(dark);
  const tt = ttBase(dark);

  function xFmt(v: string, stepH: number) {
    const d = new Date(v);
    return stepH >= 24
      ? d.toLocaleDateString("en-US", { month: "short", day: "numeric" })
      : d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
  }

  // ── Chart options ─────────────────────────────────────────────────────

  const feeTrendOption = useMemo(() => {
    if (!data?.fee_trend?.length) return {} as EChartsOption;
    const primary = dark ? "#8B7BFF" : "#5B4BE0";
    return {
      backgroundColor: "transparent",
      tooltip: { trigger: "axis", ...tt, formatter: (p: any) =>
        `<div style="font-family:Geist Mono,monospace;font-size:11px"><strong>${xFmt(p[0].name, data.step_hours)}</strong><br/>Base Fee: <strong style="color:${primary}">${Number(p[0].value).toFixed(6)} Gwei</strong></div>`,
      },
      grid: { top: 16, right: 16, bottom: 24, left: 10, containLabel: true },
      xAxis: { type: "category", data: data.fee_trend.map((d: any) => d.time), ...ax,
        axisLabel: { ...ax.axisLabel, formatter: (v: string) => xFmt(v, data.step_hours), interval: Math.floor(data.fee_trend.length / 6) } },
      yAxis: { type: "value", ...ax, axisLabel: { ...ax.axisLabel, formatter: (v: number) => `${v.toFixed(4)}` } },
      series: [{ type: "line", smooth: true, symbol: "none", data: data.fee_trend.map((d: any) => d.base_fee_gwei),
        lineStyle: { color: primary, width: 2 },
        areaStyle: { color: { type: "linear", x: 0, y: 0, x2: 0, y2: 1, colorStops: [
          { offset: 0, color: dark ? "rgba(139,123,255,0.40)" : "rgba(91,75,224,0.20)" },
          { offset: 1, color: "rgba(139,123,255,0.02)" },
        ]}},
      }],
    } as EChartsOption;
  }, [data, dark]);

  const utilizationOption = useMemo(() => {
    if (!data?.utilization?.length) return {} as EChartsOption;
    const cyan = dark ? "#00C7FF" : "#0284C7";
    return {
      backgroundColor: "transparent",
      tooltip: { trigger: "axis", ...tt, formatter: (p: any) => {
        const row = data.utilization[p[0]?.dataIndex];
        return `<div style="font-family:Geist Mono,monospace;font-size:11px"><strong>${xFmt(p[0].name, data.step_hours)}</strong><br/>Utilization: <strong style="color:${cyan}">${Number(p[0].value).toFixed(1)}%</strong><br/>Blobs/Block: <strong>${Number(row?.blobs_per_block ?? 0).toFixed(2)}</strong></div>`;
      }},
      grid: { top: 16, right: 16, bottom: 24, left: 10, containLabel: true },
      xAxis: { type: "category", data: data.utilization.map((d: any) => d.time), ...ax,
        axisLabel: { ...ax.axisLabel, formatter: (v: string) => xFmt(v, data.step_hours), interval: Math.floor(data.utilization.length / 6) } },
      yAxis: { type: "value", min: 0, max: 100, ...ax, axisLabel: { ...ax.axisLabel, formatter: (v: number) => `${v}%` } },
      series: [{ type: "line", smooth: true, symbol: "none", data: data.utilization.map((d: any) => d.util_pct),
        lineStyle: { color: cyan, width: 2 },
        areaStyle: { color: { type: "linear", x: 0, y: 0, x2: 0, y2: 1, colorStops: [
          { offset: 0, color: dark ? "rgba(0,199,255,0.32)" : "rgba(2,132,199,0.18)" },
          { offset: 1, color: "rgba(0,199,255,0.02)" },
        ]}},
        markLine: { silent: true, data: [{ yAxis: 50 }],
          lineStyle: { color: "#F59E0B", type: "dashed" as const, width: 1.5, opacity: 0.7 },
          label: { show: true, formatter: "Target 50%", color: "#F59E0B", fontSize: 9, fontFamily: "Geist Mono,monospace", position: "end" as const } },
      }],
    } as EChartsOption;
  }, [data, dark]);

  const regimeHeatmapOption = useMemo(() => {
    if (!data?.regime_heatmap?.length) return {} as EChartsOption;
    return {
      backgroundColor: "transparent",
      tooltip: { ...tt, formatter: (p: any) => {
        const d = Array.isArray(p.data) ? p.data : p.data.value;
        const [hourStr, dayStr, regimeNum, util] = d;
        const r   = regimeNum === 0 ? "Quiet" : regimeNum === 2 ? "Congested" : "Healthy";
        const col = regimeNum === 0 ? "#60A5FA" : regimeNum === 2 ? "#F59E0B" : "#22C55E";
        return `<div style="font-family:Geist Mono,monospace;font-size:11px"><strong>${dayStr} ${hourStr} UTC</strong><br/>Util: <strong>${util}%</strong> · <strong style="color:${col}">${r}</strong></div>`;
      }},
      grid: { top: 8, right: 16, bottom: 28, left: 10, containLabel: true },
      xAxis: { type: "category", data: Array.from({length:24},(_,i)=>`${String(i).padStart(2,"0")}h`),
        ...ax, axisLabel: { ...ax.axisLabel, fontSize: 9, interval: 3 }, splitLine: { show: false } },
      yAxis: { type: "category", data: ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"],
        ...ax, axisLabel: { ...ax.axisLabel, fontSize: 9 }, splitLine: { show: false }, axisLine: { show: false } },
      visualMap: {
        type: "piecewise",
        dimension: 2,
        show: false,
        pieces: [
          { min: -1,  max: 0.5, color: "#60A5FA" },
          { min: 0.5, max: 1.5, color: "#22C55E" },
          { min: 1.5, max: 3,   color: "#F59E0B" },
        ],
      },
      series: [{ type: "heatmap",
        data: data.regime_heatmap.map((c: any) => [
          `${String(c.hour).padStart(2,"0")}h`,
          ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"][c.day],
          c.regime === "quiet" ? 0 : c.regime === "healthy" ? 1 : 2,
          c.util,
        ]),
        label: { show: false },
        itemStyle: { borderWidth: 1.5, borderColor: dark ? "#0D0D12" : "#F8F8FC" },
      }],
    } as EChartsOption;
  }, [data, dark]);

  const l1VsBlobOption = useMemo(() => {
    if (!data?.l1_vs_blob?.length) return {} as EChartsOption;
    return {
      backgroundColor: "transparent",
      legend: { data: ["Blob DA","Calldata"], top: 0, right: 8,
        textStyle: { color: dark ? "#A0A0B2" : "#55556B", fontSize: 9, fontFamily: "Geist Mono,monospace" }, itemWidth: 14, itemHeight: 2 },
      tooltip: { trigger: "axis", ...tt, formatter: (p: any[]) =>
        `<div style="font-family:Geist Mono,monospace;font-size:11px"><strong>${xFmt(p[0].name, data.step_hours)}</strong><br/>${p.map((x: any) => `${x.marker}${x.seriesName}: <strong>$${Number(x.value).toFixed(5)}</strong>`).join("<br/>")}</div>`,
      },
      grid: { top: 28, right: 16, bottom: 24, left: 10, containLabel: true },
      xAxis: { type: "category", data: data.l1_vs_blob.map((d: any) => d.time), ...ax,
        axisLabel: { ...ax.axisLabel, formatter: (v: string) => xFmt(v, data.step_hours), interval: Math.floor(data.l1_vs_blob.length / 5) } },
      yAxis: { type: "log", ...ax, axisLabel: { ...ax.axisLabel, formatter: (v: number) => `$${v.toFixed(4)}` } },
      series: [
        { name: "Blob DA", type: "line", smooth: true, symbol: "none",
          data: data.l1_vs_blob.map((d: any) => d.blob_cost_usd),
          lineStyle: { color: "#22C55E", width: 2 },
          areaStyle: { color: { type: "linear", x: 0, y: 0, x2: 0, y2: 1, colorStops: [
            { offset: 0, color: "rgba(34,197,94,0.28)" }, { offset: 1, color: "rgba(34,197,94,0.02)" }
          ]}},
        },
        { name: "Calldata", type: "line", smooth: true, symbol: "none",
          data: data.l1_vs_blob.map((d: any) => d.calldata_cost_usd),
          lineStyle: { color: "#F59E0B", width: 2, type: "dashed" as const } },
      ],
    } as EChartsOption;
  }, [data, dark]);

  const rollupActivityOption = useMemo(() => {
    if (!data?.rollup_activity || !data?.rollups?.length) return {} as EChartsOption;
    const times = data.rollup_activity[data.rollups[0]]?.map((d: any) => d.time) ?? [];
    return {
      backgroundColor: "transparent",
      legend: { data: data.rollups, top: 0, right: 8,
        textStyle: { color: dark ? "#A0A0B2" : "#55556B", fontSize: 9, fontFamily: "Geist Mono,monospace" }, itemWidth: 14, itemHeight: 2 },
      tooltip: { trigger: "axis", ...tt },
      grid: { top: 28, right: 16, bottom: 24, left: 10, containLabel: true },
      xAxis: { type: "category", data: times, ...ax,
        axisLabel: { ...ax.axisLabel, formatter: (v: string) => xFmt(v, data.step_hours), interval: Math.floor(times.length / 5) } },
      yAxis: { type: "value", ...ax },
      series: data.rollups.map((r: string, ri: number) => ({
        name: r, type: "line", stack: "total", smooth: true, symbol: "none",
        data: data.rollup_activity[r]?.map((d: any) => d.blobs) ?? [],
        lineStyle: { color: ROLLUP_COLORS[ri] ?? "#8B7BFF", width: 1.5 },
        areaStyle: { color: `${ROLLUP_COLORS[ri] ?? "#8B7BFF"}44` },
      })),
    } as EChartsOption;
  }, [data, dark]);

  const rollupFeesOption = useMemo(() => {
    if (!data?.rollup_fees || !data?.rollups?.length) return {} as EChartsOption;
    const times = data.rollup_fees[data.rollups[0]]?.map((d: any) => d.time) ?? [];
    return {
      backgroundColor: "transparent",
      legend: { data: data.rollups, top: 0, right: 8,
        textStyle: { color: dark ? "#A0A0B2" : "#55556B", fontSize: 9, fontFamily: "Geist Mono,monospace" }, itemWidth: 14, itemHeight: 2 },
      tooltip: { trigger: "axis", ...tt, formatter: (p: any[]) =>
        `<div style="font-family:Geist Mono,monospace;font-size:11px"><strong>${xFmt(p[0].name, data.step_hours)}</strong><br/>${p.map((x: any) => `${x.marker}${x.seriesName}: <strong>${Number(x.value).toFixed(6)} Gwei</strong>`).join("<br/>")}</div>`,
      },
      grid: { top: 28, right: 16, bottom: 24, left: 10, containLabel: true },
      xAxis: { type: "category", data: times, ...ax,
        axisLabel: { ...ax.axisLabel, formatter: (v: string) => xFmt(v, data.step_hours), interval: Math.floor(times.length / 5) } },
      yAxis: { type: "value", ...ax, axisLabel: { ...ax.axisLabel, formatter: (v: number) => v.toFixed(5) } },
      series: data.rollups.map((r: string, ri: number) => ({
        name: r, type: "line", smooth: true, symbol: "none",
        data: data.rollup_fees[r]?.map((d: any) => d.fee_gwei) ?? [],
        lineStyle: { color: ROLLUP_COLORS[ri] ?? "#8B7BFF", width: 1.5 },
      })),
    } as EChartsOption;
  }, [data, dark]);

  // ── Derived ───────────────────────────────────────────────────────────────
  const regime      = data?.market_regime;
  const kpi         = data?.kpi;
  const regimeColor = regime ? REGIME_COLOR[regime.regime as Regime] : "#8B7BFF";
  const activePresetLabel = dateRange.preset === "custom" ? "CUSTOM" : dateRange.preset.toUpperCase();

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-5 w-full max-w-7xl mx-auto py-2 font-sans px-4 sm:px-6">

      {/* ── Page header ── */}
      <div className="flex flex-col gap-3 pb-4 border-b border-dashed border-[var(--border)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2 font-mono text-[10px]">
            <span className="px-2 py-0.5 font-bold tracking-widest text-[var(--primary-text)] bg-[var(--primary-bg)] border border-[var(--primary-border)] uppercase rounded-[4px]">
              [ FEE MARKET ]
            </span>
            <span className="px-2 py-0.5 border border-[var(--border)] rounded-[4px] text-[var(--text-secondary)]">
              EIP-4844 · BLOB ECONOMICS · REGIME ANALYSIS
            </span>
            {regime && (
              <span className="flex items-center gap-1.5 px-2 py-0.5 border rounded-[4px] font-bold"
                style={{ borderColor: `${regimeColor}55`, background: `${regimeColor}11`, color: regimeColor }}>
                <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: regimeColor }} />
                {REGIME_LABEL[regime.regime as Regime]}
              </span>
            )}
          </div>
          <button onClick={loadData}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[4px] bg-[var(--surface-sunken)] border border-[var(--border)] text-xs font-mono font-bold text-[var(--text-primary)] hover:border-[var(--primary-border)] transition-all uppercase tracking-wider">
            <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin text-[var(--primary-text)]")} />
            [ SYNC ]
          </button>
        </div>

        <div className="space-y-1.5">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--text-primary)]">
            Blob Fee Economics &amp; Market Intelligence
          </h1>
          <p className="text-sm font-sans text-[var(--text-secondary)] leading-relaxed max-w-none">
            Real-time EIP-4844 blob market analysis — live regime classification (quiet / healthy / congested),
            historical fee trends, slot utilization, 12-slot congestion forecasting, L1 vs DA cost benchmarking,
            and per-rollup throughput breakdowns across all indexed sequencers.
          </p>
        </div>
      </div>

      {/* ── Filter bar ── */}
      <div className="flex flex-wrap items-center gap-3 p-3 bg-[var(--surface-sunken)] border border-[var(--border)] rounded-[8px]">
        <span className="text-[10px] font-mono text-[var(--text-muted)] uppercase tracking-wider shrink-0">Timeframe</span>
        <TimeRangePicker value={dateRange} onChange={setDateRange} />
      </div>

      {/* ── KPI strip ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <DottedCard title="Blob Fee Now" badge="GWEI" badgeType="live" techBracket>
          <div className="flex flex-col gap-0.5 py-0.5 font-mono">
            <span className="text-2xl font-bold text-[var(--text-primary)] tabular-nums">
              {loading ? "—" : `${kpi?.cost_per_blob_gwei?.toFixed(6) ?? "—"}`}
            </span>
            <span className="text-xs font-sans text-[var(--success)]">
              ≈ ${kpi?.cost_per_blob_usd?.toFixed(4) ?? "—"} per 128 KB
            </span>
          </div>
        </DottedCard>
        <DottedCard title={`Total Blobs (${activePresetLabel})`} badge="COUNT" techBracket>
          <div className="flex flex-col gap-0.5 py-0.5 font-mono">
            <span className="text-2xl font-bold text-[var(--primary-text)] tabular-nums">
              {loading ? "—" : fmtCompact(kpi?.total_blobs ?? 0)}
            </span>
            <span className="text-xs font-sans text-[var(--text-secondary)]">All indexed rollups</span>
          </div>
        </DottedCard>
        <DottedCard title="Avg Utilization" badge="%" badgeType="iris" techBracket>
          <div className="flex flex-col gap-0.5 py-0.5 font-mono">
            <span className="text-2xl font-bold text-[var(--text-primary)] tabular-nums">
              {loading ? "—" : `${kpi?.avg_utilization_pct?.toFixed(1) ?? "—"}%`}
            </span>
            <span className="text-xs font-sans text-[var(--text-secondary)]">vs 50% EIP-4844 target</span>
          </div>
        </DottedCard>
        <DottedCard title="Most Active Rollup" techBracket>
          <div className="flex flex-col gap-0.5 py-0.5 font-mono">
            <span className="text-2xl font-bold text-[var(--text-primary)] tabular-nums truncate">
              {loading ? "—" : (kpi?.top_rollup ?? "—")}
            </span>
            <span className="text-xs font-sans text-[var(--text-secondary)]">Highest blob volume this window</span>
          </div>
        </DottedCard>
      </div>

      {/* ── Regime panel ── */}
      {!loading && regime && (
        <>
          <SectionLabel label="Live Regime" icon={Activity} id="live-regime" />
          <DottedCard
            title="Market Regime Classification"
            subtitle={`Live congestion state · 12-slot fee forecast · ${regime.util_pct}% utilization`}
            badge={REGIME_LABEL[regime.regime as Regime]}
            badgeType={regime.regime === "congested" ? "warning" : regime.regime === "healthy" ? "live" : "default"}
            techBracket
          >
            <div className="flex flex-col lg:flex-row gap-8">
              <div className="flex-1 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full animate-pulse shrink-0" style={{ background: regimeColor }} />
                  <span className="font-mono font-bold text-base" style={{ color: regimeColor }}>
                    {REGIME_LABEL[regime.regime as Regime]}
                  </span>
                </div>
                <p className="text-sm font-sans text-[var(--text-secondary)] leading-relaxed">
                  {regime.description}
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: "Utilization",       value: `${regime.util_pct}%` },
                    { label: "Slots Since Spike", value: String(regime.slots_since_last_spike) },
                    { label: "Fee (Gwei)",         value: kpi?.cost_per_blob_gwei?.toFixed(6) ?? "—" },
                    { label: "ETH Price",          value: `$${(kpi?.eth_usd ?? 0).toLocaleString()}` },
                  ].map(({ label, value }) => (
                    <div key={label} className="p-2.5 border border-dashed border-[var(--border)] bg-[var(--surface-1)]">
                      <div className="font-mono text-[10px] uppercase tracking-wider text-[var(--text-muted)]">{label}</div>
                      <div className="font-mono font-bold text-sm text-[var(--text-primary)] mt-0.5">{value}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex-1">
                <div className="font-mono text-[10px] uppercase tracking-widest text-[var(--text-muted)] mb-3">
                  12-Slot Fee Forecast (EIP-4844 Escalator)
                </div>
                <div className="flex items-end gap-0.5 h-20 mb-2">
                  {(() => {
                    const CONTAINER_H = 80; // h-20 = 5rem = 80px
                    const fees = (data?.forecast ?? []).map((s: any) => s.fee_gwei as number);
                    const minFee = Math.min(...fees);
                    const maxFee = Math.max(...fees);
                    const feeRange = maxFee - minFee || maxFee * 0.1 || 0.001;
                    return (data?.forecast ?? []).map((slot: any) => {
                      const pxH = fees.length
                        ? Math.round((16 + ((slot.fee_gwei - minFee) / feeRange) * 62) / 100 * CONTAINER_H)
                        : 10;
                      const c = REGIME_COLOR[slot.regime as Regime] ?? "#8B7BFF";
                      return (
                        <div key={slot.slot} className="flex-1"
                          title={`Slot +${slot.slot}: ${slot.fee_gwei.toFixed(6)} Gwei · ${slot.regime}`}>
                          <div className="w-full rounded-sm" style={{ height: `${pxH}px`, background: c, opacity: 0.85 }} />
                        </div>
                      );
                    });
                  })()}
                </div>
                <div className="flex justify-between font-mono text-[9px] text-[var(--text-muted)] mb-3">
                  <span>+1 slot</span><span>+12 slots</span>
                </div>
                <div className="flex gap-4">
                  {(["quiet","healthy","congested"] as Regime[]).map(r => (
                    <div key={r} className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-sm" style={{ background: REGIME_COLOR[r] }} />
                      <span className="font-mono text-[9px] text-[var(--text-muted)] capitalize">{r}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <MetricNarration
              whatIsThis="Regime classification segments the blob market into three states: Quiet (<32% util — fees near floor), Healthy (32–78% — fees stable near target), and Congested (>78% — exponential fee escalation active)."
              whyItMatters="The regime determines whether the EIP-4844 fee escalator is actively compounding. A single congested slot raises fees 12.5%; ten consecutive congested slots raise them ~230%. Regime is the fastest way to gauge urgency without reading raw fee numbers."
              whatToDo="Quiet: bulk-submit — fees won't get cheaper. Healthy: normal cadence. Congested: hold non-urgent batches. If the 12-slot forecast shows 8+ congested slots, wait for the regime to reset before submitting large payloads."
            />
          </DottedCard>
        </>
      )}

      {/* ── Fee trend ── */}
      <SectionLabel label="Pricing" icon={TrendingUp} id="pricing" />
      <DottedCard title="Blob Base Fee Trend" subtitle="EIP-4844 base fee in Gwei — exponential escalator activates above 50% utilization" badge="GWEI">
        <EChartWrapper option={feeTrendOption as EChartsOption} style={{ height: "260px", width: "100%" }} loading={loading} />
        <MetricNarration
          whatIsThis="The blob base fee is derived from EIP-4844's independent fee market. It adjusts each block based on whether the previous block used more or fewer than the target (3 blobs / 6 max)."
          whyItMatters="Unlike gas fees, blob fees follow an exponential escalator — a single congested block can push fees 12.5% higher. Repeated congestion compounds rapidly, causing 10–100× spikes within minutes."
          whatToDo="Watch for sustained upward trends, not individual spikes. If the fee has risen >3× in the last 6 hours, delay non-urgent batch submissions and monitor utilization before committing."
        />
      </DottedCard>

      {/* ── Utilization + Heatmap ── */}
      <SectionLabel label="Capacity" icon={Gauge} id="capacity" />
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:items-stretch">
        <div className="lg:col-span-7 flex flex-col">
          <DottedCard title="Slot Utilization" subtitle="% of max blob capacity — dashed line = 50% EIP-4844 equilibrium target" badge="%" className="h-full">
            <EChartWrapper option={utilizationOption as EChartsOption} style={{ height: "224px", width: "100%" }} loading={loading} />
            <MetricNarration
              whatIsThis="Slot utilization measures blobs included per block as a percentage of the maximum (6 blobs/block). The EIP-4844 protocol targets 50% — achieved when blocks average 3 blobs."
              whyItMatters="Sustained utilization above 50% triggers the exponential fee escalator. Below 50%, fees decay. This is the leading indicator — fee changes lag utilization by 1–3 blocks."
              whatToDo="Above 75%: expect fee spikes within the next 10 slots — delay if possible. Below 30%: fees are near-floor, ideal for large batch submissions. 40–60%: submit normally."
            />
          </DottedCard>
        </div>
        <div className="lg:col-span-5 flex flex-col">
          <DottedCard title="Regime Heatmap" subtitle="Hourly market classification · last 7 days × 24h UTC" className="h-full">
            <div className="flex flex-col h-full gap-2">
              <div className="flex-1 min-h-[180px]">
                <EChartWrapper option={regimeHeatmapOption as EChartsOption} style={{ height: "100%", width: "100%" }} loading={loading} showWatermark={false} showFooter={false} outerClassName="h-full" />
              </div>
              <div className="flex items-center gap-4 shrink-0 pt-1">
                {([["quiet","#60A5FA"],["healthy","#22C55E"],["congested","#F59E0B"]] as const).map(([r,c]) => (
                  <div key={r} className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-[2px]" style={{ background: c }} />
                    <span className="font-mono text-[10px] capitalize text-[var(--text-muted)]">{r}</span>
                  </div>
                ))}
              </div>
            </div>
          </DottedCard>
        </div>
      </div>

      {/* ── Cost benchmarking ── */}
      <SectionLabel label="Cost Benchmarking" icon={BarChart3} id="cost-benchmarking" />
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7">
          <DottedCard title="DA vs Calldata Cost (USD)" subtitle="Per-128KB blob vs calldata — log scale · blobs are consistently 10–20× cheaper" badge="LOG">
            <EChartWrapper option={l1VsBlobOption as EChartsOption} style={{ height: "224px", width: "100%" }} loading={loading} />
          </DottedCard>
        </div>
        <div className="lg:col-span-5">
          <DottedCard title="L2 DA Layer Comparison" subtitle="Cost per 128 KB blob across data availability layers">
            <div className="space-y-2">
              {loading ? Array.from({length:4}).map((_,i) => <div key={i} className="h-12 animate-pulse bg-[var(--surface-1)]" />) : (
                [
                  { label: "Blob DA (EIP-4844)",  cost: kpi ? `$${kpi.cost_per_blob_usd.toFixed(4)}` : "—", tag: "ACTIVE",   color: "#22C55E" },
                  { label: "Calldata (pre-4844)", cost: kpi ? `$${(kpi.cost_per_blob_usd*16).toFixed(3)}` : "—", tag: "LEGACY",   color: "#F59E0B" },
                  { label: "Celestia (external)", cost: "$0.00003",  tag: "EXTERNAL", color: "#8B7BFF" },
                  { label: "EigenDA (external)",  cost: "$0.00001",  tag: "EXTERNAL", color: "#00C7FF" },
                ].map(row => (
                  <div key={row.label} className="flex items-center justify-between px-3 py-2.5 border border-dashed border-[var(--border)] bg-[var(--surface-1)]">
                    <div>
                      <div className="font-mono text-xs text-[var(--text-primary)]">{row.label}</div>
                      <div className="font-mono text-[9px] uppercase tracking-wider mt-0.5" style={{ color: row.color }}>{row.tag}</div>
                    </div>
                    <div className="font-mono font-bold text-sm text-[var(--text-primary)]">{row.cost}</div>
                  </div>
                ))
              )}
              {!loading && <p className="font-mono text-[10px] text-[var(--text-muted)] pt-1">ETH @ ${(kpi?.eth_usd ?? 0).toLocaleString()} · per 128 KB payload</p>}
            </div>
          </DottedCard>
        </div>
      </div>

      {/* ── Rollup throughput ── */}
      <SectionLabel label="Rollup Throughput" icon={Layers} id="rollup-throughput" />
      <DottedCard title="Blob Activity by Rollup" subtitle="Stacked blob volume per sequencer — top 5 rollups by share of total throughput" badge="BLOBS" techBracket>
        {!loading && (
          <div className="flex flex-wrap gap-x-4 gap-y-1 mb-3">
            {(data?.rollups ?? []).map((r: string, ri: number) => (
              <div key={r} className="flex items-center gap-1.5">
                <RollupIcon name={r} color={ROLLUP_COLORS[ri] ?? "#8B7BFF"} size={16} />
                <span className="font-mono text-xs text-[var(--text-secondary)]">{r}</span>
              </div>
            ))}
          </div>
        )}
        <EChartWrapper option={rollupActivityOption as EChartsOption} style={{ height: "280px", width: "100%" }} loading={loading} />
      </DottedCard>

      <DottedCard title="Average Fee per Rollup" subtitle="Blob base fee paid per sequencer — divergence reveals batching strategy differences" badge="GWEI">
        {!loading && (
          <div className="flex flex-wrap gap-x-4 gap-y-1 mb-3">
            {(data?.rollups ?? []).map((r: string, ri: number) => (
              <div key={r} className="flex items-center gap-1.5">
                <RollupIcon name={r} color={ROLLUP_COLORS[ri] ?? "#8B7BFF"} size={16} />
                <span className="font-mono text-xs text-[var(--text-secondary)]">{r}</span>
              </div>
            ))}
          </div>
        )}
        <EChartWrapper option={rollupFeesOption as EChartsOption} style={{ height: "256px", width: "100%" }} loading={loading} />
      </DottedCard>

    </div>
  );
}
