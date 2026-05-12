"use client";

import { animationConfig, getChartTheme } from "@/lib/chartTheme";
import type { FullnessHistogramBucket } from "@/types";
import ReactECharts from "echarts-for-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

// Ensure all 10 buckets 0–90 are present even if a bucket has zero blobs
function normalize(data: FullnessHistogramBucket[]): FullnessHistogramBucket[] {
  const map = new Map(data.map((b) => [b.bucket_start, b.blob_count]));
  return Array.from({ length: 10 }, (_, i) => ({
    bucket_start: i * 10,
    blob_count: Number(map.get(i * 10) ?? 0),
  }));
}

function bucketLabel(start: number) {
  return `${start}–${start + 10}%`;
}

function barColor(start: number, isDark: boolean): string {
  if (start >= 80) return isDark ? "#00df81" : "#059669";
  if (start >= 60) return isDark ? "#34d399" : "#10b981";
  if (start >= 40) return isDark ? "#fcbb00" : "#d97706";
  if (start >= 20) return isDark ? "#f97316" : "#ea580c";
  return isDark ? "#fb2c36" : "#dc2626";
}

interface Props {
  data: FullnessHistogramBucket[];
}

export function PackingHistogram({ data }: Props) {
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const isDark = theme !== "light";
  const chartTheme = getChartTheme(isDark);

  if (!mounted) return <div className="h-[280px]" />;

  const buckets = normalize(data);
  const total = buckets.reduce((s, b) => s + b.blob_count, 0);

  if (total === 0) {
    return (
      <p className="py-8 text-center text-[0.6875rem] text-muted-foreground">
        No fullness data yet — beacon sidecar indexing in progress.
      </p>
    );
  }

  const labels = buckets.map((b) => bucketLabel(b.bucket_start));
  const counts = buckets.map((b) => b.blob_count);
  const colors = buckets.map((b) => barColor(b.bucket_start, isDark));

  const option = {
    ...animationConfig,
    ...chartTheme,
    grid: { ...chartTheme.gridDefaults, bottom: 36 },
    xAxis: {
      type: "category" as const,
      data: labels,
      ...chartTheme.axis,
      axisLabel: {
        ...chartTheme.axis.axisLabel,
        rotate: 35,
        fontSize: 10,
      },
    },
    yAxis: {
      type: "value" as const,
      ...chartTheme.axis,
      axisLabel: {
        ...chartTheme.axis.axisLabel,
        formatter: (v: number) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)),
      },
    },
    tooltip: {
      trigger: "axis" as const,
      ...chartTheme.tooltip,
      formatter: (params: { axisValue: string; value: number }[]) => {
        const { axisValue, value } = params[0];
        const pct = total > 0 ? ((value / total) * 100).toFixed(1) : "0";
        return `<div style="display:flex;flex-direction:column;gap:4px;">
          <span style="color:${isDark ? "#71717a" : "#94A3B8"};font-size:11px">${axisValue} full</span>
          <span style="font-family:monospace;font-weight:600;color:${isDark ? "#fafafa" : "#0F172A"}">${value.toLocaleString()} blobs</span>
          <span style="font-family:monospace;font-size:10px;color:${isDark ? "#71717a" : "#94A3B8"}">${pct}% of total</span>
        </div>`;
      },
    },
    series: [
      {
        type: "bar" as const,
        data: counts.map((v, i) => ({
          value: v,
          itemStyle: { color: colors[i], borderRadius: [3, 3, 0, 0] },
        })),
        barMaxWidth: 40,
      },
    ],
  };

  return <ReactECharts option={option} style={{ height: "280px", width: "100%" }} />;
}
