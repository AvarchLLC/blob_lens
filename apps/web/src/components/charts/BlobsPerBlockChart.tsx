"use client";

import { classifyRegime } from "@/lib/utils";
import type { MarketHour } from "@/types";
import ReactECharts from "echarts-for-react";

const REGIME_FILL: Record<string, string> = {
  undersaturated: "#3D3D4E",
  healthy: "#1A8C6A",
  congested: "#C4822A",
  spike: "#C0394A",
};

function shortHour(iso: string) {
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}h`;
}

interface Props {
  data: MarketHour[];
}

export function BlobsPerBlockChart({ data }: Props) {
  if (!data.length)
    return <p className="py-8 text-center text-[0.6875rem] text-[#5C5575]">No data</p>;

  const labels = data.map((d) => shortHour(d.hour));
  const seriesData = data.map((d) => ({
    value: d.blob_count,
    itemStyle: {
      color: REGIME_FILL[classifyRegime(d.max_blobs_in_block)],
      opacity: 0.78,
      borderRadius: [3, 3, 0, 0],
    },
  }));

  const option = {
    animation: true,
    animationEasing: "cubicOut" as const,
    animationDuration: 600,
    grid: { top: 8, right: 8, bottom: 24, left: 0, containLabel: true },
    xAxis: {
      type: "category" as const,
      data: labels,
      axisLabel: { color: "#5C5575", fontSize: 11, fontFamily: "var(--font-geist-sans)" },
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: { show: false },
    },
    yAxis: {
      type: "value" as const,
      axisLabel: { color: "#5C5575", fontSize: 11, fontFamily: "var(--font-geist-sans)" },
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
      axisPointer: { type: "shadow" as const, shadowStyle: { color: "rgba(138,79,216,0.06)" } },
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

  return <ReactECharts option={option} style={{ height: "280px", width: "100%" }} />;
}
