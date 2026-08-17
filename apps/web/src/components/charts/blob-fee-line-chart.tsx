"use client";

import React, { useMemo } from "react";
import { useTheme } from "next-themes";
import { EChartWrapper } from "./echart-wrapper";
import type { EChartsOption } from "echarts";
import { type DateRangeState } from "@/components/shared/time-range-picker";

import { getTimeRangeBounds, formatTimestampLabel } from "@/lib/telemetry-data";

export interface HourlyFeePoint {
  timestamp: string;
  feeWei: number;
}

interface BlobFeeLineChartProps {
  data?: HourlyFeePoint[];
  ethUsd?: number;
  timeRange?: DateRangeState;
}

// Deterministic telemetry generator based on selected time range
function generateDeterministicPoints(timeRange?: DateRangeState): HourlyFeePoint[] {
  const bounds = getTimeRangeBounds(timeRange);
  const points: HourlyFeePoint[] = [];

  let waveMult = 1.0;
  if (bounds.preset === "7d") waveMult = 1.6;
  if (bounds.preset === "30d") waveMult = 2.4;
  if (bounds.preset === "90d") waveMult = 3.8;
  if (bounds.preset === "custom") waveMult = 1.9;

  for (let i = bounds.count; i >= 0; i--) {
    const timeMs = bounds.endMs - i * bounds.stepMs;
    const label = formatTimestampLabel(timeMs, bounds.formatType);

    const baseWei = (1.2 + Math.sin(i / 2.2) * 0.7 + Math.cos(i / 3.8) * 0.4) * waveMult;
    points.push({
      timestamp: label,
      feeWei: Math.round(Math.max(0.08, baseWei) * 1e8),
    });
  }

  return points;
}

export function BlobFeeLineChart({
  data,
  ethUsd = 2850,
  timeRange,
}: BlobFeeLineChartProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  const chartData = useMemo(
    () => data || generateDeterministicPoints(timeRange),
    [data, timeRange]
  );

  const option = useMemo<EChartsOption>(() => {
    const xLabels = chartData.map((d) => d.timestamp);
    const gweiValues = chartData.map((d) => Number((d.feeWei / 1e9).toFixed(5)));

    const avgGwei =
      gweiValues.reduce((acc, v) => acc + v, 0) / (gweiValues.length || 1);

    const lineColor = isDark ? "#8B7BFF" : "#5B4BE0";
    const areaColorStart = isDark ? "rgba(139, 123, 255, 0.25)" : "rgba(91, 75, 224, 0.14)";
    const areaColorEnd = isDark ? "rgba(139, 123, 255, 0.0)" : "rgba(91, 75, 224, 0.0)";
    const borderColor = isDark ? "#22222E" : "#E5E5E7";
    const gridColor = isDark ? "#1A1A24" : "#F1F1F4";
    const axisColor = isDark ? "#A0A0B2" : "#71718A";
    const mutedColor = isDark ? "#68687D" : "#9C9CAE";
    const tooltipBg = isDark ? "#121217" : "#FFFFFF";
    const tooltipText = isDark ? "#F4F4F8" : "#1A1A24";
    const tooltipSec = isDark ? "#A0A0B2" : "#55556B";

    return {
      backgroundColor: "transparent",
      tooltip: {
        trigger: "axis",
        backgroundColor: tooltipBg,
        borderColor: borderColor,
        borderWidth: 1,
        shadowBlur: 10,
        shadowColor: isDark ? "rgba(0, 0, 0, 0.5)" : "rgba(0, 0, 0, 0.08)",
        textStyle: {
          color: tooltipText,
          fontFamily: "Geist Mono, monospace",
          fontSize: 12,
        },
        formatter: (params: any) => {
          const point = params[0];
          const gwei = point.value;
          const wei = gwei * 1e9;
          const usd = ((wei * 131072) / 1e18) * ethUsd;
          return `
            <div style="font-family: Geist Mono, monospace; padding: 4px;">
              <div style="color: ${mutedColor}; font-size: 10px; text-transform: uppercase;">${point.name}</div>
              <div style="color: ${tooltipText}; font-weight: bold; font-size: 14px; margin-top: 2px;">
                ${gwei} gwei
              </div>
              <div style="color: ${tooltipSec}; font-size: 11px;">
                ~$${usd < 0.01 ? usd.toFixed(6) : usd.toFixed(2)} / blob
              </div>
            </div>
          `;
        },
      },
      grid: {
        left: "3%",
        right: "3%",
        bottom: "16%",
        top: "10%",
        containLabel: true,
      },
      dataZoom: [
        {
          type: "inside",
          start: 0,
          end: 100,
        },
        {
          type: "slider",
          show: true,
          height: 14,
          bottom: 2,
          borderColor: borderColor,
          fillerColor: isDark ? "rgba(139, 123, 255, 0.16)" : "rgba(91, 75, 224, 0.12)",
          handleStyle: {
            color: lineColor,
          },
          textStyle: {
            color: mutedColor,
            fontSize: 9,
          },
        },
      ],
      xAxis: {
        type: "category",
        boundaryGap: false,
        data: xLabels,
        axisLine: { lineStyle: { color: borderColor } },
        axisLabel: {
          color: axisColor,
          fontFamily: "Geist Mono, monospace",
          fontSize: 10,
        },
      },
      yAxis: {
        type: "value",
        axisLine: { show: false },
        splitLine: { lineStyle: { color: gridColor, type: "dashed" } },
        axisLabel: {
          color: axisColor,
          fontFamily: "Geist Mono, monospace",
          fontSize: 10,
          formatter: "{value} gwei",
        },
      },
      series: [
        {
          name: "Blob Base Fee",
          type: "line",
          smooth: true,
          showSymbol: false,
          data: gweiValues,
          lineStyle: {
            color: lineColor,
            width: 2,
          },
          areaStyle: {
            color: {
              type: "linear",
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: areaColorStart },
                { offset: 1, color: areaColorEnd },
              ],
            },
          },
          markLine: {
            silent: true,
            symbol: "none",
            data: [
              {
                yAxis: Number(avgGwei.toFixed(5)),
                lineStyle: { color: mutedColor, type: "dashed", width: 1 },
                label: {
                  formatter: `AVG: ${avgGwei.toFixed(4)} gwei`,
                  position: "insideEndTop",
                  color: mutedColor,
                  fontFamily: "Geist Mono, monospace",
                  fontSize: 10,
                },
              },
            ],
          },
        },
      ],
    };
  }, [chartData, ethUsd, isDark]);

  return <EChartWrapper option={option} style={{ height: "270px", width: "100%" }} />;
}
