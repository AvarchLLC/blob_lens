"use client";

import React, { useMemo } from "react";
import { useTheme } from "next-themes";
import { EChartWrapper } from "./echart-wrapper";
import type { EChartsOption } from "echarts";
import { type DateRangeState } from "@/components/shared/time-range-picker";

import { getTimeRangeBounds, formatTimestampLabel } from "@/lib/telemetry-data";

export interface HourlyBlobVolume {
  timestamp: string;
  blobCount: number;
  maxBlobsInBlock: number;
}

type RegimeType = "undersaturated" | "healthy" | "congested" | "spike";

function classifyRegime(maxBlobs: number): RegimeType {
  if (maxBlobs <= 2) return "undersaturated";
  if (maxBlobs === 3) return "healthy";
  if (maxBlobs <= 5) return "congested";
  return "spike";
}

// Deterministic volume generator based on selected time range
function generateDeterministicVolumes(timeRange?: DateRangeState): HourlyBlobVolume[] {
  const bounds = getTimeRangeBounds(timeRange);
  const points: HourlyBlobVolume[] = [];

  let volBase = 140;
  if (bounds.preset === "7d") volBase = 620;
  if (bounds.preset === "30d") volBase = 2400;
  if (bounds.preset === "90d") volBase = 2300;
  if (bounds.preset === "custom") volBase = 1800;

  for (let i = bounds.count; i >= 0; i--) {
    const timeMs = bounds.endMs - i * bounds.stepMs;
    const label = formatTimestampLabel(timeMs, bounds.formatType);

    const blobCount = Math.floor(
      volBase + Math.sin(i / 2) * (volBase * 0.4) + Math.cos(i / 3.5) * (volBase * 0.2)
    );
    const maxBlobs = Math.floor(1 + Math.abs(Math.sin(i / 2.8) * 6));

    points.push({
      timestamp: label,
      blobCount: Math.max(40, blobCount),
      maxBlobsInBlock: Math.min(6, Math.max(1, maxBlobs)),
    });
  }

  return points;
}

interface BlobsPerBlockChartProps {
  data?: HourlyBlobVolume[];
  timeRange?: DateRangeState;
}

export function BlobsPerBlockChart({ data, timeRange }: BlobsPerBlockChartProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  const chartData = useMemo(
    () => data || generateDeterministicVolumes(timeRange),
    [data, timeRange]
  );

  const option = useMemo<EChartsOption>(() => {
    const regimeColors: Record<RegimeType, string> = isDark
      ? {
          undersaturated: "#64748B",
          healthy: "#10B981",
          congested: "#F59E0B",
          spike: "#EF4444",
        }
      : {
          undersaturated: "#475569",
          healthy: "#059669",
          congested: "#D97706",
          spike: "#DC2626",
        };

    const borderColor = isDark ? "#22222E" : "#E5E5E7";
    const gridColor = isDark ? "#1A1A24" : "#F1F1F4";
    const axisColor = isDark ? "#A0A0B2" : "#71718A";
    const mutedColor = isDark ? "#68687D" : "#9C9CAE";
    const tooltipBg = isDark ? "#121217" : "#FFFFFF";
    const tooltipText = isDark ? "#F4F4F8" : "#1A1A24";

    const xLabels = chartData.map((d) => d.timestamp);
    const barData = chartData.map((d) => {
      const regime = classifyRegime(d.maxBlobsInBlock);
      return {
        value: d.blobCount,
        maxBlobs: d.maxBlobsInBlock,
        regime,
        itemStyle: {
          color: regimeColors[regime],
          borderRadius: [3, 3, 0, 0],
        },
      };
    });

    return {
      backgroundColor: "transparent",
      tooltip: {
        trigger: "axis",
        backgroundColor: tooltipBg,
        borderColor: borderColor,
        borderWidth: 1,
        shadowBlur: 8,
        shadowColor: isDark ? "rgba(0, 0, 0, 0.5)" : "rgba(0, 0, 0, 0.08)",
        textStyle: {
          color: tooltipText,
          fontFamily: "Geist Mono, monospace",
          fontSize: 12,
        },
        formatter: (params: any) => {
          const point = params[0];
          const raw = point.data;
          return `
            <div style="font-family: Geist Mono, monospace; padding: 4px;">
              <div style="color: ${mutedColor}; font-size: 10px; text-transform: uppercase;">${point.name}</div>
              <div style="color: ${tooltipText}; font-weight: bold; font-size: 14px; margin-top: 2px;">
                ${point.value} Blobs Posted
              </div>
              <div style="color: ${point.color}; font-size: 11px; text-transform: uppercase; font-weight: 600; margin-top: 4px;">
                REGIME: ${raw.regime} (Peak ${raw.maxBlobs} blobs/block)
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
            color: isDark ? "#8B7BFF" : "#5B4BE0",
          },
          textStyle: {
            color: mutedColor,
            fontSize: 9,
          },
        },
      ],
      xAxis: {
        type: "category",
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
        },
      },
      series: [
        {
          name: "Hourly Blob Volume",
          type: "bar",
          data: barData,
          barWidth: "60%",
        },
      ],
    };
  }, [chartData, isDark]);

  return <EChartWrapper option={option} style={{ height: "270px", width: "100%" }} />;
}
