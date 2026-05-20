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

export function BlobUtilizationChart({ data }: Props) {
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) return <div className="h-full w-full animate-pulse bg-surface-elevated rounded-md" />;

  if (!data.length)
    return <p className="py-8 text-center text-xs text-text-secondary opacity-50 italic">No data</p>;

  const isDark = theme !== "light";
  const t = getChartTheme(isDark);

  const labels = data.map((d) => shortHour(d.hour));
  const values = data.map((d) => parseFloat(Number(d.avg_utilization).toFixed(1)));

  const option = {
    ...animationConfig,
    backgroundColor: t.backgroundColor,
    graphic: t.graphic,
    grid: { top: 16, right: 16, bottom: 24, left: 0, containLabel: true },
    xAxis: {
      type: "category" as const,
      data: labels,
      ...t.axis,
      boundaryGap: false,
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
      formatter: (params: { axisValue: string; value: number }[]) => {
        const ttText = isDark ? "#F0F4F5" : "#0D1618";
        const ttMuted = isDark ? "#7E9098" : "#5C7077";
        return `<span style="color:${ttMuted};font-size:11px">${params[0].axisValue}</span><br/><b style="color:${ttText}">${params[0].value}%</b> avg utilization`;
      },
    },
    series: [
      {
        type: "line" as const,
        data: values,
        smooth: 0.4,
        lineStyle: { color: "#10B981", width: 2 },
        symbol: "none",
        areaStyle: {
          color: {
            type: "linear" as const,
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: "rgba(16,185,129,0.12)" },
              { offset: 1, color: "rgba(16,185,129,0)" },
            ],
          },
        },
        markLine: {
          silent: true,
          symbol: "none",
          lineStyle: { color: isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.1)", type: "dashed" as const, width: 1 },
          label: {
            formatter: "Target",
            color: isDark ? "#7E9098" : "#5C7077",
            fontSize: 10,
            position: "end" as const,
          },
          data: [{ yAxis: 50 }],
        },
      },
    ],
  };

  return <ReactECharts option={option} style={{ height: "100%", width: "100%" }} opts={{ renderer: 'svg' }} />;
}
