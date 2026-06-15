"use client";

import ReactECharts from "echarts-for-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import type { RollupHourStat } from "@/lib/queries";

interface Props {
  data: RollupHourStat[];
}

const HOURS = Array.from({ length: 24 }, (_, i) =>
  i === 0 ? "12am" : i < 12 ? `${i}am` : i === 12 ? "12pm" : `${i - 12}pm`
);

export function SubmissionTimingHeatmap({ data }: Props) {
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!data.length) return <p className="py-8 text-center text-xs text-text-secondary">No timing data</p>;

  const isDark = theme !== "light";

  const rollups = [...new Set(data.map((d) => d.rollup))].sort();

  // Build [hour_of_day, rollup_idx, value] triples
  const maxVal = Math.max(...data.map((d) => Number(d.blob_count)));
  const cells = data.map((d) => [
    Number(d.hour_of_day),
    rollups.indexOf(d.rollup),
    Number(d.blob_count),
  ]);

  const option = {
    tooltip: {
      formatter: (p: any) =>
        `<strong>${rollups[p.data[1]]}</strong><br/>${HOURS[p.data[0]]}: ${Number(p.data[2]).toLocaleString()} blobs`,
    },
    xAxis: {
      type: "category",
      data: HOURS,
      splitArea: { show: true },
      axisLabel: {
        color: isDark ? "#6B7280" : "#9CA3AF",
        fontSize: 9,
        rotate: 30,
      },
      axisLine: { lineStyle: { color: isDark ? "#374151" : "#E5E7EB" } },
    },
    yAxis: {
      type: "category",
      data: rollups,
      splitArea: { show: true },
      axisLabel: {
        color: isDark ? "#9CA3AF" : "#6B7280",
        fontSize: 10,
      },
      axisLine: { lineStyle: { color: isDark ? "#374151" : "#E5E7EB" } },
    },
    visualMap: {
      min: 0,
      max: maxVal,
      calculable: false,
      orient: "horizontal",
      left: "center",
      bottom: 0,
      itemHeight: 120,
      itemWidth: 12,
      textStyle: { color: isDark ? "#9CA3AF" : "#6B7280", fontSize: 10 },
      inRange: {
        color: isDark
          ? ["#1a2535", "#0e4a55", "#00A7B5", "#00df81"]
          : ["#F0FDFE", "#BAF5F9", "#00A7B5", "#005F6B"],
      },
    },
    series: [
      {
        name: "Blobs",
        type: "heatmap",
        data: cells,
        label: { show: false },
        emphasis: {
          itemStyle: { shadowBlur: 10, shadowColor: "rgba(0,167,181,0.5)" },
        },
      },
    ],
    grid: { top: 12, right: 16, bottom: 56, left: 120 },
    animation: false,
  };

  if (!mounted) return <div className="h-64 animate-pulse rounded bg-border/20" />;

  return (
    <ReactECharts
      option={option}
      style={{ height: Math.max(200, rollups.length * 36 + 80) }}
      notMerge
    />
  );
}
