"use client";

import type { HistoricalDailyStat } from "@/lib/queries";
import ReactECharts from "echarts-for-react";
import { getChartTheme, animationConfig } from "@/lib/chartTheme";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

const EPOCHS = [
  { name: "Dencun",  start: "2024-03-13", end: "2025-05-06", color: "rgba(59,130,246,0.05)",  labelColor: "rgba(96,165,250,0.4)" },
  { name: "Pectra",  start: "2025-05-07", end: "2026-04-07", color: "rgba(20,184,166,0.05)",  labelColor: "rgba(45,212,191,0.4)" },
  { name: "Fusaka",  start: "2026-04-08", end: "2099-01-01", color: "rgba(139,92,246,0.05)",  labelColor: "rgba(167,139,250,0.4)" },
];

function fmtDay(ts: number) {
  const d = new Date(ts);
  return d.toLocaleDateString("en", { year: "2-digit", month: "short", day: "numeric" });
}

function fmtK(v: number) {
  if (v >= 1_000_000) return (v / 1_000_000).toFixed(1) + "M";
  if (v >= 1_000)     return (v / 1_000).toFixed(0) + "K";
  return String(v);
}

interface Props { data: HistoricalDailyStat[] }

export function HistoricalBlobVolumeChart({ data }: Props) {
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) return <div className="h-[380px] w-full animate-pulse bg-surface-elevated rounded-lg" />;
  if (!data.length) return <p className="py-8 text-center text-xs text-text-secondary/40 italic">No historical data</p>;

  const isDark = theme !== "light";
  const t = getChartTheme(isDark);

  const barColor = isDark ? "rgba(0,167,181,0.55)" : "rgba(0,138,150,0.5)";
  const barColorHover = isDark ? "rgba(0,167,181,0.85)" : "rgba(0,138,150,0.8)";

  const points = data.map((d) => [new Date(d.day).getTime(), Number(d.total_blobs)]);

  const markAreaData = EPOCHS.map((e) => [
    {
      name: e.name,
      xAxis: new Date(e.start).getTime(),
      itemStyle: { color: e.color },
      label: {
        position: "insideTopLeft" as const,
        offset: [4, 6],
        fontSize: 9,
        fontWeight: "bold",
        color: e.labelColor,
        formatter: e.name,
      },
    },
    { xAxis: new Date(e.end).getTime() },
  ]);

  const option = {
    ...animationConfig,
    backgroundColor: t.backgroundColor,
    graphic: t.graphic,
    grid: { ...t.gridDefaults, top: 32, bottom: 60, right: 20 },
    xAxis: {
      type: "time" as const,
      ...t.axis,
      axisLabel: {
        ...t.axis.axisLabel,
        formatter: (val: number) => {
          const d = new Date(val);
          return `${d.toLocaleString("en", { month: "short" })} '${String(d.getFullYear()).slice(2)}`;
        },
      },
    },
    yAxis: {
      type: "value" as const,
      ...t.axis,
      min: 0,
      axisLabel: {
        ...t.axis.axisLabel,
        formatter: (v: number) => fmtK(v),
      },
    },
    tooltip: {
      trigger: "axis" as const,
      ...t.tooltip,
      formatter: (params: Array<{ value: [number, number] }>) => {
        const [ts, val] = params[0].value;
        return `<div style="display:flex;flex-direction:column;gap:4px;">
          <span style="color:#8FA1A8;font-size:10px;font-weight:bold;">${fmtDay(ts)}</span>
          <span style="font-family:'JetBrains Mono',monospace;color:#00A7B5;font-weight:700;font-size:12px;">${val.toLocaleString()} blobs</span>
          <span style="color:#8FA1A8;font-size:9px;">daily total</span>
        </div>`;
      },
    },
    dataZoom: [
      { type: "inside", start: 0, end: 100, zoomOnMouseWheel: "alt" },
      {
        type: "slider",
        show: true,
        start: 0,
        end: 100,
        height: 20,
        bottom: 5,
        borderColor: "transparent",
        fillerColor: isDark ? "rgba(0,167,181,0.07)" : "rgba(0,138,150,0.07)",
        handleStyle: { color: isDark ? "rgba(0,167,181,0.3)" : "rgba(0,138,150,0.3)" },
        textStyle: { color: isDark ? "#7E9098" : "#5C7077", fontSize: 9 },
      },
    ],
    series: [
      {
        name: "Daily Blobs",
        type: "bar" as const,
        data: points,
        barMaxWidth: 6,
        itemStyle: {
          color: barColor,
          borderRadius: [2, 2, 0, 0],
        },
        emphasis: {
          itemStyle: { color: barColorHover },
        },
        markArea: {
          silent: true,
          data: markAreaData,
        },
      },
    ],
  };

  return <ReactECharts option={option} style={{ height: "380px", width: "100%" }} opts={{ renderer: "svg" }} />;
}
