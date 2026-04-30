"use client";

import type { LeaderboardRow } from "@/types";
import ReactECharts from "echarts-for-react";

interface Props {
  data: LeaderboardRow[];
}

export function RollupVolumeAreaChart({ data }: Props) {
  if (!data.length)
    return <p className="py-8 text-center text-[0.6875rem] text-[#5C5575]">No data</p>;

  const top10 = [...data].slice(0, 10);
  const labels = top10.map((d) =>
    d.rollup.length > 14 ? d.rollup.slice(0, 14) + "…" : d.rollup
  );
  const values = top10.map((d, i) => ({
    value: Number(d.total_blobs),
    itemStyle: {
      color: `rgba(138,79,216,${Math.max(0.38, 1 - i * 0.09)})`,
      borderRadius: [0, 3, 3, 0],
    },
  }));

  const option = {
    animation: true,
    animationEasing: "cubicOut" as const,
    animationDuration: 700,
    grid: { top: 4, right: 16, bottom: 4, left: 0, containLabel: true },
    xAxis: {
      type: "value" as const,
      axisLabel: {
        color: "#5C5575", fontSize: 11, fontFamily: "var(--font-geist-sans)",
        formatter: (v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v),
      },
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: { lineStyle: { color: "rgba(255,255,255,0.04)" } },
    },
    yAxis: {
      type: "category" as const,
      data: labels,
      inverse: true,
      axisLabel: { color: "#9D93B8", fontSize: 11, fontFamily: "var(--font-geist-sans)" },
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: { show: false },
    },
    tooltip: {
      trigger: "axis" as const,
      backgroundColor: "#141414",
      borderColor: "#242424",
      borderWidth: 1,
      textStyle: { color: "#F0EEF6", fontSize: 12 },
      axisPointer: { type: "shadow" as const, shadowStyle: { color: "rgba(138,79,216,0.06)" } },
      formatter: (params: { name: string; value: number }[]) =>
        `<b>${params[0].name}</b><br/>${params[0].value.toLocaleString()} blobs`,
    },
    series: [
      {
        type: "bar" as const,
        data: values,
        barCategoryGap: "32%",
        name: "Blobs",
      },
    ],
  };

  return <ReactECharts option={option} style={{ height: "280px", width: "100%" }} />;
}
