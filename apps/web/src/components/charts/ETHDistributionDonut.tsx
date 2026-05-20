"use client";

import { getChartTheme, watermarkGraphic, animationConfig } from "@/lib/chartTheme";
import type { ETHLiquiditySnapshot } from "@/types";
import ReactECharts from "echarts-for-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

interface Props {
  data: ETHLiquiditySnapshot[];
}

const CAT_COLORS: Record<string, string> = {
  staked: "#00A86B",
  cex: "#3B82F6",
  enterprise: "#F5A524",
  bridges: "#8B5CF6",
  other: "#71717A",
};

export function ETHDistributionDonut({ data }: Props) {
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) return <div className="h-full w-full animate-pulse bg-surface-elevated rounded-md" />;

  if (!data.length)
    return <p className="py-8 text-center text-xs text-text-secondary opacity-50 italic">No data</p>;

  const isDark = theme !== "light";
  const t = getChartTheme(isDark);

  const grandTotal = data.reduce((s, d) => s + d.balance_eth, 0);

  const option = {
    ...animationConfig,
    tooltip: {
      trigger: "item" as const,
      ...t.tooltip,
      formatter: (params: { name: string; value: number; percent: number }) =>
        `<b>${params.name.toUpperCase()}</b><br/>${params.value.toLocaleString(undefined, { maximumFractionDigits: 0 })} ETH (${params.percent.toFixed(1)}%)`,
    },
    graphic: [
      ...watermarkGraphic,
      {
        type: "text",
        left: "center",
        top: "42%",
        style: {
          text: grandTotal.toLocaleString(undefined, { maximumFractionDigits: 0 }),
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
          text: "INDEXED ETH",
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
        data: data.map((d) => ({
          name: d.category,
          value: d.balance_eth,
          itemStyle: {
            color: CAT_COLORS[d.category] || CAT_COLORS.other,
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
