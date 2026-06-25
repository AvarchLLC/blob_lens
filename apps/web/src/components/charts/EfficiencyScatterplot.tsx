"use client";

import ReactECharts from "echarts-for-react";
import { getChartTheme, animationConfig } from "@/lib/chartTheme";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import type { LeaderboardRow } from "@/types";

const EFFICIENCY_COLORS = {
  excellent: "#00A86B",
  good: "#E8A020",
  poor: "#E5484D",
};

function effColor(score: number): string {
  if (score >= 70) return EFFICIENCY_COLORS.excellent;
  if (score >= 40) return EFFICIENCY_COLORS.good;
  return EFFICIENCY_COLORS.poor;
}

interface Props {
  data: LeaderboardRow[];
}

export function EfficiencyScatterplot({ data }: Props) {
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) return <div className="h-[350px] w-full animate-pulse bg-surface-elevated rounded-none border border-dashed border-border" />;

  const filtered = data.filter(
    (r) => r.rollup !== "UNKNOWN" && Number(r.total_blobs) > 10
  );

  if (!filtered.length) {
    return <p className="py-8 text-center text-xs text-text-secondary italic font-mono opacity-50">Insufficient data for scatter analysis.</p>;
  }

  const isDark = theme !== "light";
  const t = getChartTheme(isDark);

  const maxBlobs = Math.max(...filtered.map((r) => Number(r.total_blobs)));

  const seriesData = filtered.map((r) => {
    const packing = Number(r.packing_score);
    const timing = Number(r.timing_score);
    const blobs = Number(r.total_blobs);
    const eff = Number(r.efficiency_score);
    const size = 10 + (blobs / maxBlobs) * 32; // Generous bubble size

    return {
      value: [packing, timing, blobs],
      symbolSize: Math.max(10, size),
      itemStyle: {
        color: effColor(eff),
        opacity: 0.85,
        borderColor: isDark ? "rgba(255,255,255,0.25)" : "rgba(0,0,0,0.15)",
        borderWidth: 1.5,
      },
      name: r.rollup,
      eff,
    };
  });

  const option = {
    ...animationConfig,
    backgroundColor: t.backgroundColor,
    graphic: t.graphic,
    grid: {
      ...t.gridDefaults,
      top: 40,
      bottom: 60,
      right: 40,
      left: 50,
    },
    xAxis: {
      type: "value" as const,
      name: "Packing Efficiency",
      nameTextStyle: {
        color: isDark ? "#8E8EA8" : "#58547A",
        fontSize: 10,
        fontWeight: "bold" as const,
        fontFamily: "var(--font-mono), monospace",
      },
      nameLocation: "center" as const,
      nameGap: 32,
      ...t.axis,
      min: 0,
      max: 100,
      axisLabel: {
        ...t.axis.axisLabel,
        formatter: (v: number) => `${v}%`,
      },
    },
    yAxis: {
      type: "value" as const,
      name: "Timing Efficiency",
      nameTextStyle: {
        color: isDark ? "#8E8EA8" : "#58547A",
        fontSize: 10,
        fontWeight: "bold" as const,
        fontFamily: "var(--font-mono), monospace",
      },
      nameLocation: "center" as const,
      nameGap: 36,
      ...t.axis,
      min: 0,
      max: 100,
      axisLabel: {
        ...t.axis.axisLabel,
        formatter: (v: number) => `${v}%`,
      },
    },
    tooltip: {
      trigger: "item" as const,
      ...t.tooltip,
      formatter: (params: { data: { value: number[]; name: string; eff: number } }) => {
        const [packing, timing, blobs] = params.data.value;
        const textColor = isDark ? "#F5F7F8" : "#0E0C1B";
        const labelColor = isDark ? "#8E8EA8" : "#58547A";

        return `<div style="display:flex;flex-direction:column;gap:6px;min-width:160px;">
          <span style="font-weight:700;font-size:13px;color:${textColor};border-bottom:1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'};padding-bottom:4px;margin-bottom:2px;">${params.data.name}</span>
          <span style="color:${labelColor};font-size:11px;">Packing Score: <b style="color:#00A7B5;font-family:var(--font-mono),monospace;">${packing.toFixed(0)}/100</b></span>
          <span style="color:${labelColor};font-size:11px;">Timing Score: <b style="color:#00A7B5;font-family:var(--font-mono),monospace;">${timing.toFixed(0)}/100</b></span>
          <span style="color:${labelColor};font-size:11px;">Volume: <b style="font-family:var(--font-mono),monospace;color:${textColor};">${blobs.toLocaleString()} blobs</b></span>
          <span style="color:${labelColor};font-size:11px;">Composite: <b style="color:${effColor(params.data.eff)};font-family:var(--font-mono),monospace;">${params.data.eff.toFixed(0)}/100</b></span>
        </div>`;
      },
    },
    series: [
      {
        type: "scatter" as const,
        data: seriesData,
        markLine: {
          silent: true,
          symbol: "none",
          lineStyle: {
            color: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)",
            type: "dashed" as const,
            width: 1,
          },
          data: [
            {
              xAxis: 50,
              label: {
                formatter: "50% Packing",
                position: "end" as const,
                color: isDark ? "#8E8EA8" : "#58547A",
                fontSize: 8,
                fontFamily: "var(--font-mono), monospace",
              },
            },
            {
              yAxis: 50,
              label: {
                formatter: "50% Timing",
                position: "end" as const,
                color: isDark ? "#8E8EA8" : "#58547A",
                fontSize: 8,
                fontFamily: "var(--font-mono), monospace",
              },
            },
          ],
        },
      },
    ],
  };

  return (
    <div className="flex flex-col">
      <div className="w-full">
        <ReactECharts option={option} style={{ height: "400px", width: "100%" }} opts={{ renderer: "svg" }} />
      </div>
      {/* Legend */}
      <div className="flex items-center gap-6 mt-4 justify-center flex-wrap">
        {[
          { color: EFFICIENCY_COLORS.excellent, label: "≥ 70 Excellent" },
          { color: EFFICIENCY_COLORS.good, label: "40–70 Good" },
          { color: EFFICIENCY_COLORS.poor, label: "< 40 Needs Work" },
        ].map(({ color, label }) => (
          <span key={label} className="flex items-center gap-1.5 text-[10px] font-bold text-text-secondary font-mono">
            <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}

