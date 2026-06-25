"use client";

import type { MarketHour } from "@/types";
import ReactECharts from "echarts-for-react";
import { getChartTheme, animationConfig } from "@/lib/chartTheme";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

function shortHour(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString([], { month: "short", day: "numeric", hour: "2-digit" });
}

interface Props {
  data: MarketHour[];
}

export function SlotUtilizationChart({ data }: Props) {
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) return <div className="h-[350px] w-full animate-pulse bg-surface-elevated rounded-none border border-dashed border-border" />;

  if (!data.length)
    return <p className="py-8 text-center text-[0.6875rem] text-text-secondary opacity-50 italic font-mono">No slot utilization data</p>;

  const isDark = theme !== "light";
  const t = getChartTheme(isDark);

  const labels = data.map((d) => shortHour(d.hour));
  const values = data.map((d) => parseFloat(Number(d.avg_utilization).toFixed(2)));

  const option = {
    ...animationConfig,
    backgroundColor: t.backgroundColor,
    graphic: t.graphic,
    grid: {
      ...t.gridDefaults,
      bottom: 60,
    },
    xAxis: {
      type: "category" as const,
      data: labels,
      ...t.axis,
      boundaryGap: false,
      axisLabel: {
        ...t.axis.axisLabel,
        interval: Math.floor(labels.length / 8),
      },
    },
    yAxis: {
      type: "value" as const,
      min: 0,
      max: 100,
      ...t.axis,
      axisLabel: {
        ...t.axis.axisLabel,
        formatter: (v: number) => `${v}%`,
      },
    },
    tooltip: {
      trigger: "axis" as const,
      ...t.tooltip,
      formatter: (params: { axisValue: string; value: number }[]) =>
        `<div style="display:flex;flex-direction:column;gap:4px;">
          <span style="color:#8FA1A8;font-size:10px;font-weight:bold;text-transform:uppercase;">${params[0].axisValue}</span>
          <span style="font-family:'JetBrains Mono',monospace;color:#8B5CF6;font-weight:700;font-size:12px;">${params[0].value.toFixed(1)}% utilized</span>
        </div>`,
    },
    dataZoom: t.dataZoom,
    series: [
      {
        name: "Utilization",
        type: "line" as const,
        data: values,
        smooth: 0.3,
        lineStyle: {
          color: isDark ? "#8B5CF6" : "#7C3AED",
          width: 2,
        },
        symbol: "none",
        areaStyle: {
          color: t.areaGradient,
        },
      },
    ],
  };

  return <ReactECharts option={option} style={{ height: "350px", width: "100%" }} opts={{ renderer: "svg" }} />;
}

