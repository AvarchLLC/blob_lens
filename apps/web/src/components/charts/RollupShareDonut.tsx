"use client";

import { rollupColor } from "@/lib/utils";
import type { LeaderboardRow } from "@/types";
import ReactECharts from "echarts-for-react";

interface Props {
  data: LeaderboardRow[];
}

export function RollupShareDonut({ data }: Props) {
  if (!data.length)
    return <p className="py-8 text-center text-[0.6875rem] text-[#4B5563]">No data</p>;

  const sorted = [...data]
    .filter((d) => d.rollup !== "UNKNOWN")
    .sort((a, b) => Number(b.total_blobs) - Number(a.total_blobs));

  const unknownBlobs = data
    .filter((d) => d.rollup === "UNKNOWN")
    .reduce((s, d) => s + Number(d.total_blobs), 0);

  const top = sorted.slice(0, 8).map((d) => ({ name: d.rollup, value: Number(d.total_blobs) }));
  const otherValue =
    sorted.slice(8).reduce((s, d) => s + Number(d.total_blobs), 0) + unknownBlobs;
  const chartData = otherValue > 0 ? [...top, { name: "Other", value: otherValue }] : top;
  const total = chartData.reduce((s, d) => s + d.value, 0);

  const option = {
    animation: true,
    animationEasing: "cubicOut" as const,
    animationDuration: 700,
    tooltip: {
      trigger: "item" as const,
      backgroundColor: "#1A2235",
      borderColor: "rgba(16,185,129,0.2)",
      borderWidth: 1,
      textStyle: { color: "#F9FAFB", fontSize: 12, fontFamily: "Space Grotesk, system-ui" },
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
          fill: "#F9FAFB",
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
          text: "TOTAL BLOBS",
          fill: "#4B5563",
          fontSize: 10,
          fontFamily: "Space Grotesk, system-ui",
          textAlign: "center",
        },
      },
    ],
    series: [
      {
        type: "pie" as const,
        radius: ["62%", "80%"],
        padAngle: 2,
        center: ["50%", "50%"],
        data: chartData.map((d) => ({
          name: d.name,
          value: d.value,
          itemStyle: {
            color: d.name === "Other" ? "#374151" : rollupColor(d.name),
          },
        })),
        label: { show: false },
        emphasis: {
          scale: true,
          scaleSize: 4,
          itemStyle: {
            shadowBlur: 16,
            shadowColor: "rgba(0,0,0,0.4)",
          },
        },
      },
    ],
  };

  return <ReactECharts option={option} style={{ height: "280px", width: "100%" }} />;
}
