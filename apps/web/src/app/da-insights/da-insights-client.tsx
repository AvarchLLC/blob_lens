"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import { useTheme } from "next-themes";
import {
  Database, Activity, RefreshCw, Search,
  TrendingUp, Clock, BarChart3,
} from "lucide-react";
import { TimeRangePicker, type DateRangeState } from "@/components/shared/time-range-picker";
import { DottedCard } from "@/components/ui/dotted-card";
import { PixelHeading } from "@/components/ui/pixel-heading-word";
import { EChartWrapper, ChartFooter } from "@/components/charts/echart-wrapper";
import { fmtUsd, fmtK } from "@/lib/tokens";
import { getL2IconPath } from "@/lib/l2-icons";
import Image from "next/image";
import type { EChartsOption } from "echarts";

// ── Iris design-system tokens ──────────────────────────────────────────────
const CHART_SERIES = ["#2563EB", "#059669", "#D97706", "#DC2626", "#7C3AED", "#64748B", "#0891B2", "#D946EF"];

function iris(dark: boolean) {
  return { primary: dark ? "#8B7BFF" : "#5B4BE0", muted: dark ? "#68687D" : "#9C9CAE" };
}

function axisBase(dark: boolean) {
  return {
    axisLine: { lineStyle: { color: dark ? "#22222E" : "#E5E5E7" } },
    axisLabel: { color: dark ? "#68687D" : "#9C9CAE", fontFamily: "var(--font-mono)", fontSize: 10 },
    splitLine: { lineStyle: { color: dark ? "#1A1A24" : "#F3F3F7", type: "dashed" as const } },
  };
}

function tooltipBase(dark: boolean) {
  return {
    confine: true,
    backgroundColor: dark ? "#121217" : "#FFFFFF",
    borderColor: dark ? "#3A3275" : "#CBC4FA",
    borderWidth: 1,
    padding: [8, 12],
    textStyle: { color: dark ? "#F4F4F8" : "#1A1A24", fontFamily: "Geist Mono, monospace", fontSize: 11 },
    extraCssText: `background:${dark ? "#121217" : "#FFFFFF"}!important;border:1px solid ${dark ? "#3A3275" : "#CBC4FA"}!important;border-radius:4px;box-shadow:0 4px 20px rgba(0,0,0,${dark ? "0.45" : "0.12"});`,
  };
}

// ── Section divider ─────────────────────────────────────────────────────────
function SectionLabel({ label, icon: Icon, id }: { label: string; icon?: React.ElementType; id?: string }) {
  return (
    <div id={id} className="flex items-center gap-3 mt-3 scroll-mt-24">
      <span className="inline-flex items-center gap-1.5 text-[10px] font-mono font-bold tracking-widest text-[var(--primary-text)] bg-[var(--primary-bg)] border border-[var(--primary-border)] px-2 py-0.5 rounded-[3px] uppercase whitespace-nowrap">
        {Icon && <Icon className="w-3 h-3" />}
        [ {label} ]
      </span>
      <div className="flex-1 border-t border-dashed border-[var(--border)]" />
    </div>
  );
}

// ── Provenance tooltip ──────────────────────────────────────────────────────
function ProvenanceTooltip({ source, method, scope, confidence }: {
  source: string; method: string; scope: string;
  confidence: "Verified" | "Observed" | "Simulated";
}) {
  return (
    <div className="relative inline-block group ml-1 align-middle">
      <span className="cursor-help text-[9px] font-mono font-bold border border-[var(--border)] rounded-[3px] px-1 py-0.5 opacity-70 hover:opacity-100 transition-opacity bg-[var(--surface-sunken)] text-[var(--text-muted)]">i</span>
      <div className="absolute top-full right-0 mt-2 hidden group-hover:block w-60 p-2.5 font-mono text-[11px] leading-relaxed border border-[var(--border-strong)] bg-[var(--surface-1)] text-[var(--text-primary)] shadow-2xl rounded-[6px] z-[100] pointer-events-none">
        <div className="text-[10px] font-bold uppercase tracking-widest text-[var(--primary-text)] border-b border-[var(--border)] pb-1 mb-1.5">METRIC PROVENANCE // AUDIT</div>
        <div className="space-y-1">
          <div><span className="text-[var(--text-muted)]">SOURCE:</span> {source}</div>
          <div><span className="text-[var(--text-muted)]">METHOD:</span> {method}</div>
          <div><span className="text-[var(--text-muted)]">SCOPE:</span> {scope}</div>
          <div><span className="text-[var(--text-muted)]">CONFIDENCE:</span> <span className={confidence === "Verified" ? "text-[var(--success)] font-bold" : "text-[var(--primary-text)] font-bold"}>{confidence}</span></div>
        </div>
      </div>
    </div>
  );
}

// ── Rollup icon helper ──────────────────────────────────────────────────────
function RollupIcon({ name, size = 16 }: { name: string; size?: number }) {
  const src = getL2IconPath(name);
  if (!src) return <span className="inline-block rounded-full bg-[var(--surface-sunken)] border border-[var(--border)]" style={{ width: size, height: size }} />;
  return <Image src={src} alt={name} width={size} height={size} className="rounded-full" unoptimized />;
}

