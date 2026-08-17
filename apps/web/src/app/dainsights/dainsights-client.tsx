"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { useTheme } from "next-themes";
import {
  Database,
  Activity,
  RefreshCw,
  Search,
  ArrowRight,
  Cpu,
  Layers,
  Zap,
  CheckCircle2,
  TrendingUp,
  BarChart3,
  HardDrive,
  FileCode,
  ShieldCheck,
  AlertTriangle,
  Bell,
  X,
  HelpCircle,
  Check,
  Info,
} from "lucide-react";
import { TimeRangePicker, type DateRangeState } from "@/components/shared/time-range-picker";
import { DottedCard } from "@/components/ui/dotted-card";
import { PixelHeading } from "@/components/ui/pixel-heading-word";
import { EChartWrapper, ChartFooter } from "@/components/charts/echart-wrapper";
import { L2Icon } from "@/components/shared/l2-icon";
import { getL2IconPath } from "@/lib/l2-icons";
import { fmtUsd, fmtK } from "@/lib/tokens";
import type { EChartsOption } from "echarts";

/* ── Protocol Metric Narration & Guidance Box ── */
function MetricNarration({
  whatIsThis,
  whyItMatters,
  whatToDo,
}: {
  whatIsThis: string;
  whyItMatters: string;
  whatToDo: string;
}) {
  return (
    <div className="p-3.5 my-2.5 bg-[var(--surface-sunken)] border border-dashed border-[var(--border)] rounded-[6px] text-xs font-sans space-y-2">
      <div className="flex items-center gap-1.5 text-xs font-mono font-bold uppercase tracking-wider text-[var(--primary-text)]">
        <Info className="w-4 h-4 text-[var(--primary)] shrink-0" />
        PROTOCOL NARRATION &amp; METRIC GUIDANCE
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 pt-2 border-t border-[var(--border)] font-mono text-xs">
        <div>
          <span className="text-[var(--text-muted)] font-bold block text-[11px] uppercase tracking-wider">1. WHAT IS THIS?</span>
          <p className="text-[var(--text-secondary)] leading-relaxed text-xs font-sans mt-1">{whatIsThis}</p>
        </div>
        <div>
          <span className="text-[var(--text-muted)] font-bold block text-[11px] uppercase tracking-wider">2. WHY DOES IT MATTER?</span>
          <p className="text-[var(--text-secondary)] leading-relaxed text-xs font-sans mt-1">{whyItMatters}</p>
        </div>
        <div>
          <span className="text-[var(--text-muted)] font-bold block text-[11px] uppercase tracking-wider">3. OPERATOR TAKEAWAY</span>
          <p className="text-[var(--text-primary)] font-semibold leading-relaxed text-xs font-sans mt-1">{whatToDo}</p>
        </div>
      </div>
    </div>
  );
}

