"use client";

import { blobCostUsd, formatUsd } from "@/lib/ethPrice";
import { classifyRegime } from "@/lib/utils";
import type { MarketHour } from "@/types";
import ReactECharts from "echarts-for-react";

const REGIME_COLOR: Record<string, string> = {
  undersaturated: "#3D4F6B",
  healthy:        "#10B981",
  congested:      "#F59E0B",
  spike:          "#EF4444",
};

interface Props {
  data: MarketHour[];
  ethUsd?: number | null;
}

export function FeeBlobScatter({ data, ethUsd }: Props) {
  if (!data.length)
    return <p className="py-8 text-center text-[0.6875rem] text-[#4B5563]">No data</p>;

  const isUsd = ethUsd != null;

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
    animation: true,
    animationEasing: "cubicOut" as const,
    animationDuration: 600,
    grid: { top: 16, right: 16, bottom: 24, left: 0, containLabel: true },
    xAxis: {
      type: "value" as const,
      name: "Blob count",
      nameTextStyle: { color: "#4B5563", fontSize: 11 },
      axisLabel: { color: "#4B5563", fontSize: 11, fontFamily: "Space Grotesk, system-ui" },
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: { lineStyle: { color: "rgba(255,255,255,0.04)" } },
    },
    yAxis: {
      type: "value" as const,
      name: isUsd ? "Cost / blob (USD)" : "Avg fee (gwei)",
      nameTextStyle: { color: "#4B5563", fontSize: 11 },
      axisLabel: {
        color: "#4B5563", fontSize: 11, fontFamily: "Space Grotesk, system-ui",
        formatter: isUsd
          ? (v: number) => v < 0.0001 ? "< $0.0001" : `$${v.toFixed(4)}`
          : (v: number) => v < 0.0001 ? "< 0.0001" : v.toFixed(4),
      },
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: { lineStyle: { color: "rgba(255,255,255,0.04)" } },
    },
    tooltip: {
      trigger: "item" as const,
      backgroundColor: "#1A2235",
      borderColor: "rgba(16,185,129,0.2)",
      borderWidth: 1,
      textStyle: { color: "#F9FAFB", fontSize: 12, fontFamily: "Space Grotesk, system-ui" },
      formatter: (params: { data: { value: [number, number]; ts: string; regime: string } }) => {
        const [blobs, fee] = params.data.value;
        const feeStr = isUsd
          ? formatUsd(fee)
          : (fee < 0.0001 ? "< 0.0001 gwei" : `${fee.toFixed(4)} gwei`);
        return `<span style="color:#4B5563;font-size:11px">${new Date(params.data.ts).toLocaleString()}</span><br/>Blobs: <b>${blobs}</b><br/>Cost: <b style="font-family:monospace;color:#6EE7B7">${feeStr}</b><br/>Regime: <b>${params.data.regime}</b>`;
      },
    },
    series: [
      {
        type: "scatter" as const,
        data: seriesData,
        symbolSize: 7,
      },
    ],
  };

  return <ReactECharts option={option} style={{ height: "280px", width: "100%" }} />;
}
