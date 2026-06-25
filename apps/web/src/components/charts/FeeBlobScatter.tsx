"use client";

import { blobCostUsd, formatUsd } from "@/lib/ethPrice";
import { classifyRegime } from "@/lib/utils";
import type { MarketHour } from "@/types";
import ReactECharts from "echarts-for-react";
import { getChartTheme, animationConfig } from "@/lib/chartTheme";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

const REGIME_COLOR: Record<string, string> = {
  undersaturated: "#52666E",
  healthy:        "#00A86B",
  congested:      "#E8A020",
  spike:          "#E5484D",
};

interface Props {
  data: MarketHour[];
  ethUsd?: number | null;
}

export function FeeBlobScatter({ data, ethUsd }: Props) {
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) return <div className="h-[350px] w-full animate-pulse bg-surface-elevated rounded-none border border-dashed border-border" />;

  if (!data.length)
    return <p className="py-8 text-center text-[0.6875rem] text-text-secondary opacity-50 italic">No historical scatter data</p>;

  const isUsd = ethUsd != null;
  const isDark = theme !== "light";
  const t = getChartTheme(isDark);

  const seriesData = data.map((d) => {
    const regime = classifyRegime(d.max_blobs_in_block);
    const yVal = isUsd
      ? blobCostUsd(d.avg_fee, ethUsd!)
      : Number(d.avg_fee) / 1e9;
    return {
      value: [Number(d.blob_count), yVal],
      itemStyle: { color: REGIME_COLOR[regime], opacity: 0.82 },
      ts: d.hour,
      regime,
    };
  });

  const option = {
    ...animationConfig,
    backgroundColor: t.backgroundColor,
    graphic: t.graphic,
    grid: t.gridDefaults,
    xAxis: {
      type: "value" as const,
      name: "Blob count",
      nameTextStyle: { color: t.axis.axisLabel.color, fontSize: 10, fontFamily: "var(--font-body), sans-serif" },
      axisLabel: t.axis.axisLabel,
      axisLine: t.axis.axisLine,
      axisTick: t.axis.axisTick,
      splitLine: t.axis.splitLine,
    },
    yAxis: {
      type: "value" as const,
      name: isUsd ? "Cost / blob (USD)" : "Avg fee (gwei)",
      nameTextStyle: { color: t.axis.axisLabel.color, fontSize: 10, fontFamily: "var(--font-body), sans-serif" },
      axisLabel: {
        ...t.axis.axisLabel,
        formatter: isUsd
          ? (v: number) => v < 0.0001 ? "< $0.0001" : `$${v.toFixed(4)}`
          : (v: number) => v < 0.0001 ? "< 0.0001" : v.toFixed(4),
      },
      axisLine: t.axis.axisLine,
      axisTick: t.axis.axisTick,
      splitLine: t.axis.splitLine,
    },
    tooltip: {
      trigger: "item" as const,
      ...t.tooltip,
      formatter: (params: { data: { value: [number, number]; ts: string; regime: string } }) => {
        const [blobs, fee] = params.data.value;
        const feeStr = isUsd
          ? formatUsd(fee)
          : (fee < 0.0001 ? "< 0.0001 gwei" : `${fee.toFixed(4)} gwei`);
        return `<div style="display:flex;flex-direction:column;gap:4px;">
          <span style="color:#8FA1A8;font-size:10px;font-weight:bold;text-transform:uppercase;">${new Date(params.data.ts).toLocaleString()}</span>
          <span style="font-size:12px;">Blobs: <b style="font-family:var(--font-mono);">${blobs}</b></span>
          <span style="font-size:12px;">Cost: <b style="font-family:var(--font-mono);color:#00A7B5;">${feeStr}</b></span>
          <span style="font-size:12px;">Regime: <b style="text-transform:capitalize;">${params.data.regime}</b></span>
        </div>`;
      },
    },
    series: [
      {
        type: "scatter" as const,
        data: seriesData,
        symbolSize: 8,
      },
    ],
  };

  return <ReactECharts option={option} style={{ height: "350px", width: "100%" }} />;
}
