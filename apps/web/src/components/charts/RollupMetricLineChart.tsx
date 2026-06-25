"use client";

import { getChartTheme, animationConfig } from "@/lib/chartTheme";
import { rollupColor } from "@/lib/utils";
import { formatUsd } from "@/lib/ethPrice";
import type { HourlyRollupValue } from "@/types";
import ReactECharts from "echarts-for-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

const GAS_PER_BLOB = 131_072;

type Mode = "fee-wei" | "utilization-pct";

interface Props {
  data: HourlyRollupValue[];
  mode: Mode;
  ethUsd?: number;
}

export function RollupMetricLineChart({ data, mode, ethUsd }: Props) {
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) return <div className="h-[280px] w-full animate-pulse bg-surface-elevated rounded-md" />;

  if (!data.length)
    return <p className="py-8 text-center text-[0.6875rem] text-text-secondary opacity-50 italic">No historical metrics data</p>;

  const useUsd = mode === "fee-wei" && ethUsd != null;
  const isDark = theme !== "light";
  const t = getChartTheme(isDark);

  const yName  = mode === "utilization-pct" ? "%" : useUsd ? "USD" : "G";
  const yFmt   = mode === "utilization-pct"
    ? (v: number) => `${v.toFixed(0)}%`
    : useUsd
      ? (v: number) => formatUsd(v)
      : (v: number) => v > 0 ? `${(v / 1e9).toFixed(3)}` : "0";
      
  const tipFmt = mode === "utilization-pct"
    ? (v: number) => `${v.toFixed(1)}% full`
    : useUsd
      ? (v: number) => `${formatUsd(v)} / blob`
      : (v: number) => `${(v / 1e9).toFixed(5)} G / blob`;

  const transform = (v: number) =>
    useUsd ? (v * GAS_PER_BLOB) / 1e18 * ethUsd! : v;

  const hours   = [...new Set(data.map((d) => d.hour))].sort();
  const rollups = [...new Set(data.map((d) => d.rollup))].sort();

  const index = new Map<string, Map<string, number>>();
  for (const row of data) {
    if (!index.has(row.rollup)) index.set(row.rollup, new Map());
    index.get(row.rollup)!.set(row.hour, Number(row.value));
  }

  const series = rollups.map((rollup) => ({
    name: rollup,
    type: "line",
    smooth: true,
    symbol: "none",
    lineStyle: { width: 1.5 },
    itemStyle: { color: rollupColor(rollup) },
    data: hours.map((h) => {
      const v = index.get(rollup)?.get(h);
      return v != null ? transform(v) : null;
    }),
    connectNulls: true,
  }));

  const option = {
    ...animationConfig,
    backgroundColor: t.backgroundColor,
    graphic: t.graphic,
    tooltip: {
      ...t.tooltip,
      trigger: "axis",
      formatter: (params: any[]) => {
        if (!params.length) return "";
        const time = new Date(hours[params[0].dataIndex]).toLocaleString([], { 
          month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' 
        });
        const rows = params
          .filter(p => p.value != null && p.value > 0)
          .sort((a, b) => (b.value ?? 0) - (a.value ?? 0))
          .slice(0, 10);
          
        const borderStyle = isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.08)";
        const titleColor = isDark ? "#8FA1A8" : "#58547A";
        const textColor = isDark ? "#F5F7F8" : "#0E0C1B";
        const subColor = isDark ? "#8FA1A8" : "#58547A";
          
        return `
          <div style="display:flex;flex-direction:column;gap:8px;min-width:180px;">
            <div style="display:flex;justify-between;align-items:center;border-bottom:1px solid ${borderStyle};padding-bottom:4px;margin-bottom:4px;">
              <span style="font-size:10px;font-weight:bold;color:${titleColor};text-transform:uppercase;letter-spacing:0.05em;">${time}</span>
            </div>
            ${rows.map(p => `
              <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;">
                <div style="display:flex;align-items:center;gap:6px;">
                  <div style="width:6px;height:6px;border-radius:full;background-color:${p.color};"></div>
                  <span style="font-size:11px;color:${textColor};font-weight:500;">${p.seriesName}</span>
                </div>
                <span style="font-family:'JetBrains Mono',monospace;font-size:11px;font-weight:bold;color:${p.color}">${tipFmt(p.value)}</span>
              </div>
            `).join('')}
            ${params.length > 10 ? `<div style="font-size:9px;color:${subColor};text-align:center;padding-top:4px;">+ ${params.length - 10} more rollups</div>` : ''}
          </div>
        `;
      }
    },
    legend: {
      ...t.legend,
      top: 0,
      type: 'scroll',
      icon: 'circle',
    },
    grid: {
      ...t.gridDefaults,
      top: 50,
      bottom: 70,
    },
    xAxis: {
      type: "category",
      data: hours.map((h) =>
        new Date(h).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      ),
      axisLabel: {
        ...t.axis.axisLabel,
        interval: Math.max(0, Math.floor(hours.length / 8)),
        fontSize: 9,
      },
      axisLine: t.axis.axisLine,
      axisTick: t.axis.axisTick,
    },
    yAxis: {
      ...t.axis,
      type: "value",
      name: yName.toUpperCase(),
      nameTextStyle: { ...t.axis.axisLabel, padding: [0, 0, 0, 30] },
      splitLine: t.axis.splitLine,
      axisLabel: { ...t.axis.axisLabel, formatter: yFmt },
    },
    dataZoom: t.dataZoom,
    series,
  };

  return (
    <ReactECharts
      option={option}
      style={{ height: 350, width: "100%" }}
      opts={{ renderer: "svg" }}
    />
  );
}
