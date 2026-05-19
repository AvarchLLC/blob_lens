"use client";

import { blobLensTheme } from "@/lib/echarts-theme";
import { rollupColor } from "@/lib/utils";
import type { LeaderboardRow } from "@/types";
import ReactECharts from "echarts-for-react";

import { watermarkGraphic } from "@/lib/chartTheme";

interface Props {
  data: LeaderboardRow[];
}

export function RollupShareDonut({ data }: Props) {
  if (!data.length)
    return <p className="py-8 text-center text-[0.6875rem] text-[#4B5563]">No data</p>;

  const grandTotal = data.reduce((s, d) => s + Number(d.total_blobs), 0);

  const named: { name: string; value: number }[] = [];
  let otherValue = 0;

  for (const d of data) {
    const v = Number(d.total_blobs);
    const pct = grandTotal > 0 ? v / grandTotal : 0;
    if (d.rollup === "UNKNOWN" || pct < 0.01) {
      otherValue += v;
    } else {
      named.push({ name: d.rollup, value: v });
    }
  }

  named.sort((a, b) => b.value - a.value);
  const chartData = otherValue > 0 ? [...named, { name: "Other", value: otherValue }] : named;
  const total = grandTotal;

  const option = {
    animation: true,
    animationEasing: "cubicOut" as const,
    animationDuration: 700,
    tooltip: {
      trigger: "item" as const,
      ...blobLensTheme.tooltip,
      formatter: (params: { name: string; value: number; percent: number }) =>
        `<b>${params.name}</b><br/>${params.value.toLocaleString()} blobs (${params.percent.toFixed(1)}%)`,
    },
    graphic: [
      ...watermarkGraphic,
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
