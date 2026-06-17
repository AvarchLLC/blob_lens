"use client";

import type { SparklinePoint } from "@/types";
import ReactECharts from "echarts-for-react";

interface Props {
  points: SparklinePoint[];
}

export function BlobSparkline({ points }: Props) {
  if (!points.length) return <span className="text-[0.6875rem] text-text-secondary opacity-40">—</span>;

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
        lineStyle: { color: "#00A7B5", width: 1.5 },
        symbol: "none",
        areaStyle: {
          color: {
            type: "linear",
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: "rgba(0, 167, 181, 0.15)" },
              { offset: 1, color: "rgba(0, 167, 181, 0)" },
            ],
          },
        },
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