// ── Main component ──────────────────────────────────────────────────────────
export function DaInsightsClient() {
  const { resolvedTheme } = useTheme();
  const dark = resolvedTheme === "dark";

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<DateRangeState>({ preset: "30d" });
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const url = `/api/da-insights?range=${dateRange.preset}&category=${categoryFilter}${dateRange.preset === "custom" ? `&from=${dateRange.startDate}&to=${dateRange.endDate}` : ""}`;
      const json = await (await fetch(url)).json();
      setData(json);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [dateRange, categoryFilter]);

  useEffect(() => { loadData(); }, [loadData]);

  // ── 1. Rollup throughput line ─────────────────────────────────────────────
  const throughputOption: EChartsOption = useMemo(() => {
    if (!data?.rollup_throughput_trend || !data?.rollup_matrix) return {};
    const ax = axisBase(dark); const tt = tooltipBase(dark);
    const weeks = data.rollup_throughput_trend.map((w: any) => w.week);
    const series = data.rollup_matrix.map((r: any, i: number) => ({
      name: r.name, type: "line", smooth: true,
      lineStyle: { color: r.color || CHART_SERIES[i % CHART_SERIES.length], width: 2 },
      itemStyle: { color: r.color || CHART_SERIES[i % CHART_SERIES.length] },
      symbol: "none",
      data: data.rollup_throughput_trend.map((w: any) => w[r.name.replace(/\s+/g, "_")] || 0),
    }));
    return {
      backgroundColor: "transparent",
      tooltip: { trigger: "axis", ...tt, formatter: (params: any) => {
        let s = `<div style="font-family:var(--font-mono);font-size:11px"><strong>${params[0]?.axisValue}</strong><br/>`;
        params.forEach((p: any) => { s += `<span style="color:${p.color}">●</span> ${p.seriesName}: <strong>${Number(p.value).toLocaleString()}</strong> blobs<br/>`; });
        return s + "</div>";
      }},
      legend: { type: "scroll", top: 0, textStyle: { color: dark ? "#A0A0B2" : "#55556B", fontSize: 10, fontFamily: "var(--font-mono)" } },
      grid: { top: 32, right: 12, bottom: 20, left: 10, containLabel: true },
      xAxis: { type: "category", data: weeks, ...ax },
      yAxis: { type: "value", ...ax, axisLabel: { ...ax.axisLabel, formatter: (v: number) => `${(v / 1000).toFixed(0)}K` } },
      series,
    };
  }, [data, dark]);

  // ── 2. Share donut ────────────────────────────────────────────────────────
  const shareDonutOption: EChartsOption = useMemo(() => {
    if (!data?.rollup_share_distribution) return {};
    const tt = tooltipBase(dark);
    return {
      backgroundColor: "transparent",
      tooltip: { trigger: "item", ...tt, formatter: "{b}: {c}%" },
      series: [{
        type: "pie", radius: ["45%", "75%"],
        avoidLabelOverlap: false,
        itemStyle: { borderRadius: 4, borderColor: dark ? "#121217" : "#FFFFFF", borderWidth: 2 },
        label: { show: false },
        data: data.rollup_share_distribution.map((it: any) => ({ name: it.name, value: it.value, itemStyle: { color: it.color } })),
      }],
    };
  }, [data, dark]);

  // ── 3. DA fees stacked bar ────────────────────────────────────────────────
  const feesOption: EChartsOption = useMemo(() => {
    if (!data?.rollup_da_fees_trend || !data?.rollup_matrix) return {};
    const ax = axisBase(dark); const tt = tooltipBase(dark);
    const weeks = data.rollup_da_fees_trend.map((w: any) => w.week);
    const series = data.rollup_matrix.map((r: any) => ({
      name: r.name, type: "bar", stack: "total",
      itemStyle: { color: r.color },
      data: data.rollup_da_fees_trend.map((w: any) => w[r.name.replace(/\s+/g, "_")] || 0),
    }));
    return {
      backgroundColor: "transparent",
      tooltip: { trigger: "axis", ...tt, formatter: (params: any) => {
        let s = `<div style="font-family:var(--font-mono);font-size:11px"><strong>${params[0]?.axisValue}</strong><br/>`;
        params.forEach((p: any) => { s += `<span style="color:${p.color}">●</span> ${p.seriesName}: <strong>$${Number(p.value).toLocaleString()}</strong><br/>`; });
        return s + "</div>";
      }},
      legend: { type: "scroll", top: 0, textStyle: { color: dark ? "#A0A0B2" : "#55556B", fontSize: 10, fontFamily: "var(--font-mono)" } },
      grid: { top: 32, right: 12, bottom: 20, left: 10, containLabel: true },
      xAxis: { type: "category", data: weeks, ...ax },
      yAxis: { type: "value", ...ax, axisLabel: { ...ax.axisLabel, formatter: (v: number) => `$${(v / 1000).toFixed(0)}K` } },
      series,
    };
  }, [data, dark]);

  // ── 4. Compression ratio horizontal bar ───────────────────────────────────
  const compressionOption: EChartsOption = useMemo(() => {
    if (!data?.compression_efficiency) return {};
    const ax = axisBase(dark); const tt = tooltipBase(dark);
    const items = [...data.compression_efficiency].reverse();
    return {
      backgroundColor: "transparent",
      tooltip: { trigger: "axis", ...tt, formatter: "{b}: {c}x" },
      grid: { top: 8, right: 20, bottom: 20, left: 10, containLabel: true },
      xAxis: { type: "value", ...ax, axisLabel: { ...ax.axisLabel, formatter: "{value}x" } },
      yAxis: { type: "category", data: items.map((c: any) => c.rollup), ...ax },
      series: [{ type: "bar", data: items.map((c: any) => c.ratio), itemStyle: { color: dark ? "#8B7BFF" : "#5B4BE0", borderRadius: [0, 4, 4, 0] } }],
    };
  }, [data, dark]);

  // ── 5. Fee percentile bands ───────────────────────────────────────────────
  const feePercentilesOption: EChartsOption = useMemo(() => {
    if (!data?.fee_percentiles) return {};
    const ax = axisBase(dark); const tt = tooltipBase(dark);
    const labels = data.fee_percentiles.map((d: any) => d.week);
    const p25 = data.fee_percentiles.map((d: any) => d.p25);
    const p50 = data.fee_percentiles.map((d: any) => d.p50);
    const p75 = data.fee_percentiles.map((d: any) => d.p75);
    const p95 = data.fee_percentiles.map((d: any) => d.p95);
    const bandWidth = p75.map((v: number, i: number) => Math.max(0, v - p25[i]));
    return {
      backgroundColor: "transparent",
      tooltip: { trigger: "axis", ...tt, formatter: (params: any) => {
        const w = params[0]?.axisValue ?? "";
        const get = (name: string) => params.find((p: any) => p.seriesName === name)?.value ?? 0;
        return `<div style="font-family:var(--font-mono);font-size:11px">
          <strong>${w}</strong><br/>
          <span style="color:#059669">P50 median: ${Number(get("P50")).toFixed(5)} Gwei</span><br/>
          <span style="color:${dark ? "#8B7BFF" : "#5B4BE0"}">P25–P75 band</span><br/>
          <span style="color:#DC2626">P95: ${Number(get("P95")).toFixed(5)} Gwei</span>
        </div>`;
      }},
      legend: { data: ["P25–P75 Band", "P50", "P95"], top: 0, textStyle: { color: dark ? "#A0A0B2" : "#55556B", fontSize: 10, fontFamily: "var(--font-mono)" } },
      grid: { top: 32, right: 12, bottom: 20, left: 10, containLabel: true },
      xAxis: { type: "category", data: labels, ...ax },
      yAxis: { type: "value", ...ax, name: "Gwei", nameTextStyle: { color: ax.axisLabel.color, fontSize: 10 }, axisLabel: { ...ax.axisLabel, formatter: (v: number) => v.toFixed(4) } },
      series: [
        // invisible baseline for stacked band
        { name: "band_base", type: "line", data: p25, lineStyle: { opacity: 0 }, symbol: "none", stack: "band", areaStyle: { color: "transparent" }, tooltip: { show: false }, showInLegend: false },
        // band width
        { name: "P25–P75 Band", type: "line", data: bandWidth, lineStyle: { opacity: 0 }, symbol: "none", stack: "band", areaStyle: { color: dark ? "rgba(139,123,255,0.18)" : "rgba(91,75,224,0.12)" } },
        // median
        { name: "P50", type: "line", data: p50, smooth: true, symbol: "none", lineStyle: { color: "#059669", width: 2 }, itemStyle: { color: "#059669" } },
        // P95 dashed
        { name: "P95", type: "line", data: p95, smooth: true, symbol: "none", lineStyle: { color: "#DC2626", width: 1.5, type: "dashed" }, itemStyle: { color: "#DC2626" } },
      ],
    };
  }, [data, dark]);

  // ── 6. Cost heatmap (hour × day-of-week) ──────────────────────────────────
  const costHeatmapOption: EChartsOption = useMemo(() => {
    if (!data?.cost_heatmap) return {};
    const tt = tooltipBase(dark);
    const HOURS = Array.from({ length: 24 }, (_, i) => i === 0 ? "12am" : i < 12 ? `${i}am` : i === 12 ? "12pm" : `${i - 12}pm`);
    const DAYS  = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const allCosts = data.cost_heatmap.map((d: number[]) => d[2]);
    const maxCost = Math.max(...allCosts);

    return {
      backgroundColor: "transparent",
      tooltip: { ...tt, formatter: (p: any) => {
        const [hour, day, cost] = p.data;
        return `<div style="font-family:var(--font-mono);font-size:11px">
          <strong>${DAYS[day]} ${HOURS[hour]}</strong><br/>
          Cost: <strong>$${Number(cost).toFixed(5)}</strong>/blob
        </div>`;
      }},
      visualMap: {
        min: 0, max: maxCost,
        calculable: false,
        orient: "horizontal", left: "center", bottom: 0,
        itemHeight: 100, itemWidth: 10,
        textStyle: { color: dark ? "#68687D" : "#9C9CAE", fontSize: 9, fontFamily: "var(--font-mono)" },
        text: ["Expensive", "Cheap"],
        inRange: {
          color: dark
            ? ["#1C1650", "#3B2F9C", "#5B4BE0", "#8B7BFF", "#D97706", "#DC2626"]
            : ["#F1EFFE", "#CBC4FA", "#8B7BFF", "#5B4BE0", "#D97706", "#DC2626"],
        },
      },
      grid: { top: 12, right: 16, bottom: 56, left: 10, containLabel: true },
      xAxis: {
        type: "category", data: HOURS, splitArea: { show: true },
        axisLabel: { color: dark ? "#68687D" : "#9C9CAE", fontFamily: "var(--font-mono)", fontSize: 9, interval: 2 },
        axisLine: { lineStyle: { color: dark ? "#22222E" : "#E5E5E7" } },
      },
      yAxis: {
        type: "category", data: DAYS, splitArea: { show: true },
        axisLabel: { color: dark ? "#68687D" : "#9C9CAE", fontFamily: "var(--font-mono)", fontSize: 10 },
        axisLine: { lineStyle: { color: dark ? "#22222E" : "#E5E5E7" } },
      },
      series: [{ type: "heatmap", data: data.cost_heatmap, label: { show: false }, emphasis: { itemStyle: { shadowBlur: 10, shadowColor: "rgba(139,123,255,0.4)" } } }],
    };
  }, [data, dark]);

  // ── 7. Submission timing heatmap (rollup × UTC hour) ──────────────────────
  const submissionTimingOption: EChartsOption = useMemo(() => {
    if (!data?.submission_timing || !data?.rollup_matrix) return {};
    const tt = tooltipBase(dark);
    const HOURS  = Array.from({ length: 24 }, (_, i) => i === 0 ? "12am" : i < 12 ? `${i}am` : i === 12 ? "12pm" : `${i - 12}pm`);
    const rollups = data.rollup_matrix.map((r: any) => r.name);
    const maxVal  = Math.max(...data.submission_timing.map((d: any) => d.blob_count));
    const cells   = data.submission_timing.map((d: any) => [d.hour_of_day, rollups.indexOf(d.rollup), d.blob_count]);

    return {
      backgroundColor: "transparent",
      tooltip: { ...tt, formatter: (p: any) => {
        const rollup = rollups[p.data[1]] ?? "";
        return `<div style="font-family:var(--font-mono);font-size:11px">
          <strong>${rollup}</strong><br/>
          ${HOURS[p.data[0]]}: <strong>${Number(p.data[2]).toLocaleString()} blobs</strong>
        </div>`;
      }},
      visualMap: {
        min: 0, max: maxVal, calculable: false,
        orient: "horizontal", left: "center", bottom: 0,
        itemHeight: 100, itemWidth: 10,
        textStyle: { color: dark ? "#68687D" : "#9C9CAE", fontSize: 9, fontFamily: "var(--font-mono)" },
        text: ["High", "Low"],
        inRange: {
          color: dark
            ? ["#1C1650", "#3B2F9C", "#5B4BE0", "#8B7BFF"]
            : ["#F1EFFE", "#CBC4FA", "#8B7BFF", "#5B4BE0"],
        },
      },
      grid: { top: 12, right: 16, bottom: 56, left: 10, containLabel: true },
      xAxis: {
        type: "category", data: HOURS, splitArea: { show: true },
        axisLabel: { color: dark ? "#68687D" : "#9C9CAE", fontFamily: "var(--font-mono)", fontSize: 9, interval: 2 },
        axisLine: { lineStyle: { color: dark ? "#22222E" : "#E5E5E7" } },
      },
      yAxis: {
        type: "category", data: rollups, splitArea: { show: true },
        axisLabel: { color: dark ? "#A0A0B2" : "#55556B", fontFamily: "var(--font-mono)", fontSize: 10 },
        axisLine: { lineStyle: { color: dark ? "#22222E" : "#E5E5E7" } },
      },
      series: [{ type: "heatmap", data: cells, label: { show: false }, emphasis: { itemStyle: { shadowBlur: 10, shadowColor: "rgba(139,123,255,0.4)" } } }],
    };
  }, [data, dark]);

  // ── 8. Rollup volume stacked bar (per period) ─────────────────────────────
  const volumeAreaOption: EChartsOption = useMemo(() => {
    if (!data?.rollup_volume_area || !data?.rollup_matrix) return {};
    const ax = axisBase(dark); const tt = tooltipBase(dark);
    const weeks = data.rollup_volume_area.map((w: any) => w.week);
    const series = data.rollup_matrix.map((r: any) => ({
      name: r.name, type: "bar", stack: "total",
      itemStyle: { color: r.color },
      emphasis: { focus: "series" as const },
      data: data.rollup_volume_area.map((w: any) => w[r.name] || 0),
    }));
    return {
      backgroundColor: "transparent",
      tooltip: { trigger: "axis", ...tt, axisPointer: { type: "shadow" as const }, formatter: (params: any) => {
        const total = params.reduce((s: number, p: any) => s + (p.value || 0), 0);
        let s = `<div style="font-family:var(--font-mono);font-size:11px;min-width:200px"><strong>${params[0]?.axisValue}</strong><br/>`;
        params.sort((a: any, b: any) => b.value - a.value).slice(0, 6).forEach((p: any) => {
          const pct = total > 0 ? ((p.value / total) * 100).toFixed(0) : 0;
          s += `<span style="color:${p.color}">●</span> ${p.seriesName}: <strong>${Number(p.value).toLocaleString()}</strong> <span style="opacity:0.6">(${pct}%)</span><br/>`;
        });
        s += `<br/>Total: <strong>${Number(total).toLocaleString()}</strong> blobs</div>`;
        return s;
      }},
      legend: { type: "scroll", top: 0, textStyle: { color: dark ? "#A0A0B2" : "#55556B", fontSize: 10, fontFamily: "var(--font-mono)" } },
      grid: { top: 32, right: 12, bottom: 20, left: 10, containLabel: true },
      xAxis: { type: "category", data: weeks, ...ax },
      yAxis: { type: "value", ...ax, axisLabel: { ...ax.axisLabel, formatter: (v: number) => `${(v / 1000).toFixed(0)}K` } },
      series,
    };
  }, [data, dark]);

  // ── 9. Efficiency scatter (packing vs timing) ─────────────────────────────
  const efficiencyScatterOption: EChartsOption = useMemo(() => {
    if (!data?.rollup_matrix) return {};
    const ax = axisBase(dark); const tt = tooltipBase(dark);
    const { primary } = iris(dark);
    const maxBlobs = Math.max(...data.rollup_matrix.map((r: any) => r.total_blobs), 1);

    const seriesData = data.rollup_matrix.map((r: any) => {
      const eff = r.efficiency_score;
      const color = eff >= 90 ? "#059669" : eff >= 80 ? "#D97706" : "#DC2626";
      return {
        value: [r.packing_score, r.timing_score, r.total_blobs],
        symbolSize: 10 + (r.total_blobs / maxBlobs) * 34,
        itemStyle: { color, opacity: 0.88, borderColor: dark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.12)", borderWidth: 1.5 },
        name: r.name, eff,
      };
    });

    return {
      backgroundColor: "transparent",
      tooltip: { ...tt, formatter: (p: any) => {
        const [packing, timing, blobs] = p.data.value;
        const effColor = p.data.eff >= 90 ? "#059669" : p.data.eff >= 80 ? "#D97706" : "#DC2626";
        return `<div style="font-family:var(--font-mono);font-size:11px;min-width:170px">
          <strong style="font-size:12px">${p.data.name}</strong><br/>
          Packing: <strong style="color:${primary}">${packing}/100</strong><br/>
          Timing: <strong style="color:${primary}">${timing}/100</strong><br/>
          Volume: <strong>${Number(blobs).toLocaleString()}</strong> blobs<br/>
          Efficiency: <strong style="color:${effColor}">${p.data.eff}/100</strong>
        </div>`;
      }},
      grid: { top: 24, right: 32, bottom: 48, left: 10, containLabel: true },
      xAxis: { type: "value", name: "Packing Score", nameLocation: "center", nameGap: 28, min: 60, max: 100,
        nameTextStyle: { color: ax.axisLabel.color, fontSize: 10, fontFamily: "var(--font-mono)", fontWeight: "bold" as const },
        ...ax, axisLabel: { ...ax.axisLabel, formatter: (v: number) => `${v}` } },
      yAxis: { type: "value", name: "Timing Score", nameLocation: "center", nameGap: 40, min: 55, max: 100,
        nameTextStyle: { color: ax.axisLabel.color, fontSize: 10, fontFamily: "var(--font-mono)", fontWeight: "bold" as const },
        ...ax, axisLabel: { ...ax.axisLabel, formatter: (v: number) => `${v}` } },
      series: [{
        type: "scatter",
        data: seriesData,
        label: { show: true, formatter: (p: any) => p.data.name, position: "top", fontSize: 9, color: ax.axisLabel.color, fontFamily: "var(--font-mono)" },
        markLine: { silent: true, symbol: "none",
          lineStyle: { color: dark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)", type: "dashed", width: 1 },
          data: [
            { xAxis: 80, label: { formatter: "80 Pack", position: "end", color: ax.axisLabel.color, fontSize: 8, fontFamily: "var(--font-mono)" } },
            { yAxis: 75, label: { formatter: "75 Time", position: "end", color: ax.axisLabel.color, fontSize: 8, fontFamily: "var(--font-mono)" } },
          ],
        },
      }],
    };
  }, [data, dark]);

  // ── 10. Historical blob volume (bar + epoch bands) ────────────────────────
  const historicalVolumeOption: EChartsOption = useMemo(() => {
    if (!data?.historical_volume) return {} as EChartsOption;
    const ax = axisBase(dark); const tt = tooltipBase(dark);
    const { primary } = iris(dark);
    const points = data.historical_volume.map((d: any) => [new Date(d.day).getTime(), d.blobs]);

    const EPOCHS = [
      { name: "Dencun", start: "2024-03-13", end: "2025-05-06", color: "rgba(37,99,235,0.06)", lc: "rgba(96,165,250,0.4)" },
      { name: "Pectra", start: "2025-05-07", end: "2026-04-07", color: "rgba(5,150,105,0.06)",  lc: "rgba(52,211,153,0.4)" },
      { name: "Fusaka", start: "2026-04-08", end: "2099-01-01", color: "rgba(124,58,237,0.06)", lc: "rgba(167,139,250,0.4)" },
    ];

    const markAreaData = EPOCHS.map((e) => [{
      name: e.name,
      xAxis: new Date(e.start).getTime(),
      itemStyle: { color: e.color },
      label: { position: "insideTopLeft" as const, offset: [4, 6], fontSize: 9, fontWeight: "bold", color: e.lc, formatter: e.name },
    }, { xAxis: new Date(e.end).getTime() }]);

    return {
      backgroundColor: "transparent",
      tooltip: { trigger: "axis", ...tt, formatter: (params: any) => {
        const [ts, v] = params[0].value;
        const d = new Date(ts).toLocaleDateString("en", { month: "short", day: "numeric", year: "2-digit" });
        return `<div style="font-family:var(--font-mono);font-size:11px"><strong>${d}</strong><br/><span style="color:${primary}">${Number(v).toLocaleString()}</span> blobs</div>`;
      }},
      dataZoom: [
        { type: "inside", start: 0, end: 100 },
        { type: "slider", show: true, start: 0, end: 100, height: 18, bottom: 4, borderColor: "transparent", fillerColor: dark ? "rgba(139,123,255,0.08)" : "rgba(91,75,224,0.08)", handleStyle: { color: dark ? "rgba(139,123,255,0.4)" : "rgba(91,75,224,0.3)" }, textStyle: { color: dark ? "#68687D" : "#9C9CAE", fontSize: 9 } },
      ],
      grid: { top: 16, right: 12, bottom: 56, left: 10, containLabel: true },
      xAxis: { type: "time", ...ax, axisLabel: { ...ax.axisLabel, formatter: (v: number) => { const d = new Date(v); return `${d.toLocaleString("en", { month: "short" })} '${String(d.getFullYear()).slice(2)}`; } } },
      yAxis: { type: "value", ...ax, axisLabel: { ...ax.axisLabel, formatter: (v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}K` : String(v) } },
      series: [{ name: "Daily Blobs", type: "bar", data: points, barMaxWidth: 6, itemStyle: { color: dark ? "rgba(139,123,255,0.55)" : "rgba(91,75,224,0.5)", borderRadius: 0 }, markArea: { silent: true, data: markAreaData } }],
    } as EChartsOption;
  }, [data, dark]);

  // ── 11. Historical blob cost (line + epoch bands + log scale) ─────────────
  const historicalCostOption: EChartsOption = useMemo(() => {
    if (!data?.historical_cost) return {} as EChartsOption;
    const ax = axisBase(dark); const tt = tooltipBase(dark);
    const points = data.historical_cost.map((d: any) => [new Date(d.day).getTime(), d.fee_gwei === 0 ? null : d.fee_gwei]);

    const posVals = points.map((p: any) => p[1]).filter((v: any): v is number => v !== null && v > 0);
    const dataMax = posVals.length ? Math.max(...posVals) : 1;
    const axisMax = Math.pow(10, Math.ceil(Math.log10(dataMax)));

    const EPOCHS = [
      { name: "Dencun", start: "2024-03-13", end: "2025-05-06", color: "rgba(37,99,235,0.06)", lc: "rgba(96,165,250,0.4)" },
      { name: "Pectra", start: "2025-05-07", end: "2026-04-07", color: "rgba(5,150,105,0.06)",  lc: "rgba(52,211,153,0.4)" },
      { name: "Fusaka", start: "2026-04-08", end: "2099-01-01", color: "rgba(124,58,237,0.06)", lc: "rgba(167,139,250,0.4)" },
    ];

    const markAreaData = EPOCHS.map((e) => [{
      name: e.name,
      xAxis: new Date(e.start).getTime(),
      itemStyle: { color: e.color },
      label: { position: "insideTopLeft" as const, offset: [4, 6], fontSize: 9, fontWeight: "bold", color: e.lc, formatter: e.name },
    }, { xAxis: new Date(e.end).getTime() }]);

    return {
      backgroundColor: "transparent",
      tooltip: { trigger: "axis", ...tt, formatter: (params: any) => {
        const [ts, v] = params[0].value;
        const d = new Date(ts).toLocaleDateString("en", { month: "short", day: "numeric", year: "2-digit" });
        return `<div style="font-family:var(--font-mono);font-size:11px"><strong>${d}</strong><br/><span style="color:#059669">${v == null ? "—" : Number(v).toFixed(5)}</span> Gwei avg</div>`;
      }},
      dataZoom: [
        { type: "inside", start: 0, end: 100 },
        { type: "slider", show: true, start: 0, end: 100, height: 18, bottom: 4, borderColor: "transparent", fillerColor: dark ? "rgba(5,150,105,0.08)" : "rgba(5,150,105,0.08)", handleStyle: { color: dark ? "rgba(5,150,105,0.4)" : "rgba(5,150,105,0.3)" }, textStyle: { color: dark ? "#68687D" : "#9C9CAE", fontSize: 9 } },
      ],
      grid: { top: 16, right: 12, bottom: 56, left: 10, containLabel: true },
      xAxis: { type: "time", ...ax, axisLabel: { ...ax.axisLabel, formatter: (v: number) => { const d = new Date(v); return `${d.toLocaleString("en", { month: "short" })} '${String(d.getFullYear()).slice(2)}`; } } },
      yAxis: { type: "log", min: "dataMin" as any, max: axisMax, ...ax, axisLabel: { ...ax.axisLabel, formatter: (v: number) => v < 0.001 ? v.toExponential(1) : v.toFixed(4) } },
      series: [{
        name: "Avg Fee (Gwei)", type: "line", data: points, connectNulls: true, smooth: 0.2, symbol: "none",
        lineStyle: { color: "#059669", width: 1.5 },
        areaStyle: { color: { type: "linear", x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: "rgba(5,150,105,0.25)" }, { offset: 1, color: "rgba(5,150,105,0.02)" }] } },
        markArea: { silent: true, data: markAreaData },
      }],
    } as EChartsOption;
  }, [data, dark]);

  // ── Filtered leaderboard ──────────────────────────────────────────────────
  const filteredMatrix = useMemo(() => {
    if (!data?.rollup_matrix) return [];
    return data.rollup_matrix.filter((row: any) =>
      !searchQuery ||
      row.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      row.batcher.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [data, searchQuery]);

  // ── Cheapest/priciest UTC windows from cost_heatmap ────────────────────────
  const timingInsights = useMemo(() => {
    if (!data?.cost_heatmap) return null;
    const HOURS = ["12am","1am","2am","3am","4am","5am","6am","7am","8am","9am","10am","11am","12pm","1pm","2pm","3pm","4pm","5pm","6pm","7pm","8pm","9pm","10pm","11pm"];
    const byHour: Record<number, number[]> = {};
    data.cost_heatmap.forEach(([hour, , cost]: number[]) => {
      if (!byHour[hour]) byHour[hour] = [];
      byHour[hour].push(cost);
    });
    const avgByHour = Object.entries(byHour).map(([h, vals]) => ({ hour: Number(h), avg: vals.reduce((s, v) => s + v, 0) / vals.length }));
    avgByHour.sort((a, b) => a.avg - b.avg);
    return {
      cheapest: avgByHour.slice(0, 3).map(h => HOURS[h.hour]),
      priciest: [...avgByHour].reverse().slice(0, 3).map(h => HOURS[h.hour]),
    };
  }, [data]);

  // ── 12. Amortized cost per L2 tx (horizontal bar) ─────────────────────────
  const amortizedCostOption: EChartsOption = useMemo(() => {
    if (!data?.amortized_cost_trend) return {};
    const ax = axisBase(dark); const tt = tooltipBase(dark);
    const items = [...data.amortized_cost_trend].sort((a: any, b: any) => b.cost_per_tx - a.cost_per_tx);
    return {
      backgroundColor: "transparent",
      tooltip: { trigger: "axis", ...tt, formatter: (params: any) =>
        `<div style="font-family:var(--font-mono);font-size:11px"><strong>${params[0]?.axisValue}</strong><br/>Amortized cost: <strong style="color:${params[0]?.color}">$${Number(params[0]?.value).toFixed(4)}</strong> per L2 tx</div>`,
      },
      grid: { top: 8, right: 48, bottom: 8, left: 10, containLabel: true },
      xAxis: { type: "value", ...ax, axisLabel: { ...ax.axisLabel, formatter: (v: number) => `$${v.toFixed(3)}` } },
      yAxis: { type: "category", data: items.map((c: any) => c.rollup), ...ax },
      series: [{
        type: "bar",
        data: items.map((c: any) => ({ value: c.cost_per_tx, itemStyle: { color: c.color, borderRadius: [0, 4, 4, 0] } })),
        label: { show: true, position: "right", formatter: (p: any) => `$${Number(p.value).toFixed(4)}`, color: ax.axisLabel.color, fontFamily: "var(--font-mono)", fontSize: 9 },
      }],
    };
  }, [data, dark]);

  // ── 13. Blob fullness ratio per rollup (horizontal bar) ─────────────────
  const blobFullnessOption: EChartsOption = useMemo(() => {
    if (!data?.blob_fullness_trend) return {};
    const ax = axisBase(dark); const tt = tooltipBase(dark);
    const items = [...data.blob_fullness_trend].sort((a: any, b: any) => a.fullness_pct - b.fullness_pct);
    return {
      backgroundColor: "transparent",
      tooltip: { trigger: "axis", ...tt, formatter: (params: any) =>
        `<div style="font-family:var(--font-mono);font-size:11px"><strong>${params[0]?.axisValue}</strong><br/>Blob fullness: <strong style="color:${params[0]?.color}">${Number(params[0]?.value).toFixed(1)}%</strong> of 128 KB</div>`,
      },
      grid: { top: 8, right: 40, bottom: 8, left: 10, containLabel: true },
      xAxis: { type: "value", min: 60, max: 100, ...ax, axisLabel: { ...ax.axisLabel, formatter: (v: number) => `${v}%` } },
      yAxis: { type: "category", data: items.map((c: any) => c.rollup), ...ax },
      series: [{
        type: "bar",
        data: items.map((c: any) => ({ value: c.fullness_pct, itemStyle: { color: c.color, borderRadius: [0, 4, 4, 0] } })),
        label: { show: true, position: "right", formatter: (p: any) => `${Number(p.value).toFixed(1)}%`, color: ax.axisLabel.color, fontFamily: "var(--font-mono)", fontSize: 9 },
        markLine: { silent: true, symbol: "none", lineStyle: { color: dark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.12)", type: "dashed" },
          data: [{ xAxis: 90, label: { formatter: "90% target", position: "end", color: ax.axisLabel.color, fontSize: 9, fontFamily: "var(--font-mono)" } }],
        },
      }],
    };
  }, [data, dark]);

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-5 w-full max-w-7xl mx-auto py-2 font-sans">

      {/* ── Header ── */}
      <div className="flex flex-col gap-3 pb-4 border-b border-dashed border-[var(--border)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2 font-mono text-[10px]">
            <span className="px-2 py-0.5 font-bold tracking-widest text-[var(--primary-text)] bg-[var(--primary-bg)] border border-[var(--primary-border)] uppercase rounded-[4px]">
              [ EIP-4844 ROLLUP DA OBSERVATORY ]
            </span>
            <span className="px-2 py-0.5 border border-[var(--border)] rounded-[4px] text-[var(--text-secondary)]">
              L2 ROLLUP THROUGHPUT &amp; COMPRESSION EFFICIENCY
            </span>
          </div>
          <button
            onClick={loadData}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[4px] bg-[var(--surface-sunken)] border border-[var(--border)] text-xs font-mono font-bold text-[var(--text-primary)] hover:border-[var(--primary-border)] transition-all uppercase tracking-wider"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-[var(--primary-text)]" : ""}`} />
            [ SYNC DA MATRIX ]
          </button>
        </div>

        <div className="space-y-1.5">
          <PixelHeading className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--text-primary)] font-sans">
            How efficiently are Ethereum L2 Rollups consuming Blob Data Availability?
          </PixelHeading>
          <p className="max-w-3xl text-xs text-[var(--text-secondary)] leading-relaxed">
            BlobLens tracks L2 rollup throughput, EIP-4844 gas expenditures, payload compression ratios, fee market timing, and long-term growth from Dencun → Pectra → Fusaka.
          </p>
        </div>

        {/* data confidence tiers */}
        <div className="p-2.5 bg-[var(--surface-sunken)] border border-dashed border-[var(--border)] rounded-[6px] flex flex-wrap items-center justify-between gap-2.5 text-xs font-mono">
          <span className="font-bold text-[var(--text-primary)] text-[10px] uppercase tracking-wider">DATA CONFIDENCE TIERS:</span>
          <div className="flex flex-wrap items-center gap-3.5 text-[10px]">
            <span className="flex items-center gap-1 text-[var(--success)] font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--success)]" />
              🟢 1. LIVE ON-CHAIN
              <ProvenanceTooltip source="Ethereum Mainnet" method="EIP-4844 Blob Sidecar decoding" scope="On-Chain Contracts" confidence="Verified" />
            </span>
            <span className="flex items-center gap-1 text-[var(--primary-text)] font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--primary)]" />
              🔵 2. OBSERVED TELEMETRY
              <ProvenanceTooltip source="BlobLens Reth Node" method="Payload decompression & packing audit" scope="BlobLens Node" confidence="Observed" />
            </span>
          </div>
        </div>
      </div>

      {/* ── Filter bar ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-[var(--surface-sunken)] border border-[var(--border)] rounded-[8px]">
        <TimeRangePicker value={dateRange} onChange={setDateRange} presets={["7d", "30d", "90d", "custom"]} />
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-mono text-[var(--text-muted)] uppercase tracking-wider">Category:</span>
          <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}
            className="h-7 px-2.5 bg-[var(--surface-1)] border border-[var(--border)] rounded-[4px] text-[10px] font-mono text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary)] uppercase">
            <option value="all">All Rollups</option>
            <option value="optimistic">Optimistic</option>
            <option value="op stack">OP Stack</option>
            <option value="zk">ZK / zkEVM</option>
          </select>
        </div>
      </div>

      {/* ── GAP 2: Market Regime Status + 12-slot Congestion Forecast ── */}
      {data?.market_regime && (() => {
        const mr = data.market_regime;
        const REGIME_COLOR: Record<string, string> = {
          undersaturated: "#64748B", healthy: "#059669", congested: "#D97706", spike: "#DC2626",
        };
        const REGIME_BG: Record<string, string> = {
          undersaturated: "rgba(100,116,139,0.08)", healthy: "rgba(5,150,105,0.08)",
          congested: "rgba(217,119,6,0.08)", spike: "rgba(220,38,38,0.08)",
        };
        const rc = REGIME_COLOR[mr.current_regime] ?? "#059669";
        const rb = REGIME_BG[mr.current_regime] ?? "rgba(5,150,105,0.08)";
        return (
          <div className="rounded-[8px] border border-dashed p-4 font-mono" style={{ borderColor: `${rc}50`, backgroundColor: rb }}>
            <div className="flex flex-wrap items-start gap-4">
              {/* Left: regime status */}
              <div className="flex flex-col gap-2 min-w-[220px]">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full animate-pulse shrink-0" style={{ backgroundColor: rc }} />
                  <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: rc }}>
                    BLOB MARKET REGIME — {mr.regime_label}
                  </span>
                </div>
                <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed max-w-sm">{mr.description}</p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[10px] pt-1">
                  {[
                    { label: "Blobs/Block", val: `${mr.current_blobs_per_block} / ${mr.max_blobs_per_block}` },
                    { label: "Base Fee", val: `${mr.current_base_fee_gwei} Gwei` },
                    { label: "Excess Blob Gas", val: Number(mr.excess_blob_gas).toLocaleString() },
                    { label: "Spike (12 slots)", val: `${mr.spike_probability_12_slots}%` },
                  ].map(({ label, val }) => (
                    <div key={label}>
                      <span className="text-[var(--text-muted)]">{label}: </span>
                      <strong className="text-[var(--text-primary)]">{val}</strong>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right: 12-slot forecast */}
              <div className="flex-1 min-w-[280px]">
                <div className="text-[9px] uppercase tracking-widest text-[var(--text-muted)] mb-2">12-SLOT CONGESTION FORECAST</div>
                <div className="flex items-end gap-1 h-12">
                  {mr.forecast_12_slots.map((slot: any) => {
                    const slotColor = REGIME_COLOR[slot.regime] ?? "#059669";
                    const heightPct = (slot.expected_blobs / mr.max_blobs_per_block) * 100;
                    return (
                      <div key={slot.slot} className="flex flex-col items-center gap-0.5 flex-1 group relative">
                        <div className="w-full rounded-sm transition-all" style={{ height: `${heightPct}%`, minHeight: 4, backgroundColor: slotColor, opacity: 0.85 }} />
                        <div className="absolute bottom-full mb-6 left-1/2 -translate-x-1/2 hidden group-hover:block bg-[var(--surface-1)] border border-[var(--border)] px-1.5 py-1 rounded-[4px] text-[9px] text-[var(--text-primary)] whitespace-nowrap z-10 pointer-events-none shadow-lg">
                          {slot.slot}: {slot.expected_blobs} blobs · <span style={{ color: slotColor }}>{slot.regime}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="flex items-center gap-3 mt-2 text-[9px] text-[var(--text-muted)]">
                  {[
                    { label: "Healthy",      color: "#059669" },
                    { label: "Congested",    color: "#D97706" },
                    { label: "Spike",        color: "#DC2626" },
                  ].map(({ label, color }) => (
                    <span key={label} className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-sm" style={{ backgroundColor: color }} />
                      {label}
                    </span>
                  ))}
                  <span className="ml-auto text-[var(--text-muted)]">Hover bars for detail</span>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── KPI cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <DottedCard title="Total Blobs Submitted" badge="🟢 Blobs" badgeType="default" techBracket>
          <div className="flex flex-col gap-0.5 py-0.5 font-mono">
            <span className="text-2xl font-bold text-[var(--text-primary)] tabular-nums">{fmtK(data?.kpi_summary?.total_blobs || 0)}</span>
            <span className="text-xs text-[var(--text-secondary)] font-sans">Volume: {data?.kpi_summary?.total_data_gb || 0} GB</span>
          </div>
        </DottedCard>
        <DottedCard title="Total DA Fees Paid" badge="🟢 Fees" badgeType="iris" techBracket>
          <div className="flex flex-col gap-0.5 py-0.5 font-mono">
            <span className="text-2xl font-bold text-[var(--primary-text)] tabular-nums">{fmtUsd(data?.kpi_summary?.total_da_fee_usd || 0)}</span>
            <span className="text-xs text-[var(--text-secondary)] font-sans">Avg: {data?.kpi_summary?.avg_blob_cost_gwei || 0.042} gwei/blob</span>
          </div>
        </DottedCard>
        <DottedCard title="Avg Compression Ratio" badge="🔵 Compression" badgeType="iris" techBracket>
          <div className="flex flex-col gap-0.5 py-0.5 font-mono">
            <span className="text-2xl font-bold text-[var(--text-primary)] tabular-nums">{data?.kpi_summary?.avg_compression_ratio || 0}x</span>
            <span className="text-xs text-[var(--text-secondary)] font-sans">zstd / brotli payload packing</span>
          </div>
        </DottedCard>
        <DottedCard title="Target Capacity Load" badge="🟢 Capacity" badgeType="default" techBracket>
          <div className="flex flex-col gap-0.5 py-0.5 font-mono">
            <span className="text-2xl font-bold text-[var(--success)] tabular-nums">{data?.kpi_summary?.target_capacity_pct || 0}%</span>
            <span className="text-xs text-[var(--text-secondary)] font-sans">Target Load Factor</span>
          </div>
        </DottedCard>
      </div>

      {/* ── SECTION: Market Share ── */}
      <SectionLabel label="ROLLUP MARKET SHARE" icon={BarChart3} id="market-share" />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <DottedCard title="L2 Rollup Blob Throughput" subtitle="Blob submissions per period across filtered L2 rollups" badge="🟢 Throughput" badgeType="default" techBracket className="lg:col-span-2">
          <EChartWrapper option={throughputOption} style={{ height: "240px", width: "100%" }} loading={loading} />
        </DottedCard>

        <DottedCard title="Rollup Blob Volume Share" subtitle="% distribution of total blob data" badge="🟢 Share" badgeType="iris" techBracket className="lg:col-span-1">
          <EChartWrapper option={shareDonutOption} style={{ height: "190px", width: "100%" }} showFooter={false} loading={loading} />
          <div className="grid grid-cols-2 gap-1 text-[10px] font-mono pt-1.5 border-t border-dashed border-[var(--border)]">
            {data?.rollup_share_distribution?.slice(0, 4).map((item: any, idx: number) => (
              <span key={idx} className="flex items-center gap-1 text-[var(--text-secondary)]">
                <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                {item.name}: <strong className="text-[var(--text-primary)]">{item.value}%</strong>
              </span>
            ))}
          </div>
          <ChartFooter />
        </DottedCard>
      </div>

      {/* ── SECTION: Fee Market Intelligence ── */}
      <SectionLabel label="FEE MARKET INTELLIGENCE" icon={TrendingUp} id="fee-market" />

      {/* Fee percentile bands — full width */}
      <DottedCard
        title="Blob Base Fee Percentile Bands (P25 / P50 / P75 / P95)"
        subtitle="Fee spread reveals coordination quality — a wide P95-P50 gap signals uncoordinated burst submissions"
        badge="🟢 Fee Spread" badgeType="iris" techBracket
      >
        <EChartWrapper option={feePercentilesOption} style={{ height: "220px", width: "100%" }} loading={loading} />
        <div className="flex flex-wrap items-center gap-4 pt-2 border-t border-dashed border-[var(--border)] text-[10px] font-mono text-[var(--text-muted)]">
          <span className="flex items-center gap-1"><span className="w-3 h-0.5 rounded bg-[#059669] inline-block" /> P50 Median</span>
          <span className="flex items-center gap-1"><span className="w-3 h-0.5 rounded inline-block" style={{ background: "rgba(139,123,255,0.5)" }} /> P25–P75 Band</span>
          <span className="flex items-center gap-1 opacity-70"><span className="w-3 h-0.5 rounded border-t-2 border-dashed border-[#DC2626] inline-block" style={{ borderStyle: "dashed" }} /> P95 Spike</span>
          <span className="ml-auto text-[var(--text-muted)]">Gwei per blob · all rollups combined</span>
        </div>
      </DottedCard>

      {/* Cost heatmap + timing insights */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <DottedCard
          title="Blob Cost Heatmap — UTC Hour × Day of Week"
          subtitle="Darker = more expensive. Post blobs in cold windows to minimize DA costs"
          badge="🟢 Cost Schedule" badgeType="default" techBracket
          className="lg:col-span-2"
        >
          <EChartWrapper option={costHeatmapOption} style={{ height: "220px", width: "100%" }} loading={loading} showFooter={false} />
          <ChartFooter />
        </DottedCard>

        <DottedCard title="Optimal Posting Windows" subtitle="UTC hours with lowest avg blob cost — target these for DA submissions" badge="🔵 Timing" badgeType="iris" techBracket className="lg:col-span-1">
          <div className="flex flex-col gap-3 py-1 font-mono">
            <div className="space-y-2">
              <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-widest font-bold">
                <span className="text-[var(--success)]">✓</span> CHEAPEST WINDOWS
              </p>
              {timingInsights?.cheapest.map((h, i) => (
                <div key={i} className="flex items-center justify-between px-2.5 py-1.5 rounded-[4px] bg-[var(--surface-sunken)] border border-dashed border-[var(--border)]">
                  <span className="text-[11px] font-bold text-[var(--text-primary)]">{h} UTC</span>
                  <span className="text-[9px] text-[var(--success)] font-bold">LOW COST</span>
                </div>
              ))}
            </div>
            <div className="border-t border-dashed border-[var(--border)] pt-3 space-y-2">
              <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-widest font-bold">
                <span className="text-[var(--accent)]">✗</span> EXPENSIVE WINDOWS
              </p>
              {timingInsights?.priciest.map((h, i) => (
                <div key={i} className="flex items-center justify-between px-2.5 py-1.5 rounded-[4px] bg-[var(--surface-sunken)] border border-dashed border-[var(--border)]">
                  <span className="text-[11px] font-bold text-[var(--text-primary)]">{h} UTC</span>
                  <span className="text-[9px] text-[var(--accent)] font-bold">HIGH COST</span>
                </div>
              ))}
            </div>
          </div>
          <ChartFooter />
        </DottedCard>
      </div>

      {/* ── SECTION: Rollup Telemetry ── */}
      <SectionLabel label="ROLLUP TELEMETRY" icon={Activity} id="telemetry" />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <DottedCard title="L2 Rollup DA Gas Expenditure ($ USD)" subtitle="Cumulative USD spent on L1 blob base fees per period" badge="🟢 DA Gas Fees" badgeType="iris" techBracket className="lg:col-span-2">
          <EChartWrapper option={feesOption} style={{ height: "240px", width: "100%" }} loading={loading} />
        </DottedCard>
        <DottedCard title="Payload Compression Ratio (x)" subtitle="Data compression multiplier per rollup" badge="🔵 Compression" badgeType="default" techBracket className="lg:col-span-1">
          <EChartWrapper option={compressionOption} style={{ height: "240px", width: "100%" }} loading={loading} />
        </DottedCard>
      </div>

      {/* Stacked volume area */}
      <DottedCard title="Daily Blob Volume by Rollup (Stacked)" subtitle="Relative contribution of each L2 across the selected period" badge="🟢 Volume Breakdown" badgeType="default" techBracket>
        <EChartWrapper option={volumeAreaOption} style={{ height: "260px", width: "100%" }} loading={loading} />
      </DottedCard>

      {/* ── SECTION: Timing & Coordination ── */}
      <SectionLabel label="TIMING &amp; COORDINATION" icon={Clock} id="timing" />

      <DottedCard
        title="Rollup Submission Timing — UTC Hour Distribution"
        subtitle="When each rollup posts blobs relative to the clock. Clusters = congestion risk. Gaps = cheap windows"
        badge="🟢 Submission Timing" badgeType="live" techBracket
      >
        <EChartWrapper option={submissionTimingOption} style={{ height: `${Math.max(200, (data?.rollup_matrix?.length || 8) * 36 + 80)}px`, width: "100%" }} loading={loading} />
        <p className="text-[10px] font-mono text-[var(--text-muted)] pt-1">
          Brighter = more blob submissions in that UTC hour. Rollups sharing peak hours compete for the same fee window.
        </p>
      </DottedCard>

      {/* ── SECTION: Efficiency Analysis ── */}
      <SectionLabel label="EFFICIENCY ANALYSIS" icon={Database} id="efficiency" />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <DottedCard title="Packing vs Timing Efficiency Scatter" subtitle="Top-right quadrant = optimal DA strategy. Bubble size = total blob volume" badge="🔵 Efficiency" badgeType="iris" techBracket className="lg:col-span-2">
          <EChartWrapper option={efficiencyScatterOption} style={{ height: "280px", width: "100%" }} loading={loading} showFooter={false} />
          <div className="flex items-center gap-5 pt-1.5 border-t border-dashed border-[var(--border)] text-[10px] font-mono">
            {[{ color: "#059669", label: "≥ 90 Excellent" }, { color: "#D97706", label: "80–90 Good" }, { color: "#DC2626", label: "< 80 Needs Work" }].map(({ color, label }) => (
              <span key={label} className="flex items-center gap-1.5 text-[var(--text-secondary)]">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />{label}
              </span>
            ))}
          </div>
          <ChartFooter />
        </DottedCard>

        <DottedCard title="Efficiency Scoring Guide" subtitle="How packing and timing scores are computed" badge="🔵 Methodology" badgeType="iris" techBracket className="lg:col-span-1">
          <div className="flex flex-col gap-3 py-1 font-mono text-[11px]">
            <div className="p-2.5 rounded-[4px] bg-[var(--surface-sunken)] border border-dashed border-[var(--border)] space-y-1">
              <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--primary-text)]">PACKING SCORE</p>
              <p className="text-[var(--text-secondary)] leading-relaxed">Blobs per tx vs theoretical max (6). Higher = rollup fills blobs efficiently, reducing per-blob overhead.</p>
            </div>
            <div className="p-2.5 rounded-[4px] bg-[var(--surface-sunken)] border border-dashed border-[var(--border)] space-y-1">
              <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--primary-text)]">TIMING SCORE</p>
              <p className="text-[var(--text-secondary)] leading-relaxed">Posts during below-average fee windows vs network average. Higher = avoids expensive UTC hours.</p>
            </div>
            <div className="p-2.5 rounded-[4px] bg-[var(--primary-bg)] border border-dashed border-[var(--primary-border)] space-y-1">
              <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--primary-text)]">COMPOSITE</p>
              <p className="text-[var(--text-secondary)] leading-relaxed">Average of both. Top-right quadrant on scatter = high packing AND good timing.</p>
            </div>
            <div className="text-center text-[10px] text-[var(--text-muted)] pt-1">
              Avg Packing: <strong className="text-[var(--text-primary)]">{data?.kpi_summary?.avg_packing_score ?? "—"}</strong> &nbsp;·&nbsp;
              Avg Timing: <strong className="text-[var(--text-primary)]">{data?.kpi_summary?.avg_timing_score ?? "—"}</strong>
            </div>
          </div>
          <ChartFooter />
        </DottedCard>
      </div>

      {/* Amortized cost + Blob fullness */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <DottedCard
          title="Amortized DA Cost per L2 Transaction"
          subtitle="Total blob fees divided by estimated L2 txs per blob. Lower = rollup packs more L2 txs per blob submission — end-users pay less."
          badge="🔵 Cost / L2 Tx" badgeType="iris" techBracket
        >
          <EChartWrapper option={amortizedCostOption} style={{ height: `${Math.max(160, (data?.amortized_cost_trend?.length || 8) * 28 + 40)}px`, width: "100%" }} loading={loading} showFooter={false} />
          <div className="pt-2 border-t border-dashed border-[var(--border)] text-[10px] font-mono text-[var(--text-muted)] flex items-center justify-between">
            <span>USD cost born by each L2 user per transaction</span>
            <span className="text-[var(--primary-text)] font-bold">Avg: ${data?.kpi_summary?.avg_amortized_cost_tx?.toFixed(4) ?? "—"}</span>
          </div>
          <ChartFooter />
        </DottedCard>

        <DottedCard
          title="Blob Fullness Ratio per Rollup (%)"
          subtitle="What % of each 128 KB blob slot is actually used. 100% = perfectly packed. Below 90% = wasted DA capacity and inflated cost per byte."
          badge="🔵 Blob Fullness" badgeType="default" techBracket
        >
          <EChartWrapper option={blobFullnessOption} style={{ height: `${Math.max(160, (data?.blob_fullness_trend?.length || 8) * 28 + 40)}px`, width: "100%" }} loading={loading} showFooter={false} />
          <div className="pt-2 border-t border-dashed border-[var(--border)] text-[10px] font-mono text-[var(--text-muted)] flex items-center justify-between">
            <span>Dashed line = 90% efficiency threshold</span>
            <span className="text-[var(--primary-text)] font-bold">Avg: {data?.kpi_summary?.avg_blob_fullness ?? "—"}%</span>
          </div>
          <ChartFooter />
        </DottedCard>
      </div>

      {/* ── SECTION: DA Matrix Leaderboard ── */}
      <SectionLabel label="L2 DA MATRIX" icon={Database} id="da-matrix" />

      <DottedCard title="L2 Rollup Data Availability Matrix" subtitle="Blob throughput, fees, compression, packing score, and timing score per rollup" badge="🟢 DA Matrix" badgeType="live" techBracket>
        <div className="flex flex-wrap items-center justify-between gap-3 pb-2 mb-2">
          <div className="relative w-full sm:w-72">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2 text-[var(--text-muted)]" />
            <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search rollup name or batcher..."
              className="w-full h-7 pl-8 pr-3 bg-[var(--surface-sunken)] border border-[var(--border)] rounded-[4px] text-xs font-mono text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--primary)]" />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-dashed border-[var(--border)] text-[10px] font-mono uppercase tracking-widest text-[var(--text-muted)]">
                <th className="py-2 px-2.5">Rank &amp; Rollup</th>
                <th className="py-2 px-2.5">Category</th>
                <th className="py-2 px-2.5">Batcher</th>
                <th className="py-2 px-2.5">Total Blobs</th>
                <th className="py-2 px-2.5">Data Vol</th>
                <th className="py-2 px-2.5">DA Fees</th>
                <th className="py-2 px-2.5">Avg Cost</th>
                <th className="py-2 px-2.5">Compress</th>
                <th className="py-2 px-2.5">Pack</th>
                <th className="py-2 px-2.5">Timing</th>
                <th className="py-2 px-2.5">Efficiency</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)] text-xs font-mono">
              {filteredMatrix.map((row: any, idx: number) => {
                const effColor = row.efficiency_score >= 90 ? "var(--success)" : row.efficiency_score >= 80 ? "#D97706" : "#DC2626";
                return (
                  <tr key={idx} className="hover:bg-[var(--surface-sunken)] transition-colors">
                    <td className="py-2.5 px-2.5">
                      <div className="flex items-center gap-2">
                        <RollupIcon name={row.name} size={16} />
                        <span className="text-[var(--primary-text)] mr-0.5">#{row.rank}</span>
                        <span className="font-bold text-[var(--text-primary)]">{row.name}</span>
                      </div>
                    </td>
                    <td className="py-2.5 px-2.5 text-[var(--text-secondary)]">{row.category}</td>
                    <td className="py-2.5 px-2.5 text-[var(--text-muted)]">{row.batcher}</td>
                    <td className="py-2.5 px-2.5 font-bold text-[var(--text-primary)]">{fmtK(row.total_blobs)}</td>
                    <td className="py-2.5 px-2.5 text-[var(--text-secondary)]">{row.data_gb} GB</td>
                    <td className="py-2.5 px-2.5 font-bold text-[var(--success)]">{fmtUsd(row.total_fee_usd)}</td>
                    <td className="py-2.5 px-2.5 text-[var(--text-secondary)]">{row.cost_per_blob_gwei} gwei</td>
                    <td className="py-2.5 px-2.5 font-bold text-[var(--primary-text)]">{row.compression_ratio}</td>
                    <td className="py-2.5 px-2.5">
                      <span className="px-1.5 py-0.5 rounded-[3px] bg-[var(--primary-bg)] border border-[var(--primary-border)] text-[var(--primary-text)] font-bold text-[9px]">{row.packing_score}</span>
                    </td>
                    <td className="py-2.5 px-2.5">
                      <span className="px-1.5 py-0.5 rounded-[3px] bg-[var(--surface-sunken)] border border-[var(--border)] text-[var(--text-secondary)] font-bold text-[9px]">{row.timing_score}</span>
                    </td>
                    <td className="py-2.5 px-2.5">
                      <span className="px-1.5 py-0.5 rounded-[3px] font-bold text-[9px]" style={{ backgroundColor: `${effColor}18`, border: `1px solid ${effColor}40`, color: effColor }}>{row.efficiency_score}/100</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </DottedCard>

      {/* ── SECTION: Long-Term History ── */}
      <SectionLabel label="LONG-TERM HISTORY // DENCUN → PECTRA → FUSAKA" icon={Activity} id="history" />

      <DottedCard
        title="Daily Blob Volume — All-Time (Dencun → Now)"
        subtitle="Epoch bands show the BPO upgrade impact on blob capacity and adoption"
        badge="🟢 Historical Volume" badgeType="default" techBracket
      >
        <EChartWrapper option={historicalVolumeOption} style={{ height: "280px", width: "100%" }} loading={loading} />
        <div className="flex flex-wrap items-center gap-4 pt-2 border-t border-dashed border-[var(--border)] text-[10px] font-mono">
          {[{ color: "rgba(37,99,235,0.4)", label: "Dencun (EIP-4844)" }, { color: "rgba(5,150,105,0.4)", label: "Pectra (EIP-7691)" }, { color: "rgba(124,58,237,0.4)", label: "Fusaka (BPO2)" }].map(({ color, label }) => (
            <span key={label} className="flex items-center gap-1.5 text-[var(--text-muted)]">
              <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ backgroundColor: color }} />{label}
            </span>
          ))}
        </div>
      </DottedCard>

      <DottedCard
        title="Daily Avg Blob Base Fee — All-Time (Log Scale)"
        subtitle="Fee history across epochs — log scale reveals relative changes across order-of-magnitude fee swings"
        badge="🟢 Historical Cost" badgeType="iris" techBracket
      >
        <EChartWrapper option={historicalCostOption} style={{ height: "280px", width: "100%" }} loading={loading} />
        <div className="flex flex-wrap items-center gap-4 pt-2 border-t border-dashed border-[var(--border)] text-[10px] font-mono">
          <span className="flex items-center gap-1.5 text-[var(--text-muted)]">
            <span className="w-3 h-0.5 rounded inline-block bg-[#059669]" /> Avg Gwei (log scale)
          </span>
          <span className="ml-auto text-[var(--text-muted)]">Drag to zoom · Alt+scroll to pan</span>
        </div>
      </DottedCard>

    </div>
  );
}
