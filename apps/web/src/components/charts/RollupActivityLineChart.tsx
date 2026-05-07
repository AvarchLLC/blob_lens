"use client";

import { rollupColor } from "@/lib/utils";
import type { HourlyRollupBlob } from "@/types";
import ReactECharts from "echarts-for-react";
import { useTheme } from "next-themes";

interface Props {
  data: HourlyRollupBlob[];
}

export function RollupActivityLineChart({ data }: Props) {
  const { theme } = useTheme();
  const isDark = theme !== "light";

  if (!data.length)
    return <p className="py-8 text-center text-[0.6875rem] text-[#5C5575]">No data</p>;

  // Build hour axis + per-rollup series
  const hours = [...new Set(data.map((d) => d.hour))].sort();
  const rollups = [...new Set(data.map((d) => d.rollup))];

  // index: rollup → hour → blobs
  const index = new Map<string, Map<string, number>>();
  for (const row of data) {
    if (!index.has(row.rollup)) index.set(row.rollup, new Map());
    index.get(row.rollup)!.set(row.hour, Number(row.blobs));
  }

  const series = rollups.map((rollup) => ({
    name: rollup,
    type: "line",
    smooth: true,
    symbol: "none",
    lineStyle: { width: 2 },
    itemStyle: { color: rollupColor(rollup) },
    data: hours.map((h) => index.get(rollup)?.get(h) ?? 0),
  }));

  const axisLabel = { color: isDark ? "#6B7280" : "#9CA3AF", fontSize: 10 };
  const gridLine  = { color: isDark ? "#1E2D45" : "#E5E7EB" };

  const option = {
    backgroundColor: "transparent",
    animation: true,
    tooltip: {
      trigger: "axis",
      backgroundColor: isDark ? "#111827" : "#ffffff",
      borderColor: isDark ? "#1E2D45" : "#E5E7EB",
      textStyle: { color: isDark ? "#F9FAFB" : "#0F172A", fontSize: 11 },
      formatter: (params: { seriesName: string; value: number; marker: string }[]) => {
        const hour = new Date(params[0] ? hours[0] : "").toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
        const lines = params
          .filter((p) => p.value > 0)
          .sort((a, b) => b.value - a.value)
          .map((p) => `${p.marker} ${p.seriesName}: <b>${p.value}</b>`)
          .join("<br/>");
        return `${hour}<br/>${lines}`;
      },
    },
    legend: {
      bottom: 0,
      type: "scroll",
      textStyle: { color: isDark ? "#9CA3AF" : "#6B7280", fontSize: 10 },
      pageTextStyle: { color: isDark ? "#6B7280" : "#9CA3AF" },
      pageIconColor: isDark ? "#9CA3AF" : "#6B7280",
      icon: "circle",
      itemWidth: 8,
      itemHeight: 8,
    },
    grid: { top: 12, right: 16, bottom: 64, left: 48 },
    xAxis: {
      type: "category",
      data: hours.map((h) =>
        new Date(h).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      ),
      axisLabel: { ...axisLabel, interval: Math.floor(hours.length / 6) },
      axisLine: { lineStyle: gridLine },
      axisTick: { show: false },
    },
    yAxis: {
      type: "value",
      name: "blobs",
      nameTextStyle: { color: isDark ? "#4B5563" : "#9CA3AF", fontSize: 9 },
      axisLabel,
      splitLine: { lineStyle: { ...gridLine, type: "dashed" } },
    },
    series,
  };

  return (
    <ReactECharts
      option={option}
      style={{ height: 280, width: "100%" }}
      opts={{ renderer: "canvas" }}
    />
  );
}
