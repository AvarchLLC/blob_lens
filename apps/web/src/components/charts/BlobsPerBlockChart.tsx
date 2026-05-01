"use client";

import { classifyRegime } from "@/lib/utils";
import type { MarketHour } from "@/types";
import ReactECharts from "echarts-for-react";

const REGIME_FILL: Record<string, string> = {
  undersaturated: "#3D4F6B",
  healthy:        "#10B981",
  congested:      "#F59E0B",
  spike:          "#EF4444",
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
    return <p className="py-8 text-center text-[0.6875rem] text-[#4B5563]">No data</p>;

  const labels = data.map((d) => shortHour(d.hour));
  const seriesData = data.map((d) => ({
    value: d.blob_count,
    itemStyle: {
      color: REGIME_FILL[classifyRegime(d.max_blobs_in_block)],
      opacity: 0.80,
      borderRadius: [2, 2, 0, 0],
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
      axisLabel: { color: "#4B5563", fontSize: 11, fontFamily: "Space Grotesk, system-ui" },
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: { show: false },
    },
    yAxis: {
      type: "value" as const,
      axisLabel: { color: "#4B5563", fontSize: 11, fontFamily: "Space Grotesk, system-ui" },
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
      axisPointer: { type: "shadow" as const, shadowStyle: { color: "rgba(16,185,129,0.06)" } },
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
