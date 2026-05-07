"use client";

import { rollupColor } from "@/lib/utils";
import type { HourlyRollupValue } from "@/types";
import ReactECharts from "echarts-for-react";
import { useTheme } from "next-themes";

type Mode = "fee-wei" | "utilization-pct";

interface Props {
  data: HourlyRollupValue[];
  mode: Mode;
}

const MODES: Record<Mode, { yName: string; yFmt: (v: number) => string; tipFmt: (v: number) => string }> = {
  "fee-wei": {
    yName: "gwei",
    yFmt:  (v) => v > 0 ? `${(v / 1e9).toPrecision(3)}` : "0",
    tipFmt: (v) => `${(v / 1e9).toFixed(4)} gwei`,
  },
  "utilization-pct": {
    yName: "%",
    yFmt:  (v) => `${v.toFixed(0)}%`,
    tipFmt: (v) => `${v.toFixed(1)}%`,
  },
};

export function RollupMetricLineChart({ data, mode }: Props) {
  const { yName, yFmt, tipFmt } = MODES[mode];
  const { theme } = useTheme();
  const isDark = theme !== "light";

  if (!data.length)
    return <p className="py-8 text-center text-[0.6875rem] text-[#5C5575]">No data</p>;

  const hours   = [...new Set(data.map((d) => d.hour))].sort();
  const rollups = [...new Set(data.map((d) => d.rollup))];

  const index = new Map<string, Map<string, number>>();
  for (const row of data) {
    if (!index.has(row.rollup)) index.set(row.rollup, new Map());
    index.get(row.rollup)!.set(row.hour, Number(row.value));
  }

  const series = rollups.map((rollup) => ({
    name: rollup,
    type: "line",
    smooth: true,
    symbol: "none",
    lineStyle: { width: 2 },
    itemStyle: { color: rollupColor(rollup) },
    data: hours.map((h) => {
      const v = index.get(rollup)?.get(h);
      return v != null ? v : null;
    }),
    connectNulls: false,
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
      formatter: (params: { seriesName: string; value: number | null; marker: string }[]) => {
        const lines = params
          .filter((p) => p.value != null && p.value > 0)
          .sort((a, b) => (b.value ?? 0) - (a.value ?? 0))
          .map((p) => `${p.marker} ${p.seriesName}: <b>${tipFmt(p.value as number)}</b>`)
          .join("<br/>");
        return lines || "No data";
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
    grid: { top: 12, right: 16, bottom: 64, left: 56 },
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
      name: yName,
      nameTextStyle: { color: isDark ? "#4B5563" : "#9CA3AF", fontSize: 9  },
      axisLabel: { ...axisLabel, formatter: yFmt },
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