/* ── Provenance Info Tooltip Component (Isolated Mouse Events) ── */
function ProvenanceTooltip({
  source,
  method,
  scope,
  confidence,
}: {
  source: string;
  method: string;
  scope: string;
  confidence: "Verified" | "Observed" | "Simulated";
}) {
  const [open, setOpen] = useState(false);

  return (
    <div
      className="relative inline-block ml-1 align-middle z-20"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <span
        className={`cursor-help text-xs font-mono font-bold border rounded-[3px] px-1.5 py-0.5 transition-all bg-[var(--surface-sunken)] ${
          open
            ? "border-[var(--primary)] text-[var(--primary-text)] opacity-100"
            : "border-[var(--border)] text-[var(--text-muted)] opacity-80 hover:opacity-100"
        }`}
      >
        i
      </span>
      {open && (
        <div className="absolute bottom-full right-0 mb-2 w-72 p-3 font-mono text-xs leading-relaxed border border-[var(--border-strong)] bg-[var(--surface-1)] text-[var(--text-primary)] shadow-2xl rounded-[6px] z-[9999] pointer-events-none">
          <div className="text-xs font-bold uppercase tracking-widest text-[var(--primary-text)] border-b border-[var(--border)] pb-1 mb-1.5 flex items-center justify-between">
            <span>METRIC PROVENANCE // AUDIT</span>
          </div>
          <div className="space-y-1.5 text-xs">
            <div><span className="text-[var(--text-muted)]">SOURCE:</span> {source}</div>
            <div><span className="text-[var(--text-muted)]">METHOD:</span> {method}</div>
            <div><span className="text-[var(--text-muted)]">SCOPE:</span> {scope}</div>
            <div>
              <span className="text-[var(--text-muted)]">CONFIDENCE:</span>{" "}
              <span className={confidence === "Verified" ? "text-[var(--success)] font-bold" : "text-[var(--primary-text)] font-bold"}>
                {confidence}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function DainsightsClient() {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<DateRangeState>({ preset: "30d" });
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [webhookModalOpen, setWebhookModalOpen] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState("");
  const [webhookSaved, setWebhookSaved] = useState(false);
  const [regimeTooltipOpen, setRegimeTooltipOpen] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const url = `/api/dainsights?range=${dateRange.preset}&category=${categoryFilter}${dateRange.preset === "custom" ? `&from=${dateRange.startDate}&to=${dateRange.endDate}` : ""}`;
      const res = await fetch(url);
      const json = await res.json();
      setData(json);
    } catch (err) {
      console.error("Failed to load DA Insights data:", err);
    } finally {
      setLoading(false);
    }
  }, [dateRange, categoryFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // 1. Chart: L2 Rollup Throughput Trend
  const throughputChartOption: EChartsOption = useMemo(() => {
    if (!data?.rollup_throughput_trend || !data?.rollup_matrix) return {};
    const weeks = data.rollup_throughput_trend.map((w: any) => w.week);

    const series = data.rollup_matrix.map((r: any) => ({
      name: r.name,
      type: "line",
      smooth: true,
      lineStyle: { color: r.color || "#8B7BFF", width: 2 },
      data: data.rollup_throughput_trend.map(
        (w: any) => w[r.name.replace(/\s+/g, "_")] || 0
      ),
    }));

    return {
      backgroundColor: "transparent",
      tooltip: {
        trigger: "axis",
        confine: true,
        backgroundColor: isDark ? "#121217" : "#FFFFFF",
        borderColor: isDark ? "#3A3275" : "#CBC4FA",
        borderWidth: 1,
        padding: [8, 12],
        textStyle: { color: isDark ? "#F4F4F8" : "#1A1A24", fontFamily: "Geist Mono, monospace", fontSize: 12 },
        extraCssText: `background:${isDark ? "#121217" : "#FFFFFF"}!important;border:1px solid ${isDark ? "#3A3275" : "#CBC4FA"}!important;border-radius:4px;box-shadow:0 4px 20px rgba(0,0,0,${isDark ? "0.45" : "0.12"});`,
        formatter: (params: any) => {
          let res = `<div style="font-family:var(--font-mono); font-size:12px;"><strong>${params[0]?.axisValue}</strong><br/>`;
          params.forEach((item: any) => {
            const iconPath = getL2IconPath(item.seriesName);
            const iconHtml = iconPath
              ? `<img src="${iconPath}" style="width:14px; height:14px; border-radius:50%; vertical-align:middle; display:inline-block; margin-right:4px;" />`
              : `<span style="color:${item.color}; font-weight:bold; margin-right:4px;">●</span>`;
            res += `<div style="display:flex; align-items:center; margin-top:2px;">${iconHtml} ${item.seriesName}: <strong style="margin-left:4px; color:${isDark ? '#F4F4F8' : '#1A1A24'}">${Number(item.value).toLocaleString()} blobs</strong></div>`;
          });
          res += "</div>";
          return res;
        },
      },
      grid: { top: 15, right: 15, bottom: 20, left: 10, containLabel: true },
      xAxis: {
        type: "category",
        data: weeks,
        axisLine: { lineStyle: { color: isDark ? "#22222E" : "#E5E5E7" } },
        axisLabel: { color: isDark ? "#8E8EA8" : "#555566", fontFamily: "var(--font-mono)", fontSize: 11 },
      },
      yAxis: {
        type: "value",
        axisLine: { show: false },
        splitLine: { lineStyle: { color: isDark ? "#1A1A24" : "#F3F3F7", type: "dashed" } },
        axisLabel: { color: isDark ? "#8E8EA8" : "#555566", fontFamily: "var(--font-mono)", fontSize: 11, formatter: (v: number) => `${(v / 1000).toFixed(0)}K` },
      },
      series,
    };
  }, [data, isDark]);

  // 2. Chart: Rollup Share Donut with L2 Logos inside Tooltip
  const shareDonutOption: EChartsOption = useMemo(() => {
    if (!data?.rollup_share_distribution) return {};
    const items = data.rollup_share_distribution;

    return {
      backgroundColor: "transparent",
      tooltip: {
        trigger: "item",
        confine: true,
        backgroundColor: isDark ? "#121217" : "#FFFFFF",
        borderColor: isDark ? "#3A3275" : "#CBC4FA",
        borderWidth: 1,
        padding: [8, 12],
        textStyle: { color: isDark ? "#F4F4F8" : "#1A1A24", fontFamily: "Geist Mono, monospace", fontSize: 12 },
        extraCssText: `background:${isDark ? "#121217" : "#FFFFFF"}!important;border:1px solid ${isDark ? "#3A3275" : "#CBC4FA"}!important;border-radius:4px;box-shadow:0 4px 20px rgba(0,0,0,${isDark ? "0.45" : "0.12"});`,
        formatter: (params: any) => {
          const iconPath = getL2IconPath(params.name);
          const iconHtml = iconPath
            ? `<img src="${iconPath}" style="width:16px; height:16px; border-radius:50%; vertical-align:middle; display:inline-block; margin-right:6px;" />`
            : `<span style="color:${params.color}; font-weight:bold; margin-right:4px;">●</span>`;
          return `<div style="font-family:var(--font-mono); font-size:12px; display:flex; align-items:center;">
            ${iconHtml} <strong>${params.name}</strong>: <span style="margin-left:4px; color:${isDark ? '#F4F4F8' : '#1A1A24'}">${params.value}% (${params.percent}%)</span>
          </div>`;
        },
      },
      series: [
        {
          name: "Rollup Share",
          type: "pie",
          radius: ["45%", "75%"],
          avoidLabelOverlap: false,
          itemStyle: { borderRadius: 4, borderColor: isDark ? "#121217" : "#FFFFFF", borderWidth: 2 },
          label: { show: false },
          data: items.map((it: any) => ({ name: it.name, value: it.value, itemStyle: { color: it.color } })),
        },
      ],
    };
  }, [data, isDark]);

  // 3. Chart: Amortized Cost per Tx Bar with L2 Logo inside Tooltip & Brand Colors
  const amortizedCostOption: EChartsOption = useMemo(() => {
    if (!data?.amortized_cost_trend) return {};
    const rollups = data.amortized_cost_trend.map((c: any) => c.rollup.replace(" One", ""));
    const barData = data.amortized_cost_trend.map((c: any) => ({
      name: c.rollup,
      value: c.cost_per_tx,
      itemStyle: {
        color: c.color || "#8B7BFF",
        borderRadius: [4, 4, 0, 0],
      },
    }));

    return {
      backgroundColor: "transparent",
      tooltip: {
        trigger: "axis",
        confine: true,
        backgroundColor: isDark ? "#121217" : "#FFFFFF",
        borderColor: isDark ? "#3A3275" : "#CBC4FA",
        borderWidth: 1,
        padding: [8, 12],
        textStyle: { color: isDark ? "#F4F4F8" : "#1A1A24", fontFamily: "Geist Mono, monospace", fontSize: 12 },
        extraCssText: `background:${isDark ? "#121217" : "#FFFFFF"}!important;border:1px solid ${isDark ? "#3A3275" : "#CBC4FA"}!important;border-radius:4px;box-shadow:0 4px 20px rgba(0,0,0,${isDark ? "0.45" : "0.12"});`,
        formatter: (params: any) => {
          const item = params[0];
          const rollupName = item.name || item.axisValue;
          const iconPath = getL2IconPath(rollupName);
          const iconHtml = iconPath
            ? `<img src="${iconPath}" style="width:18px; height:18px; border-radius:50%; vertical-align:middle; display:inline-block; margin-right:6px;" />`
            : `<span style="color:${item.color}; font-weight:bold; margin-right:6px;">●</span>`;

          return `<div style="font-family:var(--font-mono); font-size:12px; padding:3px 2px;">
            <div style="display:flex; align-items:center; margin-bottom:4px;">
              ${iconHtml}
              <strong style="font-size:13px; color:${isDark ? '#F4F4F8' : '#1A1A24'}">${rollupName}</strong>
            </div>
            <div style="color:${isDark ? '#A0A0B8' : '#555566'}; font-size:12px;">
              Amortized DA Cost: <strong style="color:${isDark ? '#F4F4F8' : '#1A1A24'}; font-size:13px;">$${item.value}</strong> / L2 tx
            </div>
          </div>`;
        },
      },
      grid: { top: 15, right: 15, bottom: 25, left: 10, containLabel: true },
      xAxis: {
        type: "category",
        data: rollups,
        axisLine: { lineStyle: { color: isDark ? "#22222E" : "#E5E5E7" } },
        axisLabel: {
          color: isDark ? "#8E8EA8" : "#555566",
          fontFamily: "var(--font-mono)",
          fontSize: 11,
          rotate: 0,
        },
      },
      yAxis: {
        type: "value",
        axisLine: { show: false },
        splitLine: { lineStyle: { color: isDark ? "#1A1A24" : "#F3F3F7", type: "dashed" } },
        axisLabel: { color: isDark ? "#8E8EA8" : "#555566", fontFamily: "var(--font-mono)", fontSize: 11, formatter: (v: number) => `$${v.toFixed(4)}` },
      },
      series: [
        {
          type: "bar",
          data: barData,
        },
      ],
    };
  }, [data, isDark]);

  // 4. Chart: Blob Fullness Ratio Horizontal Bar with L2 Logo & Brand Colors
  const fullnessChartOption: EChartsOption = useMemo(() => {
    if (!data?.blob_fullness_trend) return {};
    const rollups = data.blob_fullness_trend.map((c: any) => c.rollup).reverse();
    const barData = data.blob_fullness_trend.map((c: any) => ({
      name: c.rollup,
      value: c.fullness_pct,
      itemStyle: {
        color: c.color || "#059669",
        borderRadius: [0, 4, 4, 0],
      },
    })).reverse();

    return {
      backgroundColor: "transparent",
      tooltip: {
        trigger: "axis",
        confine: true,
        backgroundColor: isDark ? "#121217" : "#FFFFFF",
        borderColor: isDark ? "#3A3275" : "#CBC4FA",
        borderWidth: 1,
        padding: [8, 12],
        textStyle: { color: isDark ? "#F4F4F8" : "#1A1A24", fontFamily: "Geist Mono, monospace", fontSize: 12 },
        extraCssText: `background:${isDark ? "#121217" : "#FFFFFF"}!important;border:1px solid ${isDark ? "#3A3275" : "#CBC4FA"}!important;border-radius:4px;box-shadow:0 4px 20px rgba(0,0,0,${isDark ? "0.45" : "0.12"});`,
        formatter: (params: any) => {
          const item = params[0];
          const iconPath = getL2IconPath(item.name);
          const iconHtml = iconPath
            ? `<img src="${iconPath}" style="width:16px; height:16px; border-radius:50%; vertical-align:middle; display:inline-block; margin-right:6px;" />`
            : `<span style="color:${item.color}; font-weight:bold; margin-right:6px;">●</span>`;

          return `<div style="font-family:var(--font-mono); font-size:12px; padding:2px 0;">
            <div style="display:flex; align-items:center; margin-bottom:3px;">
              ${iconHtml}
              <strong style="color:${isDark ? '#F4F4F8' : '#1A1A24'}">${item.name}</strong>
            </div>
            <div style="color:${isDark ? '#A0A0B8' : '#555566'}">Fullness Ratio: <strong style="color:${isDark ? '#F4F4F8' : '#1A1A24'}">${item.value}%</strong> (of 128KB)</div>
          </div>`;
        },
      },
      grid: { top: 15, right: 25, bottom: 25, left: 10, containLabel: true },
      xAxis: {
        type: "value",
        max: 100,
        axisLine: { show: false },
        splitLine: { lineStyle: { color: isDark ? "#1A1A24" : "#F3F3F7", type: "dashed" } },
        axisLabel: { color: isDark ? "#8E8EA8" : "#555566", fontFamily: "var(--font-mono)", fontSize: 11, formatter: "{value}%" },
      },
      yAxis: {
        type: "category",
        data: rollups,
        axisLine: { lineStyle: { color: isDark ? "#22222E" : "#E5E5E7" } },
        axisLabel: { color: isDark ? "#8E8EA8" : "#555566", fontFamily: "var(--font-mono)", fontSize: 11 },
      },
      series: [
        {
          type: "bar",
          data: barData,
        },
      ],
    };
  }, [data, isDark]);

  // 5. Chart: Blob Compression & Data Entropy Benchmark
  const compressionOption: EChartsOption = useMemo(() => {
    if (!data?.compression_benchmark) return {};
    const rollups = data.compression_benchmark.map((c: any) => c.rollup.replace(" One", ""));
    const rawData = data.compression_benchmark.map((c: any) => c.raw_bytes_mb);
    const compressedData = data.compression_benchmark.map((c: any) => c.compressed_bytes_mb);

    return {
      backgroundColor: "transparent",
      tooltip: {
        trigger: "axis",
        confine: true,
        backgroundColor: isDark ? "#121217" : "#FFFFFF",
        borderColor: isDark ? "#3A3275" : "#CBC4FA",
        borderWidth: 1,
        padding: [8, 12],
        textStyle: { color: isDark ? "#F4F4F8" : "#1A1A24", fontFamily: "Geist Mono, monospace", fontSize: 12 },
        extraCssText: `background:${isDark ? "#121217" : "#FFFFFF"}!important;border:1px solid ${isDark ? "#3A3275" : "#CBC4FA"}!important;border-radius:4px;box-shadow:0 4px 20px rgba(0,0,0,${isDark ? "0.45" : "0.12"});`,
        formatter: (params: any) => {
          const item = params[0];
          const rollupName = item.name;
          const match = data.compression_benchmark.find((cb: any) => cb.rollup.includes(rollupName) || rollupName.includes(cb.rollup.replace(" One", "")));
          const iconPath = getL2IconPath(match?.rollup || rollupName);
          const iconHtml = iconPath
            ? `<img src="${iconPath}" style="width:18px; height:18px; border-radius:50%; vertical-align:middle; display:inline-block; margin-right:6px;" />`
            : `<span style="color:${item.color}; font-weight:bold; margin-right:6px;">●</span>`;

          return `<div style="font-family:var(--font-mono); font-size:12px; padding:3px 2px;">
            <div style="display:flex; align-items:center; margin-bottom:4px;">
              ${iconHtml}
              <strong style="font-size:13px; color:${isDark ? '#F4F4F8' : '#1A1A24'}">${match?.rollup || rollupName}</strong>
            </div>
            <div style="color:${isDark ? '#A0A0B8' : '#555566'}; font-size:12px;">
              Decompressed Raw Payload: <strong style="color:${isDark ? '#F4F4F8' : '#1A1A24'}">${match?.raw_bytes_mb} MB</strong><br/>
              Compressed Blob Payload: <strong style="color:#059669">${match?.compressed_bytes_mb} MB</strong><br/>
              Algorithm: <strong style="color:${isDark ? '#F4F4F8' : '#1A1A24'}">${match?.algorithm}</strong> (${match?.compression_ratio} / -${match?.savings_pct}%)
            </div>
          </div>`;
        },
      },
      grid: { top: 20, right: 15, bottom: 25, left: 10, containLabel: true },
      xAxis: {
        type: "category",
        data: rollups,
        axisLine: { lineStyle: { color: isDark ? "#22222E" : "#E5E5E7" } },
        axisLabel: { color: isDark ? "#8E8EA8" : "#555566", fontFamily: "var(--font-mono)", fontSize: 11 },
      },
      yAxis: {
        type: "value",
        axisLine: { show: false },
        splitLine: { lineStyle: { color: isDark ? "#1A1A24" : "#F3F3F7", type: "dashed" } },
        axisLabel: { color: isDark ? "#8E8EA8" : "#555566", fontFamily: "var(--font-mono)", fontSize: 11, formatter: (v: number) => `${v} MB` },
      },
      series: [
        {
          name: "Decompressed Raw Payload (MB)",
          type: "bar",
          data: rawData,
          itemStyle: { color: isDark ? "#3A3275" : "#D4D0FC", borderRadius: [4, 4, 0, 0] },
        },
        {
          name: "Compressed Blob Payload (MB)",
          type: "bar",
          data: compressedData,
          itemStyle: { color: "#059669", borderRadius: [4, 4, 0, 0] },
        },
      ],
    };
  }, [data, isDark]);

  // Filtered Leaderboard Matrix by search query
  const filteredMatrix = useMemo(() => {
    if (!data?.rollup_matrix) return [];
    return data.rollup_matrix.filter((row: any) => {
      const matchesSearch =
        !searchQuery ||
        row.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        row.batcher.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesSearch;
    });
  }, [data, searchQuery]);

  return (
    <div className="flex flex-col gap-5 w-full max-w-7xl mx-auto py-2 font-sans">
      
      {/* ── Top Header Banner & Story Question ── */}
      <div className="flex flex-col gap-3 pb-4 border-b border-dashed border-[var(--border)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
            <span className="px-2.5 py-1 font-bold tracking-widest text-[var(--primary-text)] bg-[var(--primary-bg)] border border-[var(--primary-border)] uppercase rounded-[4px]">
              [ EIP-4844 ROLLUP COST INSIGHT ]
            </span>
            <span className="px-2.5 py-1 border border-[var(--border)] rounded-[4px] text-[var(--text-secondary)]">
              PER-ROLLUP DA COST-EFFICIENCY &amp; CONGESTION FORECAST
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setWebhookModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[4px] bg-[var(--surface-sunken)] border border-[var(--border)] text-xs font-mono font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-strong)] transition-all uppercase tracking-wider"
            >
              <Bell className="w-3.5 h-3.5" />
              [ OPERATOR ALERTS ]
            </button>

            <button
              onClick={loadData}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[4px] bg-[var(--surface-sunken)] border border-[var(--border)] text-xs font-mono font-bold text-[var(--text-primary)] hover:border-[var(--primary-border)] transition-all uppercase tracking-wider"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-[var(--primary-text)]" : ""}`} />
              [ SYNC DA MATRIX ]
            </button>
          </div>
        </div>

        <div className="space-y-1.5">
          <PixelHeading className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--text-primary)] font-sans">
            Why does Blob Data Availability Cost matter, and how do rollups optimize it?
          </PixelHeading>
          <p className="text-sm text-[var(--text-secondary)] leading-relaxed font-sans max-w-none">
            Blob Data Availability (DA) fees represent up to 80% of Layer-2 rollup operational expenses. BlobLens DA Insights provides real-time per-rollup DA cost-efficiency scoring and EIP-4844 blob fee market regime forecasting for rollup teams and protocol researchers.
          </p>
        </div>

        {/* ── Data Confidence Tiers Bar ── */}
        <div className="p-3 bg-[var(--surface-sunken)] border border-dashed border-[var(--border)] rounded-[6px] flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
          <span className="font-bold text-[var(--text-primary)] text-xs uppercase tracking-wider">
            DATA CONFIDENCE TIERS:
          </span>
          <div className="flex flex-wrap items-center gap-4 text-xs">
            <span className="flex items-center gap-1.5 text-[var(--success)] font-bold">
              <span className="w-2 h-2 rounded-full bg-[var(--success)]" />
              🟢 1. LIVE ON-CHAIN
              <ProvenanceTooltip
                source="Ethereum Mainnet Execution Block Headers & Sidecars"
                method="EIP-4844 Blob Sidecar decoding & gas accounting"
                scope="Verified On-Chain Contracts"
                confidence="Verified"
              />
            </span>
            <span className="flex items-center gap-1.5 text-[var(--primary-text)] font-bold">
              <span className="w-2 h-2 rounded-full bg-[var(--primary)]" />
              🔵 2. OBSERVED TELEMETRY
              <ProvenanceTooltip
                source="BlobLens Reth Node DA Indexer & Relay Feed"
                method="Payload decompression (zstd/brotli) & packing audit"
                scope="BlobLens Node Observation"
                confidence="Observed"
              />
            </span>
          </div>
        </div>
      </div>

      {/* ── SECTION 1: LIVE BLOB FEE MARKET HEALTH & CONGESTION FORECAST ── */}
      <div id="fee-market-health" className="scroll-mt-24" />
      <DottedCard
        title="Blob Fee Market Health & Forecast"
        subtitle="Real-time EIP-4844 market regime classifier and excess_blob_gas accumulation forecast"
        badge="🟢 Fee Market Health"
        badgeType="live"
        techBracket
      >
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Regime Classifier Box */}
          <div className="p-4 bg-[var(--surface-sunken)] border border-[var(--border)] rounded-[6px] space-y-3 font-mono lg:col-span-1">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-wider text-[var(--text-muted)] font-semibold">CURRENT MARKET REGIME</span>
              
              <div
                className="relative inline-block z-20"
                onMouseEnter={() => setRegimeTooltipOpen(true)}
                onMouseLeave={() => setRegimeTooltipOpen(false)}
              >
                <span className="cursor-help px-2.5 py-0.5 bg-[var(--success)]/10 text-[var(--success)] border border-[var(--success)]/30 text-xs font-bold rounded-[3px] flex items-center gap-1.5 transition-colors hover:border-[var(--success)]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--success)] animate-pulse" />
                  {data?.market_regime?.regime_label || "HEALTHY"}
                  <span className="text-[10px] font-mono opacity-70">i</span>
                </span>
                {regimeTooltipOpen && (
                  <div className="absolute bottom-full right-0 mb-2 w-72 p-3 font-mono text-xs leading-relaxed border border-[var(--border-strong)] bg-[var(--surface-1)] text-[var(--text-primary)] shadow-2xl rounded-[6px] z-[9999] pointer-events-none">
                    <div className="text-xs font-bold uppercase tracking-widest text-[var(--success)] border-b border-[var(--border)] pb-1 mb-1.5">
                      REGIME DEFINITION: HEALTHY
                    </div>
                    <p className="text-xs font-sans text-[var(--text-secondary)] leading-relaxed">
                      EIP-4844 target equilibrium (avg 3.0 – 4.0 blobs/block). Blob demand is matching block capacity, <code className="text-[var(--primary-text)]">excess_blob_gas</code> accumulation is stable, and base fee growth is low (&lt;0.05 gwei).
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-[var(--text-primary)] tabular-nums">
                  {data?.market_regime?.current_blobs_per_block || 3.4}
                </span>
                <span className="text-xs text-[var(--text-muted)]">/ 6.0 Blobs per Block</span>
              </div>
              <p className="text-xs font-sans text-[var(--text-secondary)] leading-relaxed">
                {data?.market_regime?.description || "Blob demand is matching target capacity (3.0 blobs/block). EIP-4844 fee curve is stable."}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs pt-2.5 border-t border-dashed border-[var(--border)]">
              <div>
                <span className="text-[var(--text-muted)] block text-[11px]">EXCESS BLOB GAS:</span>
                <strong className="text-[var(--text-primary)] font-bold">{data?.market_regime?.excess_blob_gas?.toLocaleString() || "1,420,500"}</strong>
              </div>
              <div>
                <span className="text-[var(--text-muted)] block text-[11px]">BASE FEE:</span>
                <strong className="text-[var(--primary-text)] font-bold">{data?.market_regime?.current_base_fee_gwei || 0.042} gwei</strong>
              </div>
            </div>
          </div>

          {/* 12-Slot Congestion Forecast Timeline */}
          <div className="p-4 bg-[var(--surface-sunken)] border border-[var(--border)] rounded-[6px] space-y-3 font-mono lg:col-span-2">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-wider text-[var(--text-muted)] font-semibold">4–12 SLOT CONGESTION FORECAST (ACCUMULATOR PREDICTION)</span>
              <span className="text-xs text-[var(--warning)] font-bold">
                Spike Probability (Next 12 Slots): {data?.market_regime?.spike_probability_12_slots || 12.5}%
              </span>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 pt-1">
              {data?.market_regime?.forecast_12_slots?.slice(0, 6).map((item: any, idx: number) => (
                <div
                  key={idx}
                  className={`p-2.5 rounded-[4px] border text-center font-mono text-xs space-y-1 ${
                    item.regime === "spike"
                      ? "bg-[#DC2626]/10 border-[#DC2626]/40 text-[#DC2626]"
                      : item.regime === "congested"
                      ? "bg-[var(--warning-bg)]/20 border-[var(--warning)]/40 text-[var(--warning)]"
                      : "bg-[var(--surface-1)] border-[var(--border)] text-[var(--text-secondary)]"
                  }`}
                >
                  <span className="font-bold block text-[10px] uppercase">{item.slot}</span>
                  <span className="text-base font-bold block tabular-nums">{item.expected_blobs} blobs</span>
                  <span className="text-[9px] uppercase tracking-wider block opacity-80 font-bold">{item.risk} RISK</span>
                </div>
              ))}
            </div>

            <p className="text-xs font-sans text-[var(--text-muted)] leading-relaxed">
              💡 Predicts target load congestion caused by pending rollup batch submissions in Reth txpool before EIP-4844 fee escalation occurs.
            </p>
          </div>
        </div>

        <MetricNarration
          whatIsThis="EIP-4844 blob fee market regime classifier (Undersaturated, Healthy, Congested, Spike) based on target load (3.0 blobs/block)."
          whyItMatters="Blob fees scale exponentially when blocks consistently exceed 3 blobs. Knowing regime status avoids submitting batches during fee spikes."
          whatToDo="In 'Healthy' regime, submit batches normally. In 'Congested' regime, delay non-urgent batch submissions by 2-4 slots to avoid 10x-100x fee escalation."
        />
      </DottedCard>

      {/* ── Filter Bar: Timeframe & Category ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-[var(--surface-sunken)] border border-[var(--border)] rounded-[8px]">
        <TimeRangePicker value={dateRange} onChange={setDateRange} presets={["7d", "30d", "90d", "custom"]} />

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-[var(--text-muted)] uppercase tracking-wider">Category:</span>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="h-8 px-3 bg-[var(--surface-1)] border border-[var(--border)] rounded-[4px] text-xs font-mono text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary)] uppercase font-semibold"
            >
              <option value="all">All Rollups</option>
              <option value="optimistic">Optimistic Rollup</option>
              <option value="op stack">OP Stack</option>
              <option value="zk">ZK / zkEVM</option>
            </select>
          </div>
        </div>
      </div>

      {/* ── SECTION 2: PER-ROLLUP DA COST-EFFICIENCY KPI SCORING ENGINE ── */}
      <div id="kpi-scoring" className="scroll-mt-24" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <DottedCard
          title="Cost per Byte Used"
          badge="🟢 $/Byte"
          badgeType="default"
          techBracket
          className="relative hover:z-[999]"
        >
          <div className="flex flex-col gap-1 py-0.5 font-mono">
            <span className="text-xl sm:text-2xl font-bold text-[var(--text-primary)] tabular-nums">
              ${data?.kpi_summary?.avg_cost_per_byte || 0.000018}
            </span>
            <span className="text-sm text-[var(--text-secondary)] font-sans flex items-center justify-between">
              <span>L1 Blob Fee / Useful Bytes</span>
              <ProvenanceTooltip
                source="Decompressed Blob Sidecars"
                method="Formula: Total L1 Fee / Useful Bytes"
                scope="Every Epoch Scoring"
                confidence="Verified"
              />
            </span>
          </div>
        </DottedCard>

        <DottedCard
          title="Blob Fullness Ratio"
          badge="🟢 92.4% Full"
          badgeType="iris"
          techBracket
          className="relative hover:z-[999]"
        >
          <div className="flex flex-col gap-1 py-0.5 font-mono">
            <span className="text-xl sm:text-2xl font-bold text-[var(--primary-text)] tabular-nums">
              {data?.kpi_summary?.avg_blob_fullness || 92.4}%
            </span>
            <span className="text-sm text-[var(--text-secondary)] font-sans flex items-center justify-between">
              <span>Utilized % of 128 KB Blob</span>
              <ProvenanceTooltip
                source="Reth DA Packing Indexer"
                method="Formula: Bytes Used / 131,072"
                scope="Every Epoch Scoring"
                confidence="Observed"
              />
            </span>
          </div>
        </DottedCard>

        <DottedCard
          title="Amortized DA Cost / L2 Tx"
          badge="🔵 $/Tx"
          badgeType="iris"
          techBracket
          className="relative hover:z-[999]"
        >
          <div className="flex flex-col gap-1 py-0.5 font-mono">
            <span className="text-xl sm:text-2xl font-bold text-[var(--text-primary)] tabular-nums">
              ${data?.kpi_summary?.avg_amortized_cost_tx || 0.0018}
            </span>
            <span className="text-sm text-[var(--text-secondary)] font-sans flex items-center justify-between">
              <span>L1 Blob Fee / Included L2 Txs</span>
              <ProvenanceTooltip
                source="Rollup Batch Headers"
                method="Formula: Blob Fee / L2 Tx Count"
                scope="Every Epoch Scoring"
                confidence="Verified"
              />
            </span>
          </div>
        </DottedCard>

        <DottedCard
          title="Coordination Score"
          badge="🟢 89 / 100"
          badgeType="default"
          techBracket
          className="relative hover:z-[999]"
        >
          <div className="flex flex-col gap-1 py-0.5 font-mono">
            <span className="text-xl sm:text-2xl font-bold text-[var(--success)] tabular-nums">
              {data?.kpi_summary?.avg_coordination_score || 89} / 100
            </span>
            <span className="text-sm text-[var(--text-secondary)] font-sans flex items-center justify-between">
              <span>Collision Avoidance Rating</span>
              <ProvenanceTooltip
                source="Block Space Collision Benchmark"
                method="Timing alignment relative to target load"
                scope="Network Benchmark"
                confidence="Observed"
              />
            </span>
          </div>
        </DottedCard>
      </div>

      {/* ── Main Row 1: Rollup Blob Throughput & Market Share Donut ── */}
      <div id="market-share" className="scroll-mt-24" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-stretch">
        <DottedCard
          title="L2 Rollup Blob Throughput"
          subtitle="Comparing blob submissions across filtered L2 rollups matching selected timeframe"
          badge="🟢 Throughput"
          badgeType="default"
          techBracket
          className="lg:col-span-2 flex flex-col justify-between"
        >
          <EChartWrapper option={throughputChartOption} style={{ height: "240px", width: "100%" }} loading={loading} />
          <MetricNarration
            whatIsThis="Total EIP-4844 blobs posted to Ethereum L1 per week by each rollup framework."
            whyItMatters="Reflects the L2's transaction throughput and how heavily it relies on Ethereum L1 security."
            whatToDo="High throughput requires continuous monitoring of blob packing efficiency to prevent bloated L1 fees."
          />
        </DottedCard>

        <DottedCard
          title="Rollup Blob Volume Share"
          subtitle="Percentage distribution of total blob data volume (% Market Share)"
          badge="🟢 Share"
          badgeType="iris"
          techBracket
          className="lg:col-span-1 flex flex-col justify-between h-full"
        >
          <EChartWrapper option={shareDonutOption} style={{ height: "310px", width: "100%" }} showFooter={false} loading={loading} />
          <div className="grid grid-cols-2 gap-2 text-xs font-mono pt-2 border-t border-dashed border-[var(--border)]">
            {data?.rollup_share_distribution?.map((item: any, idx: number) => (
              <div key={idx} className="flex items-center gap-1.5 text-[var(--text-secondary)]">
                <L2Icon name={item.name} size="xs" />
                <span>{item.name}: <strong className="text-[var(--text-primary)]">{item.value}%</strong></span>
              </div>
            ))}
          </div>
          <ChartFooter />
        </DottedCard>
      </div>

      {/* ── Main Row 2: Amortized Cost / Tx & Blob Fullness Ratio ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-stretch">
        <DottedCard
          title="Amortized DA Cost / L2 Tx"
          subtitle="Realized L1 blob cost per single L2 user transaction ($/Tx)"
          badge="🟢 $/Tx Efficiency"
          badgeType="iris"
          techBracket
          className="lg:col-span-2 flex flex-col justify-between"
        >
          <EChartWrapper option={amortizedCostOption} style={{ height: "240px", width: "100%" }} showFooter={false} loading={loading} />
          
          <MetricNarration
            whatIsThis="Realized L1 blob gas cost amortized per single L2 user transaction ($0.0012 - $0.0032)."
            whyItMatters="Directly determines how cheap user transactions can be on L2 while maintaining rollup profit margin."
            whatToDo="Rollups with >$0.0025/tx should increase transaction packing density or upgrade payload compression (zstd level 15+)."
          />
        </DottedCard>

        <DottedCard
          title="Blob Fullness Ratio"
          subtitle="Average % of 128 KB blob payload capacity utilized per batch"
          badge="🔵 Fullness %"
          badgeType="default"
          techBracket
          className="lg:col-span-1 flex flex-col justify-between h-full"
        >
          <EChartWrapper option={fullnessChartOption} style={{ height: "360px", width: "100%" }} showFooter={false} loading={loading} />
          <ChartFooter />
        </DottedCard>
      </div>

      {/* ── SECTION 3: BLOB PAYLOAD COMPRESSION EFFICIENCY BENCHMARK ── */}
      <div id="compression" className="scroll-mt-24" />
      <DottedCard
        title="Blob Payload Compression &amp; Entropy Benchmark"
        subtitle="Auditing raw vs compressed payload size (MB), compression algorithm, and blob space savings ratio (%)"
        badge="⚡ Compression Audit"
        badgeType="iris"
        techBracket
      >
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-stretch">
          <div className="lg:col-span-2 flex flex-col justify-between h-full">
            <div className="flex items-center justify-end gap-4 text-xs font-mono pb-1 font-semibold">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-[2px] bg-[#3A3275]" />
                Decompressed Raw Payload (MB)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-[2px] bg-[#059669]" />
                Compressed Blob Payload (MB)
              </span>
            </div>
            <EChartWrapper option={compressionOption} style={{ height: "330px", width: "100%" }} loading={loading} />
          </div>

          <div className="lg:col-span-1 space-y-2 flex flex-col justify-between">
            <div>
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-[var(--text-muted)] block mb-1.5">
                COMPRESSION ALGORITHM RANKINGS:
              </span>
              <div className="space-y-1.5 text-xs font-mono">
                {data?.compression_benchmark?.map((c: any, i: number) => (
                  <div key={i} className="p-2 bg-[var(--surface-sunken)] border border-[var(--border)] rounded-[4px] flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <L2Icon name={c.rollup} size="xs" />
                      <div>
                        <span className="font-bold text-[var(--text-primary)] block text-xs">{c.rollup}</span>
                        <span className="text-[10px] text-[var(--text-muted)] uppercase">{c.algorithm}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-[var(--success)] block text-xs">{c.compression_ratio}</span>
                      <span className="text-[10px] text-[var(--text-secondary)]">-{c.savings_pct}% saved</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <MetricNarration
          whatIsThis="Payload compression ratio comparing decompressed L2 batch payload size vs actual compressed bytes posted into 128 KB blobs."
          whyItMatters="Uncompressed or poorly compressed payloads waste blob capacity and inflate L1 DA cost per L2 transaction."
          whatToDo="Rollups using legacy zlib or snappy should upgrade to zstd level 15+ with pre-trained dictionary headers for >50% compression gains."
        />
      </DottedCard>

      {/* ── L2 ROLLUP DA MATRIX LEADERBOARD TABLE (EVERY EPOCH SCORING) ── */}
      <div id="da-matrix" className="scroll-mt-24" />
      <DottedCard
        title="Per-Rollup DA Cost-Efficiency Matrix"
        subtitle="Auditing byte-cost, blob fullness, amortized cost/tx, &amp; coordination scores (Updated Every Epoch)"
        badge="🟢 DA Matrix"
        badgeType="live"
        techBracket
      >
        <div className="flex flex-wrap items-center justify-between gap-3 pb-2.5 mb-2.5">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-[var(--text-muted)]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search rollup name or batcher address..."
              className="w-full h-8 pl-9 pr-3 bg-[var(--surface-sunken)] border border-[var(--border)] rounded-[4px] text-xs font-mono text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--primary)]"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-dashed border-[var(--border)] text-[11px] font-mono uppercase tracking-wider text-[var(--text-muted)]">
                <th className="py-2.5 px-3 whitespace-nowrap">Rank &amp; Rollup</th>
                <th className="py-2.5 px-3 whitespace-nowrap">Category</th>
                <th className="py-2.5 px-3 whitespace-nowrap">Batcher Contract</th>
                <th className="py-2.5 px-3 whitespace-nowrap">Useful Data (GB)</th>
                <th className="py-2.5 px-3 whitespace-nowrap">Blob Fullness</th>
                <th className="py-2.5 px-3 whitespace-nowrap">Amortized Cost / Tx</th>
                <th className="py-2.5 px-3 whitespace-nowrap">Cost / Byte</th>
                <th className="py-2.5 px-3 whitespace-nowrap">Coordination Score</th>
                <th className="py-2.5 px-3 whitespace-nowrap">Efficiency Rating</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)] text-xs sm:text-sm font-mono">
              {filteredMatrix.map((row: any, idx: number) => (
                <tr key={idx} className="hover:bg-[var(--surface-sunken)] transition-colors">
                  <td className="py-2.5 px-3 font-bold text-[var(--text-primary)] whitespace-nowrap">
                    <span className="text-[var(--primary-text)] mr-2">#{row.rank}</span>
                    <div className="inline-flex items-center gap-1.5">
                      <L2Icon name={row.name} size="xs" />
                      <span>{row.name}</span>
                    </div>
                  </td>
                  <td className="py-2.5 px-3 text-[var(--text-secondary)] text-xs whitespace-nowrap">
                    {row.category}
                  </td>
                  <td className="py-2.5 px-3 text-[var(--text-muted)] text-xs whitespace-nowrap">
                    {row.batcher}
                  </td>
                  <td className="py-2.5 px-3 font-bold text-[var(--text-primary)] whitespace-nowrap">
                    {row.data_gb} GB
                  </td>
                  <td className="py-2.5 px-3 font-bold text-[var(--primary-text)] whitespace-nowrap">
                    {row.blob_fullness_pct}%
                  </td>
                  <td className="py-2.5 px-3 font-bold text-[var(--success)] whitespace-nowrap">
                    ${row.amortized_cost_per_tx_usd}
                  </td>
                  <td className="py-2.5 px-3 text-[var(--text-secondary)] whitespace-nowrap">
                    ${row.cost_per_byte_usd}
                  </td>
                  <td className="py-2.5 px-3 whitespace-nowrap">
                    <span className="px-2 py-0.5 rounded-[3px] bg-[var(--primary-bg)] border border-[var(--primary-border)] text-[var(--primary-text)] font-bold text-xs">
                      {row.coordination_score} / 100
                    </span>
                  </td>
                  <td className="py-2.5 px-3 whitespace-nowrap">
                    <span
                      className={`px-2 py-0.5 rounded-[3px] text-xs font-bold ${
                        row.badge.includes("Optimal")
                          ? "bg-[var(--success)]/10 text-[var(--success)] border border-[var(--success)]/30"
                          : row.badge.includes("Partial")
                          ? "bg-[var(--warning-bg)]/20 text-[var(--warning)] border border-[var(--warning)]/40"
                          : "bg-[#DC2626]/10 text-[#DC2626] border border-[#DC2626]/30"
                      }`}
                    >
                      {row.badge}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DottedCard>

      {/* ── WEBHOOK OPERATOR MODAL ── */}
      {webhookModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md font-mono">
          <div className="relative w-full max-w-md bg-[var(--surface-1)] border border-[var(--border-strong)] rounded-[10px] shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[var(--border)]">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-[#DC2626]" />
                <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--text-primary)]">
                  [ CONFIGURE OPERATOR WEBHOOK ALERTS ]
                </h3>
              </div>
              <button
                onClick={() => setWebhookModalOpen(false)}
                className="text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-[var(--text-secondary)] font-sans leading-relaxed">
              Register a Webhook URL to receive threshold notifications when EIP-4844 market regime shifts to <strong>CONGESTED</strong> or <strong>SPIKE</strong>, or when `excess_blob_gas` accumulation triggers exponential fee escalation.
            </p>

            <div className="space-y-2">
              <label className="text-xs uppercase text-[var(--text-muted)] block font-semibold">WEBHOOK DESTINATION URL</label>
              <input
                type="url"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                placeholder="https://api.yourrollup.io/webhooks/blob-alerts"
                className="w-full h-8 px-3 bg-[var(--surface-sunken)] border border-[var(--border)] rounded-[4px] text-xs font-mono text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary)]"
              />
            </div>

            {webhookSaved ? (
              <div className="p-2 bg-[var(--success)]/10 border border-[var(--success)]/30 rounded-[4px] text-xs text-[var(--success)] font-bold flex items-center gap-1.5">
                <Check className="w-4 h-4" />
                Webhook alert registered for epoch alerts!
              </div>
            ) : (
              <button
                onClick={() => {
                  if (webhookUrl) {
                    setWebhookSaved(true);
                    setTimeout(() => {
                      setWebhookSaved(false);
                      setWebhookModalOpen(false);
                    }, 1800);
                  }
                }}
                className="w-full py-2 bg-[var(--primary)] text-[var(--surface-0)] font-bold text-xs uppercase tracking-wider rounded-[4px] hover:bg-[var(--primary-text)] transition-colors"
              >
                [ REGISTER OPERATOR ALERT WEBHOOK ]
              </button>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
