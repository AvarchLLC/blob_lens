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

  if (!mounted) {
    return <div className="h-[300px] w-full animate-pulse bg-surface-elevated rounded-none border border-dashed border-border" />;
  }

  if (!data.length) {
    return <p className="py-8 text-center text-xs text-text-secondary opacity-50 italic font-mono">No network share data available</p>;
  }

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
    backgroundColor: "transparent",
    tooltip: {
      trigger: "item" as const,
      ...t.tooltip,
      formatter: (params: { name: string; value: number; percent: number }) =>
        `<div style="display:flex;flex-direction:column;gap:4px;">
          <span style="color:#8FA1A8;font-size:10px;font-weight:bold;text-transform:uppercase;">${params.name}</span>
          <span style="font-family:'JetBrains Mono',monospace;color:#8B5CF6;font-weight:700;font-size:12px;">${params.value.toLocaleString()} blobs (${params.percent.toFixed(1)}%)</span>
        </div>`,
    },
    legend: {
      type: "scroll",
      orient: "horizontal" as const,
      bottom: 0,
      left: "center",
      show: true,
      textStyle: {
        color: isDark ? "#8E8EA8" : "#58547A",
        fontSize: 10,
        fontFamily: "var(--font-mono), monospace",
      },
      itemWidth: 8,
      itemHeight: 8,
      selectedMode: true,
    },
    graphic: [
      ...watermarkGraphic,
      {
        type: "text",
        left: "center",
        top: "35%",
        style: {
          text: total.toLocaleString(),
          fill: isDark ? "#F5F3FF" : "#0E0C1B",
          fontSize: 18,
          fontWeight: "700",
          fontFamily: "var(--font-mono), monospace",
          textAlign: "center",
        },
      },
      {
        type: "text",
        left: "center",
        top: "46%",
        style: {
          text: "TOTAL BLOBS",
          fill: isDark ? "#8E8EA8" : "#58547A",
          fontSize: 9,
          fontWeight: "bold",
          fontFamily: "var(--font-mono), monospace",
          textAlign: "center",
        },
      },
    ],
    series: [
      {
        name: "Network Share",
        type: "pie" as const,
        radius: ["58%", "76%"],
        padAngle: 2,
        center: ["50%", "42%"],
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

  return <ReactECharts option={option} style={{ height: "300px", width: "100%" }} opts={{ renderer: "svg" }} />;
}
