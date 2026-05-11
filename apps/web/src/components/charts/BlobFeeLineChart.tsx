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
  return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}h`;
}

interface Props {
  data: MarketHour[];
  ethUsd?: number;
}

export function BlobFeeLineChart({ data, ethUsd }: Props) {
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const isDark = theme !== 'light';
  const chartTheme = getChartTheme(isDark);

  if (!mounted) return <div className="h-[300px]" />;
  if (!data.length)
    return <p className="py-8 text-center text-[0.6875rem] text-muted-foreground">No data</p>;

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
    return <p className="py-8 text-center text-[0.6875rem] text-muted-foreground">Fee data unavailable — indexer restarting with updated constants</p>;

  const fmtGwei = (v: number) => {
    if (v === 0) return "0 gwei";
    if (v < 0.0001) return `${v.toPrecision(3)} gwei`;
    return `${v.toFixed(4)} gwei`;
  };

  const yFmt = isUsd ? (v: number) => formatUsd(v) : fmtGwei;
  const ttFmt = isUsd
    ? (v: number) => `${formatUsd(v)} / blob`
    : (v: number) => `${fmtGwei(v)} / blob`;

  const option = {
    ...animationConfig,
    ...chartTheme,
    grid: chartTheme.gridDefaults,
    xAxis: {
      type: "category" as const,
      data: labels,
      ...chartTheme.axis,
      boundaryGap: false,
    },
    yAxis: {
      type: "value" as const,
      min: 0,
      max: (extent: { max: number }) => (extent.max > 0 ? extent.max * 1.3 : 1),
      ...chartTheme.axis,
      axisLabel: {
        ...chartTheme.axis.axisLabel,
        formatter: yFmt,
      },
    },
    tooltip: {
      trigger: "axis" as const,
      ...chartTheme.tooltip,
      formatter: (params: { axisValue: string; value: number | null }[]) => {
        const val = params[0].value;
        const label = val == null ? "no data" : ttFmt(val);
        return `<div style="display:flex;flex-direction:column;gap:4px;">
          <span style="color:${isDark ? '#71717a' : '#94A3B8'};font-size:11px">${params[0].axisValue}</span>
          <span style="font-family:monospace;color:${isDark ? '#00df81' : '#059669'};font-weight:600">${label}</span>
        </div>`;
      },
    },
    series: [
      {
        type: "line" as const,
        data: values,
        connectNulls: false,
        smooth: 0.4,
        lineStyle: chartTheme.lineStyle,
        symbol: "none",
        areaStyle: {
          color: chartTheme.areaGradient,
        },
        markLine: {
          silent: true,
          symbol: "none",
          lineStyle: { 
            color: isDark ? "rgba(0,223,129,0.3)" : "rgba(5,150,105,0.3)", 
            type: "dashed" as const, 
            width: 1 
          },
          label: { 
            formatter: "avg", 
            color: isDark ? "#71717a" : "#94A3B8", 
            fontSize: 10, 
            position: "end" as const 
          },
          data: [{ yAxis: avg }],
        },
      },
    ],
  };

  return <ReactECharts option={option} style={{ height: "280px", width: "100%" }} />;
}
