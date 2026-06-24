"use client";

import { getChartTheme, animationConfig } from "@/lib/chartTheme";
import { formatNumber, rollupColor } from "@/lib/utils";
import type { DailyRollupBlob } from "@/types";
import ReactECharts from "echarts-for-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

interface Props {
  data: DailyRollupBlob[];
}

export function RollupVolumeAreaChart({ data }: Props) {
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) return <div className="h-full w-full animate-pulse bg-surface-elevated rounded-sm" />;

  if (!data.length)
    return <p className="py-8 text-center text-xs text-text-secondary opacity-50 italic">No historical volume data</p>;

  const isDark = theme !== "light";
  const t = getChartTheme(isDark);

  // Theme-aware tooltip colors
  const ttText = isDark ? "#F0F4F5" : "#0D1618";
  const ttMuted = isDark ? "#7E9098" : "#5C7077";
  const ttDivider = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.08)";

  const byDay = new Map<string, Map<string, number>>();
  const totalsByRollup = new Map<string, number>();
  const dayKeys = [...new Set(data.map((d) => d.day))].sort(
    (a, b) => new Date(a).getTime() - new Date(b).getTime()
  );

  for (const row of data) {
    const day = row.day;
    if (!byDay.has(day)) byDay.set(day, new Map<string, number>());
    const dayMap = byDay.get(day)!;
    dayMap.set(row.rollup, Number(row.blobs));
    totalsByRollup.set(row.rollup, (totalsByRollup.get(row.rollup) ?? 0) + Number(row.blobs));
  }

  const rollups = [...totalsByRollup.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([rollup]) => rollup);

  const xLabels = dayKeys.map((day) =>
    new Date(day).toLocaleDateString("en-US", { month: "short", day: "2-digit" })
  );

  const option = {
    ...animationConfig,
    backgroundColor: t.backgroundColor,
    graphic: t.graphic,
    grid: { 
      ...t.gridDefaults,
      bottom: 24,
    },
    xAxis: {
      type: "category" as const,
      data: xLabels,
      ...t.axis,
      axisLabel: {
        ...t.axis.axisLabel,
        interval: Math.floor(dayKeys.length / 8)
      }
    },
    yAxis: {
      type: "value" as const,
      ...t.axis,
      name: "BLOBS",
      nameTextStyle: { ...t.axis.axisLabel, padding: [0, 0, 0, 30] },
      axisLabel: {
        ...t.axis.axisLabel,
        formatter: (v: number) => (v >= 1000 ? `${Math.round(v / 1000)}K` : String(v)),
      },
    },
    tooltip: {
      trigger: "axis" as const,
      ...t.tooltip,
      appendToBody: true,
      confine: false,
      axisPointer: { type: "shadow" as const, shadowStyle: { color: "rgba(0, 167, 181, 0.05)" } },
      formatter: (params: any[]) => {
        if (!params.length) return "";

        const dayIdx = xLabels.findIndex((l) => l === params[0].axisValue);
        const dayKey = dayKeys[Math.max(0, dayIdx)];
        const dayDate = new Date(dayKey);
        const fullDate = dayDate.toLocaleDateString("en-US", { 
          weekday: "short", month: "short", day: "numeric", year: "numeric" 
        });
        
        const total = params.reduce((sum, p) => sum + Number(p.value || 0), 0);
        const sortedParams = [...params].sort((a, b) => (b.value || 0) - (a.value || 0));

        return `
          <div style="min-width:240px;display:flex;flex-direction:column;gap:8px;">
            <div style="border-bottom:1px solid ${ttDivider};padding-bottom:4px;margin-bottom:4px;">
              <span style="font-size:10px;font-weight:bold;color:${ttMuted};text-transform:uppercase;">${fullDate}</span>
            </div>
            ${sortedParams.slice(0, 10).map(p => {
              const v = Number(p.value || 0);
              const pct = total > 0 ? ((v / total) * 100).toFixed(1) : "0";
              return `
                <div style="display:flex;justify-content:space-between;align-items:center;">
                  <div style="display:flex;align-items:center;gap:6px;">
                    <div style="width:6px;height:6px;border-radius:50%;background-color:${rollupColor(p.seriesName)};"></div>
                    <span style="font-size:11px;color:${ttText};">${p.seriesName}</span>
                  </div>
                  <div style="display:flex;gap:8px;align-items:baseline;">
                    <span style="font-family:monospace;font-size:11px;font-weight:bold;color:${ttText};">${formatNumber(v)}</span>
                    <span style="font-size:9px;color:${ttMuted};width:35px;text-align:right;">${pct}%</span>
                  </div>
                </div>
              `;
            }).join('')}
            ${params.length > 10 ? `<div style="font-size:9px;color:${ttMuted};text-align:center;">+ ${params.length - 10} more rollups</div>` : ''}
            <div style="border-top:1px solid ${ttDivider};margin-top:4px;padding-top:8px;display:flex;justify-content:space-between;align-items:center;">
              <span style="font-size:11px;font-weight:bold;color:${ttText};text-transform:uppercase;letter-spacing:0.05em;">Total</span>
              <span style="font-family:monospace;font-size:12px;font-weight:bold;color:#00A7B5;">${formatNumber(total)}</span>
            </div>
          </div>
        `;
      },
    },
    legend: {
      ...t.legend,
      top: 0,
      type: 'scroll',
      icon: 'circle',
    },
    dataZoom: t.dataZoom,
    series: rollups.map((rollup) => ({
      name: rollup,
      type: "bar" as const,
      stack: "blobs",
      barMaxWidth: 32,
      itemStyle: { color: rollupColor(rollup) },
      emphasis: { focus: "series" as const },
      data: dayKeys.map((day) => byDay.get(day)?.get(rollup) ?? 0),
    })),
  };

  return <ReactECharts option={option} style={{ height: "100%", width: "100%" }} opts={{ renderer: 'svg' }} />;
}
