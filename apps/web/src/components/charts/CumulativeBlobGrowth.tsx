"use client";

import type { MarketHour } from "@/types";
import ReactECharts from "echarts-for-react";

function shortHour(iso: string) {
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}h`;
}

interface Props {
  data: MarketHour[];
}

export function CumulativeBlobGrowth({ data }: Props) {
  if (!data.length)
    return <p className="py-8 text-center text-[0.6875rem] text-[#5C5575]">No data</p>;

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
    animationDuration: 800,
    grid: { top: 8, right: 8, bottom: 24, left: 0, containLabel: true },
    xAxis: {
      type: "category" as const,
      data: labels,
      axisLabel: { color: "#5C5575", fontSize: 11, fontFamily: "var(--font-geist-sans)" },
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: { show: false },
      boundaryGap: false,
    },
    yAxis: {
      type: "value" as const,
      axisLabel: {
        color: "#5C5575", fontSize: 11, fontFamily: "var(--font-geist-sans)",
        formatter: (v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v),
      },
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: { lineStyle: { color: "rgba(255,255,255,0.04)" } },
    },
    tooltip: {
      trigger: "axis" as const,
      backgroundColor: "#141414",
      borderColor: "#242424",
      borderWidth: 1,
      textStyle: { color: "#F0EEF6", fontSize: 12 },
      formatter: (params: { axisValue: string; value: number }[]) =>
        `<span style="color:#5C5575;font-size:11px">${params[0].axisValue}</span><br/><b>${Number(params[0].value).toLocaleString()} blobs</b>`,
    },
    series: [
      {
        type: "line" as const,
        data: values,
        smooth: 0.3,
        lineStyle: { color: "#8A4FD8", width: 2 },
        symbol: "none",
        areaStyle: {
          color: {
            type: "linear" as const,
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: "rgba(138,79,216,0.3)" },
              { offset: 1, color: "rgba(138,79,216,0)" },
            ],
          },
        },
      },
    ],
  };

  return <ReactECharts option={option} style={{ height: "280px", width: "100%" }} />;
}
