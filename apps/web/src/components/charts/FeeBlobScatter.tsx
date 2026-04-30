"use client";

import { classifyRegime } from "@/lib/utils";
import type { MarketHour } from "@/types";
import ReactECharts from "echarts-for-react";

const REGIME_COLOR: Record<string, string> = {
  undersaturated: "#3D3D4E",
  healthy: "#1A8C6A",
  congested: "#C4822A",
  spike: "#C0394A",
};

interface Props {
  data: MarketHour[];
}

export function FeeBlobScatter({ data }: Props) {
  if (!data.length)
    return <p className="py-8 text-center text-[0.6875rem] text-[#5C5575]">No data</p>;

  const seriesData = data.map((d) => {
    const regime = classifyRegime(d.max_blobs_in_block);
    return {
      value: [Number(d.blob_count), Number(d.avg_fee) / 1e9],
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
      nameTextStyle: { color: "#5C5575", fontSize: 11 },
      axisLabel: { color: "#5C5575", fontSize: 11, fontFamily: "var(--font-geist-sans)" },
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: { lineStyle: { color: "rgba(255,255,255,0.04)" } },
    },
    yAxis: {
      type: "value" as const,
      name: "Avg fee (gwei)",
      nameTextStyle: { color: "#5C5575", fontSize: 11 },
      axisLabel: { color: "#5C5575", fontSize: 11, fontFamily: "var(--font-geist-sans)" },
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: { lineStyle: { color: "rgba(255,255,255,0.04)" } },
    },
    tooltip: {
      trigger: "item" as const,
      backgroundColor: "#141414",
      borderColor: "#242424",
      borderWidth: 1,
      textStyle: { color: "#F0EEF6", fontSize: 12 },
      formatter: (params: { data: { value: [number, number]; ts: string; regime: string } }) => {
        const [blobs, fee] = params.data.value;
        return `<span style="color:#5C5575;font-size:11px">${new Date(params.data.ts).toLocaleString()}</span><br/>Blobs: <b>${blobs}</b><br/>Fee: <b>${fee.toFixed(4)} gwei</b><br/>Regime: <b>${params.data.regime}</b>`;
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

  return <ReactECharts option={option} style={{ height: "280px", width: "100%" }} />;
}
