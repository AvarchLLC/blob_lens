"use client";

import type { MarketHour } from "@/types";
import ReactECharts from "echarts-for-react";

function shortHour(iso: string) {
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}h`;
}

interface Props {
  data: MarketHour[];
}

export function SlotUtilizationChart({ data }: Props) {
  if (!data.length)
    return <p className="py-8 text-center text-[0.6875rem] text-[#4B5563]">No data</p>;

  const labels = data.map((d) => shortHour(d.hour));
  const values = data.map((d) => parseFloat(Number(d.avg_utilization).toFixed(2)));

  const option = {
    animation: true,
    animationEasing: "cubicOut" as const,
    animationDuration: 600,
    grid: { top: 8, right: 8, bottom: 24, left: 0, containLabel: true },
    xAxis: {
      type: "category" as const,
      data: labels,
      axisLabel: { color: "#4B5563", fontSize: 11, fontFamily: "Space Grotesk, system-ui" },
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: { show: false },
      boundaryGap: false,
    },
    yAxis: {
      type: "value" as const,
      min: 0,
      max: 100,
      axisLabel: {
        color: "#4B5563", fontSize: 11, fontFamily: "Space Grotesk, system-ui",
        formatter: (v: number) => `${v}%`,
      },
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: { lineStyle: { color: "rgba(255,255,255,0.04)" } },
    },
    tooltip: {
      trigger: "axis" as const,
      backgroundColor: "#1A2235",
      borderColor: "rgba(16,185,129,0.2)",
      borderWidth: 1,
      textStyle: { color: "#F9FAFB", fontSize: 12, fontFamily: "Space Grotesk, system-ui" },
      formatter: (params: { axisValue: string; value: number }[]) =>
        `<span style="color:#4B5563;font-size:11px">${params[0].axisValue}</span><br/><b style="font-family:monospace;color:#6EE7B7">${params[0].value.toFixed(1)}% utilized</b>`,
    },
    series: [
      {
        type: "line" as const,
        data: values,
        smooth: 0.4,
        lineStyle: { color: "#6366F1", width: 2 },
        symbol: "none",
        areaStyle: {
          color: {
            type: "linear" as const,
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: "rgba(99,102,241,0.15)" },
              { offset: 1, color: "rgba(99,102,241,0)" },
            ],
          },
        },
      },
    ],
  };

  return <ReactECharts option={option} style={{ height: "280px", width: "100%" }} />;
}
