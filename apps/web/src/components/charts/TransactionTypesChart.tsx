"use client";

import { getChartTheme, animationConfig } from "@/lib/chartTheme";
import { formatNumber } from "@/lib/utils";
import type { TransactionTypeStat } from "@/lib/queries";
import ReactECharts from "echarts-for-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Info } from "lucide-react";

interface Props {
  data: TransactionTypeStat[];
}

const TYPE_NAMES: Record<number, string> = {
  0: "Legacy (Type 0)",
  1: "Access List (Type 1)",
  2: "Dynamic Fee (Type 2)",
  3: "Blob (Type 3)",
  4: "Experimental (Type 4)",
};

const TYPE_COLORS: Record<number, string> = {
  0: "#F59E0B", // Amber
  1: "#06B6D4", // Cyan
  2: "#10B981", // Emerald
  3: "#3B82F6", // Blue
  4: "#8B5CF6", // Purple
};

const TYPE_DESCRIPTIONS: Record<number, string> = {
  0: "Old-style legacy Ethereum transactions prior to EIP-1559.",
  1: "EIP-2930 transactions specifying pre-declared addresses/keys to save gas.",
  2: "Modern dynamic flexible-fee transactions (EIP-1559) — the standard type.",
  3: "EIP-4844 blob-carrying transactions for Layer-2 Data Availability.",
  4: "Newer EIP-7702 delegation or newer experimental transaction types.",
};

