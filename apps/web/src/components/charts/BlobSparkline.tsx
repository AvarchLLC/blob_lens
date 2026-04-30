"use client";

import type { SparklinePoint } from "@/types";
import ReactECharts from "echarts-for-react";

interface Props {
  points: SparklinePoint[];
}

export function BlobSparkline({ points }: Props) {
  if (!points.length) return <span className="text-[0.6875rem] text-[#5C5575]">—</span>;

  const values = points.map((p) => Number(p.blobs));

  const option = {
    animation: false,
    grid: { top: 2, right: 2, bottom: 2, left: 2 },
    xAxis: { type: "category" as const, show: false, boundaryGap: false },
    yAxis: { type: "value" as const, show: false },
    series: [
      {
        type: "line" as const,
        data: values,
        smooth: 0.4,
        lineStyle: { color: "#8A4FD8", width: 1.8 },
        symbol: "none",
        areaStyle: { color: "rgba(138,79,216,0.12)" },
      },
    ],
  };

  return (
    <ReactECharts
      option={option}
      style={{ height: "36px", width: "96px" }}
      opts={{ renderer: "svg" }}
    />
  );
}
