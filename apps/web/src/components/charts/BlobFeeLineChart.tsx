"use client";

import type { MarketHour } from "@/types";
import ReactECharts from "echarts-for-react";
import { formatUsd } from "@/lib/ethPrice";
import { getChartTheme, animationConfig } from "@/lib/chartTheme";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

const GAS_PER_BLOB = 131_072;

function shortHour(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit' });
}

interface Props {
  data: MarketHour[];
  ethUsd?: number;
}

export function BlobFeeLineChart({ data, ethUsd }: Props) {
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  
  if (!mounted) return <div className="h-[300px] w-full animate-pulse bg-surface-elevated rounded-md" />;
  
  if (!data.length)
    return <p className="py-8 text-center text-[0.6875rem] text-text-secondary opacity-50 italic">No historical fee data</p>;

  const isDark = theme !== 'light';
  const t = getChartTheme(isDark);

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

  if (nonNull.length === 0)
    return <p className="py-8 text-center text-[0.6875rem] text-text-secondary italic">Historical fee data processing...</p>;

  const fmtGwei = (v: number) => {
    if (v === 0) return "0 G";
    if (v < 0.0001) return `${v.toPrecision(3)} G`;
    return `${v.toFixed(4)} G`;
  };

  const yFmt = isUsd ? (v: number) => formatUsd(v) : (v: number) => v.toFixed(3);
  const ttFmt = isUsd
    ? (v: number) => `${formatUsd(v)} / blob`
    : (v: number) => `${fmtGwei(v)} / blob`;

  const option = {
    ...animationConfig,
    backgroundColor: t.backgroundColor,
    graphic: t.graphic,
    grid: {
      ...t.gridDefaults,
      bottom: 60
    },
    xAxis: {
      type: "category" as const,
      data: labels,
      ...t.axis,
      boundaryGap: false,
      axisLabel: {
        ...t.axis.axisLabel,
        interval: Math.floor(labels.length / 8)
      }
    },
    yAxis: {
      type: "value" as const,
      ...t.axis,
      min: 0,
      axisLabel: {
        ...t.axis.axisLabel,
        formatter: yFmt,
      },
    },
    tooltip: {
      trigger: "axis" as const,
      ...t.tooltip,
      formatter: (params: any[]) => {
        const val = params[0].value;
        const label = val == null ? "—" : ttFmt(val);
        return `<div style="display:flex;flex-direction:column;gap:4px;">
          <span style="color:#8FA1A8;font-size:10px;font-weight:bold;text-transform:uppercase;">${params[0].axisValue}</span>
          <span style="font-family:'JetBrains Mono',monospace;color:#00A7B5;font-weight:700;font-size:12px;">${label}</span>
        </div>`;
      },
    },
    dataZoom: t.dataZoom,
    series: [
      {
        name: "Blob Base Fee",
        type: "line" as const,
        data: values,
        connectNulls: true,
        smooth: 0.3,
        lineStyle: t.lineStyle,
        symbol: "none",
        areaStyle: {
          color: t.areaGradient,
        },
        markLine: {
          silent: true,
          symbol: "none",
          lineStyle: { 
            color: "rgba(0, 167, 181, 0.2)", 
            type: "dashed" as const, 
            width: 1 
          },
          label: { 
            formatter: "AVG", 
            color: "#8FA1A8", 
            fontSize: 9,
            fontWeight: "bold",
            position: "end" as const 
          },
          data: [{ yAxis: avg }],
        },
      },
    ],
  };

  return <ReactECharts option={option} style={{ height: "350px", width: "100%" }} opts={{ renderer: 'svg' }} />;
}
