"use client";

import ReactECharts from "echarts-for-react";
import { getChartTheme, animationConfig } from "@/lib/chartTheme";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import type { LeaderboardRow } from "@/types";

const EFFICIENCY_COLORS = {
  excellent: "#00A86B",
  good: "#F5A524",
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

  if (!mounted) return <div className="h-[350px] w-full animate-pulse bg-surface-elevated rounded-md" />;

  const filtered = data.filter(
    (r) => r.rollup !== "UNKNOWN" && Number(r.total_blobs) > 10
  );

  if (!filtered.length) {
    return <p className="py-8 text-center text-xs text-text-secondary italic opacity-50">Insufficient data for scatter analysis.</p>;
  }

  const isDark = theme !== "light";
  const t = getChartTheme(isDark);

  const maxBlobs = Math.max(...filtered.map((r) => Number(r.total_blobs)));

  // Auto-zoom: calculate axis bounds from data with padding
  const costs = filtered.map(r => Number(r.cost_per_blob_gwei));
  const utils = filtered.map(r => Number(r.avg_fullness_pct));
  const costMin = Math.min(...costs);
  const costMax = Math.max(...costs);
  const utilMin = Math.min(...utils);
  const utilMax = Math.max(...utils);
  const costPad = (costMax - costMin) * 0.15 || 0.001;
  const utilPad = (utilMax - utilMin) * 0.15 || 5;

  const seriesData = filtered.map((r) => {
    const costGwei = Number(r.cost_per_blob_gwei);
    const utilPct = Number(r.avg_fullness_pct);
    const blobs = Number(r.total_blobs);
    const eff = Number(r.efficiency_score);
    const size = 8 + (blobs / maxBlobs) * 30;

    return {
      value: [costGwei, utilPct, blobs],
      symbolSize: Math.max(8, size),
      itemStyle: {
        color: effColor(eff),
        opacity: 0.85,
        borderColor: isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.08)",
        borderWidth: 1,
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
      bottom: 40,
      right: 24,
    },
    xAxis: {
      type: "value" as const,
      name: "Cost / Blob (Gwei)",
      nameTextStyle: { color: isDark ? "#7E9098" : "#5C7077", fontSize: 10, fontWeight: "bold" as const },
      nameLocation: "center" as const,
      nameGap: 28,
      ...t.axis,
      min: Math.max(0, costMin - costPad),
      max: costMax + costPad,
      axisLabel: {
        ...t.axis.axisLabel,
        formatter: (v: number) => v < 0.001 ? v.toPrecision(2) : v.toFixed(3),
      },
    },
    yAxis: {
      type: "value" as const,
      name: "Avg Fullness (%)",
      nameTextStyle: { color: isDark ? "#7E9098" : "#5C7077", fontSize: 10, fontWeight: "bold" as const },
      nameLocation: "center" as const,
      nameGap: 40,
      ...t.axis,
      min: Math.max(0, utilMin - utilPad),
      max: Math.min(100, utilMax + utilPad),
    },
    tooltip: {
      trigger: "item" as const,
      ...t.tooltip,
      formatter: (params: { data: { value: number[]; name: string; eff: number } }) => {
        const [cost, util, blobs] = params.data.value;
        return `<div style="display:flex;flex-direction:column;gap:4px;">
          <span style="font-weight:700;font-size:13px;">${params.data.name}</span>
          <span style="color:${isDark ? '#7E9098' : '#5C7077'};font-size:10px;">Cost: <b style="color:#00A7B5;font-family:monospace;">${cost < 0.001 ? cost.toPrecision(2) : cost.toFixed(4)} Gwei</b></span>
          <span style="color:${isDark ? '#7E9098' : '#5C7077'};font-size:10px;">Fullness: <b style="font-family:monospace;">${util.toFixed(1)}%</b></span>
          <span style="color:${isDark ? '#7E9098' : '#5C7077'};font-size:10px;">Volume: <b style="font-family:monospace;">${blobs.toLocaleString()} blobs</b></span>
          <span style="color:${isDark ? '#7E9098' : '#5C7077'};font-size:10px;">Efficiency: <b style="color:${effColor(params.data.eff)};font-family:monospace;">${params.data.eff.toFixed(0)}</b></span>
        </div>`;
      },
    },
    series: [
      {
        type: "scatter" as const,
        data: seriesData,
      },
    ],
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 min-h-[350px]">
        <ReactECharts option={option} style={{ height: "100%", width: "100%" }} opts={{ renderer: "svg" }} />
      </div>
      {/* Legend */}
      <div className="flex items-center gap-4 mt-2 justify-center">
        {[
          { color: EFFICIENCY_COLORS.excellent, label: "≥ 70 Excellent" },
          { color: EFFICIENCY_COLORS.good, label: "40–70 Good" },
          { color: EFFICIENCY_COLORS.poor, label: "< 40 Needs Work" },
        ].map(({ color, label }) => (
          <span key={label} className="flex items-center gap-1.5 text-[10px] font-bold text-text-secondary opacity-60">
            <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}
