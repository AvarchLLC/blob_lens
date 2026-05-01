"use client";

import { formatNumber, rollupColor } from "@/lib/utils";
import type { DailyRollupBlob } from "@/types";
import ReactECharts from "echarts-for-react";

interface Props {
  data: DailyRollupBlob[];
}

export function RollupVolumeAreaChart({ data }: Props) {
  if (!data.length)
    return <p className="py-8 text-center text-[0.6875rem] text-[#5C5575]">No data</p>;

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
    animation: true,
    animationEasing: "cubicOut" as const,
    animationDuration: 700,
    grid: { top: 8, right: 16, bottom: 8, left: 0, containLabel: true },
    xAxis: {
      type: "category" as const,
      data: xLabels,
      axisLabel: {
        color: "#5C5575",
        fontSize: 11,
        fontFamily: "var(--font-geist-sans)",
      },
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: { show: false },
    },
    yAxis: {
      type: "value" as const,
      axisLabel: {
        color: "#9D93B8",
        fontSize: 11,
        fontFamily: "var(--font-geist-sans)",
        formatter: (v: number) => (v >= 1000 ? `${Math.round(v / 1000)}K` : String(v)),
      },
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: { lineStyle: { color: "rgba(255,255,255,0.05)" } },
    },
    tooltip: {
      trigger: "axis" as const,
      backgroundColor: "#EDEAF5",
      borderColor: "#7C3AED",
      borderWidth: 1,
      textStyle: { color: "#1A1428", fontSize: 12, fontFamily: "var(--font-geist-sans)" },
      axisPointer: { type: "shadow" as const, shadowStyle: { color: "rgba(124,58,237,0.10)" } },
      formatter: (
        params: { axisValue: string; seriesName: string; value: number; marker: string }[]
      ) => {
        if (!params.length) return "";

        const dayIdx = xLabels.findIndex((l) => l === params[0].axisValue);
        const dayKey = dayKeys[Math.max(0, dayIdx)];
        const dayDate = new Date(dayKey);
        const weekday = dayDate.toLocaleDateString("en-US", { weekday: "long" });
        const month = dayDate.toLocaleDateString("en-US", { month: "long" });
        const day = dayDate.toLocaleDateString("en-US", { day: "2-digit" });
        const year = dayDate.toLocaleDateString("en-US", { year: "numeric" });
        const total = params.reduce((sum, p) => sum + Number(p.value || 0), 0);

        const values = new Map<string, number>();
        for (const p of params) values.set(p.seriesName, Number(p.value || 0));

        const rows = rollups
          .map((rollup) => {
            const v = values.get(rollup) ?? 0;
            const pct = total > 0 ? ` (${((v / total) * 100).toFixed(2)}%)` : "";
            const valueLabel = v > 0 ? formatNumber(v) : "-";
            return `<div style="display:flex;justify-content:space-between;gap:18px;margin:3px 0;">
                <span style="display:flex;align-items:center;gap:7px;color:#1A1428;">
                  <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${rollupColor(rollup)}"></span>
                  ${rollup}
                </span>
                <span style="color:#1A1428;font-weight:600;">${valueLabel}<span style="color:#6E6782;font-weight:500;">${v > 0 ? pct : ""}</span></span>
              </div>`;
          })
          .join("");

        return `<div style="min-width:280px;">
          <div style="font-weight:700;margin-bottom:8px;">${weekday}, ${month}, ${day} ${year}</div>
          ${rows}
          <div style="border-top:1px solid rgba(26,20,40,0.2);margin-top:8px;padding-top:8px;display:flex;justify-content:space-between;">
            <span style="font-weight:700;">Total</span>
            <span style="font-weight:700;">${formatNumber(total)}</span>
          </div>
        </div>`;
      },
    },
    legend: { show: false },
    series: rollups.map((rollup) => ({
      name: rollup,
      type: "bar" as const,
      stack: "blobs",
      barMaxWidth: 28,
      itemStyle: { color: rollupColor(rollup) },
      emphasis: { focus: "series" as const },
      data: dayKeys.map((day) => byDay.get(day)?.get(rollup) ?? 0),
    })),
  };

  return <ReactECharts option={option} style={{ height: "340px", width: "100%" }} />;
}
