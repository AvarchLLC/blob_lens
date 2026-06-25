"use client";

import { getChartTheme, animationConfig } from "@/lib/chartTheme";
import ReactECharts from "echarts-for-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

interface Props {
  stakedEth: number;
}

interface StakingPoolInfo {
  name: string;
  share: number;
  type: string;
  color: string;
}

const STAKING_POOLS: StakingPoolInfo[] = [
  { name: "Lido", share: 0.312, type: "Liquid Staking", color: "#00A7B5" },
  { name: "Coinbase Staking", share: 0.145, type: "CEX Staking", color: "#3B82F6" },
  { name: "Solo Stakers", share: 0.128, type: "Independent", color: "#10B981" },
  { name: "Binance Staking", share: 0.076, type: "CEX Staking", color: "#F59E0B" },
  { name: "Kiln", share: 0.068, type: "Institutional", color: "#8B5CF6" },
  { name: "Figment", share: 0.052, type: "Institutional", color: "#EC4899" },
  { name: "Rocket Pool", share: 0.038, type: "Liquid Staking", color: "#EF4444" },
  { name: "Others", share: 0.181, type: "Diverse", color: "#6B7280" },
];

export function StakingBreakdownChart({ stakedEth }: Props) {
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return <div className="flex-1 w-full min-h-[320px] animate-pulse bg-surface-elevated rounded-none border border-dashed border-border" />;
  }

  if (!stakedEth) {
    return <p className="py-8 text-center text-xs text-text-secondary opacity-50 italic font-mono">No staking data available</p>;
  }

  const isDark = theme !== "light";
  const t = getChartTheme(isDark);

  const ttText = isDark ? "#F0F4F5" : "#0D1618";
  const ttMuted = isDark ? "#7E9098" : "#5C7077";
  const ttDivider = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.08)";

  // Compute values dynamically based on the total staked ETH in the Beacon contract
  const data = STAKING_POOLS.map((pool) => {
    const ethBalance = stakedEth * pool.share;
    const validatorCount = Math.floor(ethBalance / 32);
    return {
      ...pool,
      ethBalance,
      validatorCount,
    };
  }).sort((a, b) => b.ethBalance - a.ethBalance);

  const option = {
    ...animationConfig,
    backgroundColor: "transparent",
    graphic: t.graphic,
    grid: {
      ...t.gridDefaults,
      left: 110, // space for names on y-axis
      right: 50,
      top: 20,
      bottom: 40,
    },
    yAxis: {
      type: "category" as const,
      data: data.map((d) => d.name),
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
        formatter: (v: number) => `${(v / 1e6).toFixed(1)}M`,
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
        const item = data[params.dataIndex];
        return `
          <div style="min-width:220px;display:flex;flex-direction:column;gap:6px;padding:4px;">
            <div style="border-bottom:1px solid ${ttDivider};padding-bottom:4px;margin-bottom:4px;display:flex;justify-content:space-between;align-items:center;">
              <span style="font-size:11px;font-weight:bold;color:${ttText};font-family:var(--font-mono),monospace;">${item.name}</span>
              <span style="font-size:8px;font-weight:bold;padding:2px 4px;background-color:${item.color}20;color:${item.color};border:1px solid ${item.color}40;font-family:var(--font-mono),monospace;text-transform:uppercase;">${item.type}</span>
            </div>
            <div style="display:flex;justify-content:space-between;align-items:center;">
              <span style="font-size:10px;color:${ttMuted};font-family:var(--font-mono),monospace;">ETH Staked</span>
              <span style="font-family:var(--font-mono),monospace;font-size:11px;font-weight:bold;color:${ttText};">${item.ethBalance.toLocaleString(undefined, { maximumFractionDigits: 0 })} ETH</span>
            </div>
            <div style="display:flex;justify-content:space-between;align-items:center;">
              <span style="font-size:10px;color:${ttMuted};font-family:var(--font-mono),monospace;">Market Share</span>
              <span style="font-family:var(--font-mono),monospace;font-size:11px;font-weight:bold;color:${item.color};">${(item.share * 100).toFixed(1)}%</span>
            </div>
            <div style="display:flex;justify-content:space-between;align-items:center;border-top:1px solid ${ttDivider};margin-top:4px;padding-top:4px;">
              <span style="font-size:10px;color:${ttMuted};font-family:var(--font-mono),monospace;">Validators</span>
              <span style="font-family:var(--font-mono),monospace;font-size:11px;font-weight:bold;color:${ttText};">${item.validatorCount.toLocaleString()}</span>
            </div>
          </div>
        `;
      },
    },
    series: [
      {
        name: "ETH Staked",
        type: "bar" as const,
        barMaxWidth: 18,
        itemStyle: {
          color: (params: any) => data[params.dataIndex].color,
          borderRadius: 0, // Sharp brutalist corners
        },
        label: {
          show: true,
          position: "right" as const,
          formatter: (params: any) => `${(data[params.dataIndex].share * 100).toFixed(1)}%`,
          fontFamily: "var(--font-mono), monospace",
          fontSize: 9,
          fontWeight: "bold",
          color: isDark ? "#8E8EA8" : "#58547A",
        },
        data: data.map((d) => d.ethBalance),
      },
    ],
  };

  return (
    <div className="flex-1 w-full min-h-[320px] h-full">
      <ReactECharts option={option} style={{ height: "100%", width: "100%" }} opts={{ renderer: "svg" }} />
    </div>
  );
}
