"use client";

import { getChartTheme, animationConfig } from "@/lib/chartTheme";
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

export function TopWhalesBarChart({ data }: Props) {
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return <div className="h-[340px] w-full animate-pulse bg-surface-elevated rounded-none border border-dashed border-border" />;
  }

  // Filter out consensus deposit contract to keep active wallet scales readable
  const activeWhales = data
    .filter((w) => w.address.toLowerCase() !== "0x00000000219ab540356cbb839cbe05303d7705fa")
    .slice(0, 10);

  if (!activeWhales.length) {
    return <p className="py-8 text-center text-xs text-text-secondary opacity-50 italic font-mono">No active whale wallets available</p>;
  }

  const isDark = theme !== "light";
  const t = getChartTheme(isDark);

  const ttText = isDark ? "#F0F4F5" : "#0D1618";
  const ttMuted = isDark ? "#7E9098" : "#5C7077";
  const ttDivider = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.08)";

  const option = {
    ...animationConfig,
    backgroundColor: "transparent",
    graphic: t.graphic,
    grid: {
      ...t.gridDefaults,
      left: 120, // space for whale names on y-axis
      right: 60,
      top: 20,
      bottom: 40,
    },
    yAxis: {
      type: "category" as const,
      data: activeWhales.map((w) => w.label || `${w.address.slice(0, 6)}...${w.address.slice(-4)}`),
      inverse: true, // Largest on top
      ...t.axis,
      axisLabel: {
        ...t.axis.axisLabel,
        fontFamily: "var(--font-mono), monospace",
        fontSize: 10,
        fontWeight: "bold",
      },
      axisLine: { show: false },
      axisTick: { show: false },
    },
    xAxis: {
      type: "value" as const,
      ...t.axis,
      name: "ETH BALANCE",
      nameLocation: "middle" as const,
      nameGap: 25,
      nameTextStyle: {
        ...t.axis.axisLabel,
        fontFamily: "var(--font-mono), monospace",
        fontSize: 9,
      },
      axisLabel: {
        ...t.axis.axisLabel,
        formatter: (v: number) => {
          if (v >= 1e3) return `${(v / 1e3).toFixed(0)}K`;
          return String(v);
        },
        fontFamily: "var(--font-mono), monospace",
        fontSize: 9,
      },
      splitLine: {
        show: true,
        lineStyle: {
          color: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.03)",
          type: "dashed" as const,
        },
      },
    },
    tooltip: {
      trigger: "item" as const,
      ...t.tooltip,
      formatter: (params: any) => {
        const item = activeWhales[params.dataIndex];
        const catColor = CAT_COLORS[item.category || "individual"] || CAT_COLORS.other;
        return `
          <div style="min-width:240px;display:flex;flex-direction:column;gap:6px;padding:4px;">
            <div style="border-bottom:1px solid ${ttDivider};padding-bottom:4px;margin-bottom:4px;display:flex;justify-content:space-between;align-items:center;gap:12px;">
              <span style="font-size:11px;font-weight:bold;color:${ttText};font-family:var(--font-mono),monospace;">${item.label || "Individual Whale"}</span>
              <span style="font-size:8px;font-weight:bold;padding:2px 4px;background-color:${catColor}20;color:${catColor};border:1px solid ${catColor}40;font-family:var(--font-mono),monospace;text-transform:uppercase;">${item.category || "individual"}</span>
            </div>
            <div style="display:flex;flex-direction:column;gap:2px;margin-bottom:4px;">
              <span style="font-size:9px;color:${ttMuted};font-family:var(--font-mono),monospace;">Address</span>
              <span style="font-family:var(--font-mono),monospace;font-size:10px;color:${ttText};word-break:break-all;">${item.address}</span>
            </div>
            <div style="display:flex;justify-content:space-between;align-items:center;border-top:1px solid ${ttDivider};padding-top:4px;">
              <span style="font-size:10px;color:${ttMuted};font-family:var(--font-mono),monospace;">ETH Balance</span>
              <span style="font-family:var(--font-mono),monospace;font-size:11px;font-weight:bold;color:${ttText};">${item.balance_eth.toLocaleString()} ETH</span>
            </div>
            <div style="display:flex;justify-content:space-between;align-items:center;">
              <span style="font-size:10px;color:${ttMuted};font-family:var(--font-mono),monospace;">USD Value</span>
              <span style="font-family:var(--font-mono),monospace;font-size:11px;font-weight:bold;color:#10B981;">$${(item.balance_usd / 1e6).toFixed(2)}M</span>
            </div>
          </div>
        `;
      },
    },
    series: [
      {
        name: "Active Balance",
        type: "bar" as const,
        barMaxWidth: 18,
        itemStyle: {
          color: (params: any) => CAT_COLORS[activeWhales[params.dataIndex].category || "individual"] || CAT_COLORS.other,
          borderRadius: 0, // sharp corners
        },
        label: {
          show: true,
          position: "right" as const,
          formatter: (params: any) => {
            const val = Number(params.value);
            if (val >= 1e3) return `${(val / 1e3).toFixed(1)}K ETH`;
            return `${val.toLocaleString()} ETH`;
          },
          fontFamily: "var(--font-mono), monospace",
          fontSize: 9,
          fontWeight: "bold",
          color: isDark ? "#8E8EA8" : "#58547A",
        },
        data: activeWhales.map((w) => w.balance_eth),
      },
    ],
  };

  return (
    <div className="w-full h-[340px]">
      <ReactECharts option={option} style={{ height: "100%", width: "100%" }} opts={{ renderer: "svg" }} />
    </div>
  );
}
