"use client";

import ReactECharts from "echarts-for-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import type { FeePercentile } from "@/lib/queries";
import { getChartTheme } from "@/lib/chartTheme";

const GAS_PER_BLOB = 131_072;

function toGwei(wei: number) {
  return wei / 1e9;
}

function shortLabel(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

interface Props {
  data: FeePercentile[];
}

export function FeePercentilesChart({ data }: Props) {
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!data.length) return <p className="py-8 text-center text-xs text-text-secondary">No data</p>;

  const isDark = theme !== "light";
  const chartTheme = getChartTheme(isDark);
  const labels = data.map((d) => shortLabel(d.hour));

  const p25 = data.map((d) => toGwei(Number(d.p25)));
  const p50 = data.map((d) => toGwei(Number(d.p50)));
  const p75 = data.map((d) => toGwei(Number(d.p75)));
  const p95 = data.map((d) => toGwei(Number(d.p95)));

  // Band: p25–p75 as a stacked area trick (lower bound + band width)
  const bandLow = p25;
  const bandWidth = p75.map((v, i) => Math.max(0, v - p25[i]));

  const option = {
    ...chartTheme,
    tooltip: {
      trigger: "axis",
      axisPointer: { type: "cross", lineStyle: { color: "#00A7B5", opacity: 0.4 } },
      formatter: (params: any[]) => {
        const label = params[0]?.axisValueLabel ?? "";
        const rows = [
          `<strong>${label}</strong>`,
          `<span style="color:#00df81">P50 (median): ${Number(params.find((p: any) => p.seriesName === "p50")?.value ?? 0).toFixed(4)} Gwei</span>`,
          `<span style="color:#00A7B5">P25–P75 band</span>`,
          `<span style="color:#fb2c36">P95: ${Number(params.find((p: any) => p.seriesName === "p95")?.value ?? 0).toFixed(4)} Gwei</span>`,
        ];
        return rows.join("<br/>");
      },
    },
    legend: {
      data: ["P25–P75 band", "p50", "p95"],
      textStyle: { color: isDark ? "#9CA3AF" : "#6B7280", fontSize: 11 },
    },
    xAxis: {
      type: "category",
      data: labels,
      axisLabel: {
        color: isDark ? "#6B7280" : "#9CA3AF",
        fontSize: 10,
        rotate: 30,
        interval: Math.floor(labels.length / 8),
      },
      axisLine: { lineStyle: { color: isDark ? "#374151" : "#E5E7EB" } },
    },
    yAxis: {
      type: "value",
      name: "Gwei",
      nameTextStyle: { color: isDark ? "#6B7280" : "#9CA3AF", fontSize: 10 },
      axisLabel: {
        color: isDark ? "#6B7280" : "#9CA3AF",
        fontSize: 10,
        formatter: (v: number) => v.toFixed(v < 0.01 ? 6 : v < 1 ? 4 : 2),
      },
      splitLine: { lineStyle: { color: isDark ? "#1F2937" : "#F3F4F6" } },
    },
    series: [
      // Invisible baseline for the band (stacked)
      {
        name: "band_base",
        type: "line",
        data: bandLow,
        lineStyle: { opacity: 0 },
        symbol: "none",
        stack: "band",
        areaStyle: { color: "transparent" },
        tooltip: { show: false },
        legendHoverLink: false,
        showInLegend: false,
      },
      // Band width (p25–p75)
      {
        name: "P25–P75 band",
        type: "line",
        data: bandWidth,
        lineStyle: { opacity: 0 },
        symbol: "none",
        stack: "band",
        areaStyle: {
          color: isDark ? "rgba(0,167,181,0.18)" : "rgba(0,138,150,0.12)",
          origin: "auto",
        },
      },
      // Median line
      {
        name: "p50",
        type: "line",
        data: p50,
        smooth: true,
        symbol: "none",
        lineStyle: { color: "#00df81", width: 2 },
        itemStyle: { color: "#00df81" },
      },
      // P95 line
      {
        name: "p95",
        type: "line",
        data: p95,
        smooth: true,
        symbol: "none",
        lineStyle: { color: "#fb2c36", width: 1.5, type: "dashed" },
        itemStyle: { color: "#fb2c36" },
      },
    ],
    grid: { top: 40, right: 16, bottom: 60, left: 72 },
    animation: false,
  };

  if (!mounted) return <div className="h-56 animate-pulse rounded bg-border/20" />;

  return <ReactECharts option={option} style={{ height: 224 }} notMerge />;
}
