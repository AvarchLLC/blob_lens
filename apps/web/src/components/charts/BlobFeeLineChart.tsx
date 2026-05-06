"use client";

import type { MarketHour } from "@/types";
import ReactECharts from "echarts-for-react";

const GAS_PER_BLOB = 131_072;

function shortHour(iso: string) {
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}h`;
}

interface Props {
  data: MarketHour[];
  ethUsd?: number;
}

export function BlobFeeLineChart({ data, ethUsd }: Props) {
  if (!data.length)
    return <p className="py-8 text-center text-[0.6875rem] text-[#4B5563]">No data</p>;

  const isUsd = ethUsd != null;
  const labels = data.map((d) => shortHour(d.hour));
  const values = data.map((d) => {
    const fee = Number(d.avg_fee);
    if (fee === 0) return null;
    return isUsd
      ? (fee * GAS_PER_BLOB) / 1e18 * ethUsd
      : parseFloat((fee / 1e9).toFixed(6));
  });
  const nonNull = values.filter((v): v is number => v !== null);
  const avg = nonNull.length ? nonNull.reduce((a, b) => a + b, 0) / nonNull.length : 0;

  const yFmt = isUsd
    ? (v: number) => (v < 0.0001 ? "< $0.0001" : `$${v.toFixed(4)}`)
    : (v: number) => (v < 0.0001 ? "< 0.0001" : v.toFixed(4));

  const ttFmt = isUsd
    ? (v: number) => (v < 0.0001 ? "< $0.0001 / blob" : `$${v.toFixed(4)} / blob`)
    : (v: number) => (v < 0.0001 ? "< 0.0001 gwei" : `${v.toFixed(4)} gwei`);

  const option = {
    animation: true,
    animationEasing: "cubicOut" as const,
    animationDuration: 600,
    grid: { top: 8, right: 8, bottom: 24, left: 0, containLabel: true },
    xAxis: {
      type: "category" as const,
      data: labels,
      axisLabel: { color: "#4B5563", fontSize: 11, fontFamily: "Space Grotesk, system-ui" },
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: { show: false },
      boundaryGap: false,
    },
    yAxis: {
      type: "value" as const,
      axisLabel: {
        color: "#4B5563", fontSize: 11, fontFamily: "Space Grotesk, system-ui",
        formatter: yFmt,
      },
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: { lineStyle: { color: "rgba(255,255,255,0.04)" } },
    },
    tooltip: {
      trigger: "axis" as const,
      backgroundColor: "#1A2235",
      borderColor: "rgba(16,185,129,0.2)",
      borderWidth: 1,
      textStyle: { color: "#F9FAFB", fontSize: 12, fontFamily: "Space Grotesk, system-ui" },
      formatter: (params: { axisValue: string; value: number }[]) =>
        `<span style="color:#4B5563;font-size:11px">${params[0].axisValue}</span><br/><b style="font-family:monospace;color:#6EE7B7">${ttFmt(params[0].value)}</b>`,
    },
    series: [
      {
        type: "line" as const,
        data: values,
        connectNulls: false,
        smooth: 0.4,
        lineStyle: { color: "#10B981", width: 2 },
        symbol: "none",
        areaStyle: {
          color: {
            type: "linear" as const,
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: "rgba(16,185,129,0.15)" },
              { offset: 1, color: "rgba(16,185,129,0)" },
            ],
          },
        },
        markLine: {
          silent: true,
          symbol: "none",
          lineStyle: { color: "rgba(16,185,129,0.3)", type: "dashed" as const, width: 1 },
          label: { formatter: "avg", color: "#4B5563", fontSize: 10, position: "end" as const },
          data: [{ yAxis: avg }],
        },
      },
    ],
  };

  return <ReactECharts option={option} style={{ height: "280px", width: "100%" }} />;
}
