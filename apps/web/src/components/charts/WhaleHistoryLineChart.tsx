"use client";

import { getChartTheme, animationConfig } from "@/lib/chartTheme";
import ReactECharts from "echarts-for-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

interface Props {
  data: any[];
}

const COLORS = ["#3B82F6", "#F59E0B", "#10B981", "#8B5CF6", "#EC4899", "#EF4444"];

export function WhaleHistoryLineChart({ data }: Props) {
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return <div className="h-[350px] w-full animate-pulse bg-surface-elevated rounded-none border border-dashed border-border" />;
  }

  if (!data.length) {
    return <p className="py-8 text-center text-xs text-text-secondary opacity-50 italic font-mono">No historical whale balance data available</p>;
  }

  const isDark = theme !== "light";
  const t = getChartTheme(isDark);

  const ttText = isDark ? "#F0F4F5" : "#0D1618";
  const ttMuted = isDark ? "#7E9098" : "#5C7077";
  const ttDivider = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.08)";

  // Group by day and wallet
  const byDay = new Map<string, Map<string, number>>();
  const walletLabels = new Map<string, string>();
  const walletLatestBalances = new Map<string, number>();

  for (const row of data) {
    if (row.address.toLowerCase() === "0x00000000219ab540356cbb839cbe05303d7705fa") continue; // skip consensus

    let day = "";
    try {
      day = new Date(row.timestamp).toISOString().split('T')[0];
    } catch (e) {
      day = row.timestamp.substring(0, 10);
    }

    if (!byDay.has(day)) {
      byDay.set(day, new Map<string, number>());
    }
    const dayMap = byDay.get(day)!;
    dayMap.set(row.address, row.balance_eth);

    const name = row.label || `${row.address.slice(0, 6)}...${row.address.slice(-4)}`;
    walletLabels.set(row.address, name);
    walletLatestBalances.set(row.address, row.balance_eth);
  }

  const dayKeys = [...byDay.keys()].sort(
    (a, b) => new Date(a).getTime() - new Date(b).getTime()
  );

  const xLabels = dayKeys.map((day) =>
    new Date(day).toLocaleDateString("en-US", { month: "short", day: "2-digit" })
  );

  // Get top 5 wallets by latest balance to display in the line chart
  const topWallets = [...walletLatestBalances.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([addr]) => addr);

  if (!topWallets.length) {
    return <p className="py-8 text-center text-xs text-text-secondary opacity-50 italic font-mono">No active wallets to trace</p>;
  }

  const option = {
    ...animationConfig,
    backgroundColor: "transparent",
    graphic: t.graphic,
    grid: {
      ...t.gridDefaults,
      bottom: 64,
      top: 50,
    },
    xAxis: {
      type: "category" as const,
      data: xLabels,
      ...t.axis,
      axisLabel: {
        ...t.axis.axisLabel,
        interval: Math.max(0, Math.floor(dayKeys.length / 8)),
      }
    },
    yAxis: {
      type: "value" as const,
      ...t.axis,
      name: "ETH BALANCE",
      nameTextStyle: { ...t.axis.axisLabel, padding: [0, 0, 0, 40] },
      axisLabel: {
        ...t.axis.axisLabel,
        formatter: (v: number) => {
          if (v >= 1e3) return `${(v / 1e3).toFixed(0)}K`;
          return String(v);
        },
      },
      splitLine: {
        show: true,
        lineStyle: {
          color: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)",
          type: "dashed" as const,
        },
      },
    },
    tooltip: {
      trigger: "axis" as const,
      ...t.tooltip,
      appendToBody: true,
      confine: false,
      axisPointer: { 
        type: "line" as const, 
        lineStyle: { 
          color: isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.08)", 
          type: "dashed" as const 
        } 
      },
      formatter: (params: any[]) => {
        if (!params.length) return "";

        const dayIdx = xLabels.findIndex((l) => l === params[0].axisValue);
        const dayKey = dayKeys[Math.max(0, dayIdx)];
        const dayDate = new Date(dayKey);
        const fullDate = dayDate.toLocaleDateString("en-US", { 
          weekday: "short", month: "short", day: "numeric", year: "numeric" 
        });

        // Sort so the highest balance displays on top
        const sortedParams = [...params].sort((a, b) => (b.value || 0) - (a.value || 0));

        return `
          <div style="min-width:260px;display:flex;flex-direction:column;gap:8px;padding:4px;">
            <div style="border-bottom:1px solid ${ttDivider};padding-bottom:6px;margin-bottom:4px;">
              <span style="font-size:10px;font-weight:bold;color:${ttMuted};text-transform:uppercase;font-family:var(--font-mono),monospace;">${fullDate}</span>
            </div>
            ${sortedParams.map(p => {
              const v = Number(p.value || 0);
              return `
                <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;">
                  <div style="display:flex;align-items:center;gap:6px;">
                    <div style="width:6px;height:6px;border-radius:50%;background-color:${p.color};"></div>
                    <span style="font-size:11px;color:${ttText};font-family:var(--font-mono),monospace;">${p.seriesName}</span>
                  </div>
                  <span style="font-family:var(--font-mono),monospace;font-size:11px;font-weight:bold;color:${ttText};">${v.toLocaleString(undefined, { maximumFractionDigits: 0 })} ETH</span>
                </div>
              `;
            }).join('')}
          </div>
        `;
      },
    },
    legend: {
      ...t.legend,
      top: 0,
      type: "scroll" as const,
      icon: "circle",
      textStyle: {
        ...t.legend.textStyle,
        fontFamily: "var(--font-mono), monospace",
      }
    },
    dataZoom: [
      {
        type: "inside" as const,
        start: 0,
        end: 100,
      },
      {
        type: "slider" as const,
        show: true,
        bottom: 10,
        height: 20,
        borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)",
        backgroundColor: "transparent",
        fillerColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)",
        handleStyle: {
          color: isDark ? "#8E8EA8" : "#58547A",
          borderColor: isDark ? "#444" : "#ccc",
        },
        textStyle: {
          color: isDark ? "#7E9098" : "#5C7077",
          fontFamily: "var(--font-mono), monospace",
          fontSize: 9,
        },
        start: 0,
        end: 100,
      }
    ],
    series: topWallets.map((addr, idx) => ({
      name: walletLabels.get(addr) || addr,
      type: "line" as const,
      showSymbol: false,
      smooth: 0.2,
      lineStyle: {
        width: 2,
        color: COLORS[idx % COLORS.length],
      },
      itemStyle: {
        color: COLORS[idx % COLORS.length],
      },
      // Map balances, filling any gaps with the latest known balance for that address
      data: dayKeys.map((day) => byDay.get(day)?.get(addr) ?? walletLatestBalances.get(addr) ?? 0),
    })),
  };

  return <ReactECharts option={option} style={{ height: "350px", width: "100%" }} opts={{ renderer: "svg" }} />;
}
