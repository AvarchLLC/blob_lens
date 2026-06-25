"use client";

import { getChartTheme, animationConfig } from "@/lib/chartTheme";
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
  enterprise: "#E8A020",
  bridges: "#5B8DB8",
  other: "#52666E",
};

const CAT_LABELS: Record<string, string> = {
  staked: "Staking Pools",
  cex: "Centralized Exchanges",
  enterprise: "Enterprise Treasuries",
  bridges: "Cross-chain Bridges",
};

export function ETHLiquidityTrendChart({ data }: Props) {
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return <div className="h-[350px] w-full animate-pulse bg-surface-elevated rounded-none border border-dashed border-border" />;
  }

  if (!data.length) {
    return <p className="py-8 text-center text-xs text-text-secondary opacity-50 italic font-mono">No historical liquidity data available</p>;
  }

  const isDark = theme !== "light";
  const t = getChartTheme(isDark);

  // Theme-aware tooltip colors
  const ttText = isDark ? "#F0F4F5" : "#0D1618";
  const ttMuted = isDark ? "#7E9098" : "#5C7077";
  const ttDivider = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.08)";

  const byDay = new Map<string, Map<string, { eth: number; usd: number }>>();
  
  for (const row of data) {
    let day = "";
    try {
      day = new Date(row.timestamp).toISOString().split('T')[0];
    } catch (e) {
      day = row.timestamp.substring(0, 10);
    }
    
    if (!byDay.has(day)) {
      byDay.set(day, new Map<string, { eth: number; usd: number }>());
    }
    const dayMap = byDay.get(day)!;
    dayMap.set(row.category, { eth: row.balance_eth, usd: row.balance_usd });
  }

  const dayKeys = [...byDay.keys()].sort(
    (a, b) => new Date(a).getTime() - new Date(b).getTime()
  );

  const xLabels = dayKeys.map((day) =>
    new Date(day).toLocaleDateString("en-US", { month: "short", day: "2-digit" })
  );

  const categories = ["staked", "cex", "enterprise", "bridges"];

  const option = {
    ...animationConfig,
    backgroundColor: "transparent",
    graphic: t.graphic,
    grid: {
      ...t.gridDefaults,
      bottom: 64, // extra space for dataZoom
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
          if (v >= 1e6) return `${(v / 1e6).toFixed(1)}M`;
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
        
        const dayMap = byDay.get(dayKey);
        let totalEth = 0;
        let totalUsd = 0;
        if (dayMap) {
          for (const val of dayMap.values()) {
            totalEth += val.eth;
            totalUsd += val.usd;
          }
        }

        // Sort so the largest category displays first in the list
        const sortedParams = [...params].sort((a, b) => (b.value || 0) - (a.value || 0));

        return `
          <div style="min-width:260px;display:flex;flex-direction:column;gap:8px;padding:4px;">
            <div style="border-bottom:1px solid ${ttDivider};padding-bottom:6px;margin-bottom:4px;">
              <span style="font-size:10px;font-weight:bold;color:${ttMuted};text-transform:uppercase;font-family:var(--font-mono),monospace;">${fullDate}</span>
            </div>
            ${sortedParams.map(p => {
              const v = Number(p.value || 0);
              const pct = totalEth > 0 ? ((v / totalEth) * 100).toFixed(1) : "0";
              const catKey = Object.keys(CAT_LABELS).find(k => CAT_LABELS[k] === p.seriesName) || "";
              const usdVal = dayMap?.get(catKey)?.usd ?? 0;
              const formattedUsd = usdVal > 0 ? `$${(usdVal / 1e9).toFixed(2)}B` : "—";
              return `
                <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;">
                  <div style="display:flex;align-items:center;gap:6px;">
                    <div style="width:6px;height:6px;border-radius:50%;background-color:${p.color};"></div>
                    <span style="font-size:11px;color:${ttText};font-family:var(--font-mono),monospace;">${p.seriesName}</span>
                  </div>
                  <div style="display:flex;gap:8px;align-items:baseline;">
                    <span style="font-family:var(--font-mono),monospace;font-size:11px;font-weight:bold;color:${ttText};">${v.toLocaleString(undefined, { maximumFractionDigits: 0 })} ETH</span>
                    <span style="font-size:9px;color:${ttMuted};font-family:var(--font-mono),monospace;width:32px;text-align:right;">${pct}%</span>
                  </div>
                </div>
              `;
            }).join('')}
            <div style="border-top:1px solid ${ttDivider};margin-top:6px;padding-top:6px;display:flex;flex-direction:column;gap:4px;">
              <div style="display:flex;justify-content:space-between;align-items:center;">
                <span style="font-size:10px;font-weight:bold;color:${ttMuted};text-transform:uppercase;font-family:var(--font-mono),monospace;">Total ETH</span>
                <span style="font-family:var(--font-mono),monospace;font-size:11px;font-weight:bold;color:${ttText};">${totalEth.toLocaleString(undefined, { maximumFractionDigits: 0 })} ETH</span>
              </div>
              <div style="display:flex;justify-content:space-between;align-items:center;">
                <span style="font-size:10px;font-weight:bold;color:${ttMuted};text-transform:uppercase;font-family:var(--font-mono),monospace;">Total USD</span>
                <span style="font-family:var(--font-mono),monospace;font-size:11px;font-weight:bold;color:#10B981;">$${(totalUsd / 1e9).toFixed(2)}B</span>
              </div>
            </div>
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
    series: categories.map((cat) => ({
      name: CAT_LABELS[cat] || cat,
      type: "line" as const,
      stack: "eth_liquidity",
      areaStyle: {
        opacity: isDark ? 0.12 : 0.18,
      },
      emphasis: { focus: "series" as const },
      showSymbol: false,
      smooth: 0.2,
      lineStyle: {
        width: 2,
        color: CAT_COLORS[cat],
      },
      itemStyle: {
        color: CAT_COLORS[cat],
      },
      data: dayKeys.map((day) => byDay.get(day)?.get(cat)?.eth ?? 0),
    })),
  };

  return <ReactECharts option={option} style={{ height: "350px", width: "100%" }} opts={{ renderer: "svg" }} />;
}
