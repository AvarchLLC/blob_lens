"use client";

import { getChartTheme, watermarkGraphic, animationConfig } from "@/lib/chartTheme";
import { rollupColor } from "@/lib/utils";
import type { LeaderboardRow } from "@/types";
import ReactECharts from "echarts-for-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

interface Props {
  data: LeaderboardRow[];
}

export function RollupShareDonut({ data }: Props) {
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) return <div className="h-full w-full animate-pulse bg-surface-elevated rounded-md" />;

  if (!data.length)
    return <p className="py-8 text-center text-xs text-text-secondary opacity-50 italic">No data</p>;

  const isDark = theme !== "light";
  const t = getChartTheme(isDark);

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
    ...animationConfig,
    tooltip: {
      trigger: "item" as const,
      ...t.tooltip,
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
          fill: isDark ? "#F0F4F5" : "#0D1618",
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
          fill: isDark ? "#7E9098" : "#5C7077",
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
            color: d.name === "Other" ? (isDark ? "#374151" : "#CBD5E1") : rollupColor(d.name),
          },
        })),
        label: { show: false },
        emphasis: {
          scale: true,
          scaleSize: 4,
          itemStyle: {
            shadowBlur: 16,
            shadowColor: isDark ? "rgba(0,0,0,0.4)" : "rgba(0,0,0,0.12)",
          },
        },
      },
    ],
  };

  return <ReactECharts option={option} style={{ height: "100%", width: "100%" }} />;
}