export function TransactionTypesChart({ data }: Props) {
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [isPercentage, setIsPercentage] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) return <div className="h-[380px] w-full animate-pulse bg-surface-elevated rounded-none border border-dashed border-border" />;

  if (!data.length)
    return <p className="py-8 text-center text-xs text-text-secondary opacity-50 italic font-mono">No transaction type data found</p>;

  const isDark = theme !== "light";
  const t = getChartTheme(isDark);

  // Theme-aware tooltip colors
  const ttText = isDark ? "#F0F4F5" : "#0D1618";
  const ttMuted = isDark ? "#7E9098" : "#5C7077";
  const ttDivider = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.08)";

  // Parse distinct days and types
  const dayKeys = [...new Set(data.map((d) => d.date))].sort(
    (a, b) => new Date(a).getTime() - new Date(b).getTime()
  );
  
  const distinctTypes = [0, 1, 2, 3, 4];

  // Organize by day and calculate totals for percentage conversion
  const dailyData = new Map<string, Map<number, number>>();
  const dailyTotals = new Map<string, number>();

  for (const row of data) {
    const day = row.date;
    const type = Number(row.tx_type);
    const count = Number(row.tx_count);

    if (!dailyData.has(day)) dailyData.set(day, new Map<number, number>());
    dailyData.get(day)!.set(type, count);

    dailyTotals.set(day, (dailyTotals.get(day) ?? 0) + count);
  }

  const xLabels = dayKeys.map((day) =>
    new Date(day).toLocaleDateString("en-US", { month: "short", day: "2-digit" })
  );

  const series = distinctTypes.map((type) => {
    const seriesData = dayKeys.map((day) => {
      const count = dailyData.get(day)?.get(type) ?? 0;
      if (isPercentage) {
        const total = dailyTotals.get(day) ?? 1;
        return parseFloat(((count / total) * 100).toFixed(2));
      }
      return count;
    });

    return {
      name: TYPE_NAMES[type] ?? `Type ${type}`,
      type: "bar" as const,
      stack: "txs",
      barMaxWidth: 32,
      itemStyle: { color: TYPE_COLORS[type] },
      emphasis: { focus: "series" as const },
      data: seriesData,
    };
  });

  const option = {
    ...animationConfig,
    backgroundColor: t.backgroundColor,
    graphic: t.graphic,
    grid: {
      ...t.gridDefaults,
      top: 50,
      bottom: 24,
    },
    xAxis: {
      type: "category" as const,
      data: xLabels,
      ...t.axis,
      axisLabel: {
        ...t.axis.axisLabel,
        interval: Math.floor(dayKeys.length / 8),
      },
    },
    yAxis: {
      type: "value" as const,
      ...t.axis,
      name: isPercentage ? "SHARE" : "TRANSACTIONS",
      nameTextStyle: { ...t.axis.axisLabel, padding: [0, 0, 0, 30] },
      axisLabel: {
        ...t.axis.axisLabel,
        formatter: (v: number) => {
          if (isPercentage) return `${v}%`;
          return v >= 1000000 ? `${(v / 1000000).toFixed(1)}M` : v >= 1000 ? `${Math.round(v / 1000)}K` : String(v);
        },
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

        const total = dailyTotals.get(dayKey) ?? 0;
        const sortedParams = [...params].sort((a, b) => (b.value || 0) - (a.value || 0));

        return `
          <div style="min-width:280px;display:flex;flex-direction:column;gap:8px;">
            <div style="border-bottom:1px solid ${ttDivider};padding-bottom:4px;margin-bottom:4px;">
              <span style="font-size:10px;font-weight:bold;color:${ttMuted};text-transform:uppercase;">${fullDate}</span>
            </div>
            ${sortedParams.map(p => {
              const val = Number(p.value || 0);
              const count = isPercentage ? (dailyData.get(dayKey)?.get(distinctTypes[p.seriesIndex]) ?? 0) : val;
              const pct = isPercentage ? val.toFixed(2) : (total > 0 ? ((val / total) * 100).toFixed(2) : "0");
              const typeNum = distinctTypes[p.seriesIndex];
              return `
                <div style="display:flex;justify-content:space-between;align-items:center;">
                  <div style="display:flex;align-items:center;gap:6px;max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">
                    <div style="width:6px;height:6px;border-radius:50%;background-color:${TYPE_COLORS[typeNum]};flex-shrink:0;"></div>
                    <span style="font-size:11px;color:${ttText};">${p.seriesName}</span>
                  </div>
                  <div style="display:flex;gap:8px;align-items:baseline;flex-shrink:0;">
                    <span style="font-family:monospace;font-size:11px;font-weight:bold;color:${ttText};">${formatNumber(count)}</span>
                    <span style="font-size:9px;color:${ttMuted};width:42px;text-align:right;">${pct}%</span>
                  </div>
                </div>
              `;
            }).join('')}
            <div style="border-top:1px solid ${ttDivider};margin-top:4px;padding-top:8px;display:flex;justify-content:space-between;align-items:center;">
              <span style="font-size:11px;font-weight:bold;color:${ttText};text-transform:uppercase;letter-spacing:0.05em;">Total Transactions</span>
              <span style="font-family:monospace;font-size:12px;font-weight:bold;color:#00df81;">${formatNumber(total)}</span>
            </div>
          </div>
        `;
      },
    },
    legend: {
      ...t.legend,
      top: 0,
      icon: "circle",
    },
    dataZoom: t.dataZoom,
    series: series,
  };

  return (
    <div className="space-y-4">
      {/* Toggles */}
      <div className="flex items-center justify-between border-b border-border/20 pb-3">
        <div className="flex items-center gap-2">
          <Info className="h-4 w-4 text-text-secondary opacity-60" />
          <span className="text-[10px] font-bold text-text-secondary uppercase tracking-wider font-mono">
            Metric Mode
          </span>
        </div>
        <div className="flex items-center border border-border bg-surface p-0.5 rounded-sm shadow-sm">
          <button
            onClick={() => setIsPercentage(false)}
            className={`px-3 py-1 text-[9px] font-bold uppercase tracking-wider transition-all rounded-sm ${
              !isPercentage
                ? "bg-primary text-white shadow-sm"
                : "text-text-secondary hover:text-text-primary"
            }`}
          >
            Absolute Txs
          </button>
          <button
            onClick={() => setIsPercentage(true)}
            className={`px-3 py-1 text-[9px] font-bold uppercase tracking-wider transition-all rounded-sm ${
              isPercentage
                ? "bg-primary text-white shadow-sm"
                : "text-text-secondary hover:text-text-primary"
            }`}
          >
            Percentage Share
          </button>
        </div>
      </div>

      {/* Chart */}
      <ReactECharts option={option} style={{ height: "350px", width: "100%" }} opts={{ renderer: "svg" }} />

      {/* Legend details card */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-3 mt-4">
        {distinctTypes.map((type) => (
          <div
            key={type}
            className="p-3 border border-border/20 bg-surface-elevated/20 rounded-sm hover:bg-surface-elevated/40 transition-colors"
          >
            <div className="flex items-center gap-2 mb-1.5">
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: TYPE_COLORS[type] }}
              />
              <span className="text-[10px] font-bold text-text-primary font-mono">
                {TYPE_NAMES[type]}
              </span>
            </div>
            <p className="text-[10px] text-text-secondary leading-relaxed opacity-80">
              {TYPE_DESCRIPTIONS[type]}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
