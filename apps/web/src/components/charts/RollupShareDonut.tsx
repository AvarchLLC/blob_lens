"use client";

import type { LeaderboardRow } from "@/types";
import ReactECharts from "echarts-for-react";

const DONUT_COLORS = ["#8A4FD8", "#6B3FA0", "#4F2D7F", "#3A1F5E", "#271440", "#1A0D2E"];

interface Props {
  data: LeaderboardRow[];
}

export function RollupShareDonut({ data }: Props) {
  if (!data.length)
    return <p className="py-8 text-center text-[0.6875rem] text-[#5C5575]">No data</p>;

  const sorted = [...data]
    .filter((d) => d.rollup !== "UNKNOWN")
    .sort((a, b) => Number(b.total_blobs) - Number(a.total_blobs));

  const unknownBlobs = data
    .filter((d) => d.rollup === "UNKNOWN")
    .reduce((s, d) => s + Number(d.total_blobs), 0);

  const top = sorted.slice(0, 5).map((d) => ({ name: d.rollup, value: Number(d.total_blobs) }));
  const otherValue =
    sorted.slice(5).reduce((s, d) => s + Number(d.total_blobs), 0) + unknownBlobs;
  const chartData = otherValue > 0 ? [...top, { name: "Other", value: otherValue }] : top;
  const total = chartData.reduce((s, d) => s + d.value, 0);

  const option = {
    animation: true,
    animationEasing: "cubicOut" as const,
    animationDuration: 700,
    tooltip: {
      trigger: "item" as const,
      backgroundColor: "#141414",
      borderColor: "#242424",
      borderWidth: 1,
      textStyle: { color: "#F0EEF6", fontSize: 12 },
      formatter: (params: { name: string; value: number; percent: number }) =>
        `<b>${params.name}</b><br/>${params.value.toLocaleString()} blobs (${params.percent.toFixed(1)}%)`,
    },
    graphic: [
      {
        type: "text",
        left: "center",
        top: "42%",
        style: {
          text: total.toLocaleString(),
          fill: "#F0EEF6",
          fontSize: 17,
          fontWeight: "700",
          fontFamily: "var(--font-geist-mono)",
          textAlign: "center",
        },
      },
      {
        type: "text",
        left: "center",
        top: "53%",
        style: {
          text: "total blobs",
          fill: "#5C5575",
          fontSize: 11,
          fontFamily: "var(--font-geist-sans)",
          textAlign: "center",
        },
      },
    ],
    series: [
      {
        type: "pie" as const,
        radius: ["62%", "80%"],
        padAngle: 3,
        center: ["50%", "50%"],
        data: chartData.map((d, i) => ({
          name: d.name,
          value: d.value,
          itemStyle: { color: DONUT_COLORS[Math.min(i, DONUT_COLORS.length - 1)] },
        })),
        label: { show: false },
        emphasis: {
          scale: true,
          scaleSize: 4,
          itemStyle: { shadowBlur: 12, shadowColor: "rgba(138,79,216,0.5)" },
        },
      },
    ],
  };

  return <ReactECharts option={option} style={{ height: "280px", width: "100%" }} />;
}
