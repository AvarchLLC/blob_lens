"use client";

import { getChartTheme, animationConfig } from "@/lib/chartTheme";
import type { MarketHour } from "@/types";
import ReactECharts from "echarts-for-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

function shortHour(iso: string) {
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}h`;
}

interface Props {
  data: MarketHour[];
}

export function BlobsPerBlockChart({ data }: Props) {
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) return <div className="h-[350px] w-full animate-pulse bg-surface-elevated rounded-none border border-dashed border-border" />;

  if (!data.length)
    return <p className="py-8 text-center text-xs text-text-secondary opacity-50 italic">No data</p>;

  const isDark = theme !== "light";
  const t = getChartTheme(isDark);

  const labels = data.map((d) => shortHour(d.hour));
  const maxVal = Math.max(...data.map(d => d.blob_count));

  const seriesData = data.map((d) => ({
    value: d.blob_count,
    itemStyle: {
      color: {
        type: "linear" as const,
        x: 0, y: 0, x2: 0, y2: 1,
        colorStops: [
          { offset: 0, color: isDark ? "rgba(0,167,181,0.85)" : "rgba(0,138,150,0.85)" },
          { offset: 1, color: isDark ? "rgba(0,167,181,0.45)" : "rgba(0,138,150,0.45)" },
        ],
      },
      borderRadius: 0,
    },
  }));

  const option = {
    ...animationConfig,
    backgroundColor: t.backgroundColor,
    graphic: t.graphic,
    grid: { top: 8, right: 8, bottom: 24, left: 0, containLabel: true },
    xAxis: {
      type: "category" as const,
      data: labels,
      ...t.axis,
    },
    yAxis: {
      type: "value" as const,
      ...t.axis,
    },
    tooltip: {
      trigger: "axis" as const,
      ...t.tooltip,
      axisPointer: { type: "shadow" as const, shadowStyle: { color: "rgba(0, 167, 181, 0.05)" } },
    },
    series: [
      {
        type: "bar" as const,
        data: seriesData,
        barCategoryGap: "28%",
        name: "Blobs",
      },
    ],
  };

  return <ReactECharts option={option} style={{ height: "350px", width: "100%" }} opts={{ renderer: 'svg' }} />;
}
