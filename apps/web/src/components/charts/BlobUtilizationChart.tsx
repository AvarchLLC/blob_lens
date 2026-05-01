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

export function BlobUtilizationChart({ data }: Props) {
  if (!data.length)
    return <p className="py-8 text-center text-[0.6875rem] text-[#5C5575]">No data</p>;

  const labels = data.map((d) => shortHour(d.hour));
  const values = data.map((d) => parseFloat(Number(d.avg_utilization).toFixed(1)));

  const option = {
    animation: true,
    animationEasing: "cubicOut" as const,
    animationDuration: 600,
    grid: { top: 16, right: 16, bottom: 24, left: 0, containLabel: true },
    xAxis: {
      type: "category" as const,
      data: labels,
      axisLabel: { color: "#5C5575", fontSize: 11, fontFamily: "var(--font-geist-sans)" },
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
        color: "#5C5575",
        fontSize: 11,
        fontFamily: "var(--font-geist-sans)",
        formatter: (v: number) => `${v}%`,
      },
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: { lineStyle: { color: "rgba(255,255,255,0.04)" } },
    },
    tooltip: {
      trigger: "axis" as const,
      backgroundColor: "#141414",
      borderColor: "#242424",
      borderWidth: 1,
      textStyle: { color: "#F0EEF6", fontSize: 12 },
      formatter: (params: { axisValue: string; value: number }[]) =>
        `<span style="color:#5C5575;font-size:11px">${params[0].axisValue}</span><br/><b>${params[0].value}%</b> avg utilization`,
    },
    series: [
      {
        type: "line" as const,
        data: values,
        smooth: 0.4,
        lineStyle: { color: "#8A4FD8", width: 2.2 },
        symbol: "none",
        areaStyle: {
          color: {
            type: "linear" as const,
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: "rgba(138,79,216,0.28)" },
              { offset: 1, color: "rgba(138,79,216,0)" },
            ],
          },
        },
        markLine: {
          silent: true,
          symbol: "none",
          lineStyle: { color: "#3D3D4E", type: "dashed" as const, width: 1.5 },
          label: {
            formatter: "50% target",
            color: "#5C5575",
            fontSize: 10,
            position: "end" as const,
          },
          data: [{ yAxis: 50 }],
        },
      },
    ],
  };

  return <ReactECharts option={option} style={{ height: "280px", width: "100%" }} />;
}
