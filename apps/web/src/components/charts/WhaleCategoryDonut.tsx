"use client";

import { getChartTheme, watermarkGraphic, animationConfig } from "@/lib/chartTheme";
import type { WhaleWallet } from "@/types";
import ReactECharts from "echarts-for-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

interface Props {
  data: WhaleWallet[];
}

const CAT_COLORS: Record<string, string> = {
  contract: "#8B5CF6",
  exchange: "#3B82F6",
  founder: "#EC4899",
  enterprise: "#E8A020",
  individual: "#10B981",
  other: "#6B7280",
};

const CAT_LABELS: Record<string, string> = {
  contract: "Smart Contracts",
  exchange: "Exchanges",
  founder: "Founders / Team",
  enterprise: "Treasuries",
  individual: "Individual Whales",
};

export function WhaleCategoryDonut({ data }: Props) {
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return <div className="flex-1 w-full min-h-[300px] animate-pulse bg-surface-elevated rounded-none border border-dashed border-border" />;
  }

  if (!data.length) {
    return <p className="py-8 text-center text-xs text-text-secondary opacity-50 italic font-mono">No category distribution data available</p>;
  }

  const isDark = theme !== "light";
  const t = getChartTheme(isDark);

  const grandTotal = data.reduce((s, d) => s + (d.balance_eth || 0), 0);

  // Group by category
  const grouped = new Map<string, number>();
  for (const w of data) {
    const cat = w.category || "individual";
    grouped.set(cat, (grouped.get(cat) || 0) + (w.balance_eth || 0));
  }

  const chartData = [...grouped.entries()].map(([cat, val]) => ({
    name: CAT_LABELS[cat] || cat,
    value: val,
    itemStyle: {
      color: CAT_COLORS[cat] || CAT_COLORS.other,
    },
  })).sort((a, b) => b.value - a.value);

  const option = {
    ...animationConfig,
    backgroundColor: "transparent",
    tooltip: {
      trigger: "item" as const,
      ...t.tooltip,
      formatter: (params: { name: string; value: number; percent: number; color: string }) =>
        `<div style="display:flex;flex-direction:column;gap:4px;">
          <span style="color:#8FA1A8;font-size:10px;font-weight:bold;text-transform:uppercase;">${params.name}</span>
          <span style="font-family:'JetBrains Mono',monospace;color:${params.color};font-weight:700;font-size:12px;">${params.value.toLocaleString(undefined, { maximumFractionDigits: 0 })} ETH (${params.percent.toFixed(1)}%)</span>
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
          text: grandTotal.toLocaleString(undefined, { maximumFractionDigits: 0 }),
          fill: isDark ? "#F5F3FF" : "#0E0C1B",
          fontSize: 16,
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
          text: "TOTAL TRACKED ETH",
          fill: isDark ? "#8E8EA8" : "#58547A",
          fontSize: 8,
          fontWeight: "bold",
          fontFamily: "var(--font-mono), monospace",
          textAlign: "center",
        },
      },
    ],
    series: [
      {
        name: "Whale Distribution",
        type: "pie" as const,
        radius: ["58%", "76%"],
        padAngle: 2,
        center: ["50%", "42%"],
        data: chartData,
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

  return (
    <div className="flex-1 w-full min-h-[300px] h-full">
      <ReactECharts option={option} style={{ height: "100%", width: "100%" }} opts={{ renderer: "svg" }} />
    </div>
  );
}
