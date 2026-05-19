"use client";

import type { MarketHour } from "@/types";
import ReactECharts from "echarts-for-react";
import { watermarkGraphic } from "@/lib/chartTheme";

function shortHour(iso: string) {
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}h`;
}

interface Props {
  data: MarketHour[];
}

export function CumulativeBlobGrowth({ data }: Props) {
  if (!data.length)
    return <p className="py-8 text-center text-[0.6875rem] text-[#4B5563]">No data</p>;

  let running = 0;
  const labels: string[] = [];
  const values: number[] = [];
  for (const d of data) {
    running += Number(d.blob_count);
    labels.push(shortHour(d.hour));
    values.push(running);
  }

  const option = {
    animation: true,
    animationEasing: "cubicOut" as const,
    animationDuration: 700,
    graphic: watermarkGraphic,
    grid: { top: 16, right: 16, bottom: 24, left: 0, containLabel: true },
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
        formatter: (v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v),
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
        `<span style="color:#4B5563;font-size:11px">${params[0].axisValue}</span><br/><b>${Number(params[0].value).toLocaleString()} blobs</b>`,
    },
    series: [
      {
        type: "line" as const,
        data: values,
        smooth: 0.3,
        lineStyle: { color: "#10B981", width: 1.5 },
        symbol: "none",
        areaStyle: {
          color: {
            type: "linear" as const,
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: "rgba(16,185,129,0.2)" },
              { offset: 1, color: "rgba(16,185,129,0)" },
            ],
          },
        },
      },
    ],
  };

  return <ReactECharts option={option} style={{ height: "280px", width: "100%" }} />;
}
