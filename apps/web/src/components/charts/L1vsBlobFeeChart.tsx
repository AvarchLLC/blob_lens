"use client";

import { animationConfig, getChartTheme } from "@/lib/chartTheme";
import { formatUsd } from "@/lib/ethPrice";
import type { HourlyL1Fee } from "@/lib/l1Fee";
import type { MarketHour } from "@/types";
import ReactECharts from "echarts-for-react";
import { watermarkGraphic } from "@/lib/chartTheme";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

const GAS_PER_BLOB = 131_072;
const CALLDATA_GAS_PER_BYTE = 16;

function toHourKey(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}-${d.getHours()}`;
}

function shortHour(iso: string) {
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}h`;
}

interface Props {
  blobData: MarketHour[];
  l1Data: HourlyL1Fee[];
  ethUsd: number;
}

export function L1vsBlobFeeChart({ blobData, l1Data, ethUsd }: Props) {
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const isDark = theme !== "light";
  const chartTheme = getChartTheme(isDark);

  if (!mounted) return <div className="h-[300px]" />;

  // Build lookup: hour-key → l1 base fee gwei
  const l1Map = new Map<string, number>();
  for (const row of l1Data) {
    l1Map.set(toHourKey(row.hour), row.l1_base_fee_gwei);
  }

  const labels: string[] = [];
  const blobCosts: (number | null)[] = [];
  const l1Costs: (number | null)[] = [];

  for (const row of blobData) {
    labels.push(shortHour(row.hour));
    const blobFeeWei = Number(row.avg_fee);
    const blobCostUsd = blobFeeWei > 0
      ? (blobFeeWei * GAS_PER_BLOB) / 1e18 * ethUsd
      : null;

    const l1GweiVal = l1Map.get(toHourKey(row.hour));
    const l1CostUsd = l1GweiVal != null && l1GweiVal > 0
      ? (l1GweiVal * 1e9 * GAS_PER_BLOB * CALLDATA_GAS_PER_BYTE) / 1e18 * ethUsd
      : null;

    blobCosts.push(blobCostUsd);
    l1Costs.push(l1CostUsd);
  }

  const hasData = blobCosts.some((v) => v !== null) || l1Costs.some((v) => v !== null);
  if (!hasData) {
    return (
      <p className="py-8 text-center text-[0.6875rem] text-muted-foreground">
        Fee data unavailable
      </p>
    );
  }

  const green = isDark ? "#00df81" : "#059669";
  const amber = isDark ? "#fcbb00" : "#d97706";

  const option = {
    ...animationConfig,
    ...chartTheme,
    grid: {
      ...chartTheme.gridDefaults,
      bottom: 60,
    },
    legend: {
      top: 0,
      right: 0,
      itemGap: 16,
      textStyle: { color: isDark ? "#71717a" : "#64748b", fontSize: 11 },
    },
    xAxis: {
      type: "category" as const,
      data: labels,
      ...chartTheme.axis,
      boundaryGap: false,
      axisLabel: {
        ...chartTheme.axis.axisLabel,
        interval: Math.max(0, Math.floor(labels.length / 8)),
      }
    },
    yAxis: {
      type: "value" as const,
      min: 0,
      ...chartTheme.axis,
      axisLabel: {
        ...chartTheme.axis.axisLabel,
        formatter: (v: number) => formatUsd(v),
      },
    },
    tooltip: {
      trigger: "axis" as const,
      ...chartTheme.tooltip,
      formatter: (params: { seriesName: string; axisValue: string; value: number | null }[]) => {
        const rows = params
          .filter((p) => p.value != null)
          .map(
            (p) =>
              `<div style="display:flex;justify-content:space-between;align-items:center;gap:12px;">
                <div style="display:flex;align-items:center;gap:6px;">
                  <span style="color:${p.seriesName === "Blob DA" ? green : amber};font-size:11px">●</span>
                  <span style="color:${isDark ? "#a1a1aa" : "#64748b"};font-size:11px;font-family:var(--font-mono),monospace;">${p.seriesName}</span>
                </div>
                <span style="font-family:var(--font-mono),monospace;font-weight:600;color:${isDark ? "#fafafa" : "#0F172A"}">
                  ${formatUsd(p.value!)}
                </span>
              </div>`
          )
          .join("");
        return `<div style="min-width:220px;display:flex;flex-direction:column;gap:6px;padding:4px;">
          <div style="border-bottom:1px solid ${isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.08)"};padding-bottom:4px;margin-bottom:4px;">
            <span style="color:${isDark ? "#71717a" : "#94A3B8"};font-size:10px;font-weight:bold;text-transform:uppercase;font-family:var(--font-mono),monospace;">${params[0].axisValue}</span>
          </div>
          ${rows}
        </div>`;
      },
    },
    dataZoom: chartTheme.dataZoom,
    series: [
      {
        name: "L1 Calldata",
        type: "line" as const,
        data: l1Costs,
        connectNulls: false,
        smooth: 0.4,
        symbol: "none",
        lineStyle: { color: amber, width: 2 },
        itemStyle: { color: amber },
        areaStyle: {
          color: {
            type: "linear" as const,
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: isDark ? "rgba(252,187,0,0.15)" : "rgba(217,119,6,0.15)" },
              { offset: 1, color: "rgba(0,0,0,0)" },
            ],
          },
        },
      },
      {
        name: "Blob DA",
        type: "line" as const,
        data: blobCosts,
        connectNulls: false,
        smooth: 0.4,
        symbol: "none",
        lineStyle: { color: green, width: 2.5 },
        itemStyle: { color: green },
        areaStyle: {
          color: chartTheme.areaGradient,
        },
      },
    ],
  };

  return <ReactECharts option={option} style={{ height: "350px", width: "100%" }} opts={{ renderer: "svg" }} />;
}
