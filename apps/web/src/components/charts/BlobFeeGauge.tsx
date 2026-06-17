"use client";

import ReactECharts from "echarts-for-react";
import { useTheme } from "next-themes";
import { formatUsd } from "@/lib/ethPrice";
import { useEffect, useState } from "react";

const GAS_PER_BLOB = 131_072;

interface Props {
  latestFeeWei: number;
  ethUsd?: number | null;
}

function toGaugeValue(feeWei: number): number {
  if (feeWei <= 0) return 0;
  // log10 scale: 0.001 gwei→0, 0.01→25, 0.1→50, 1→75, 10→100
  const feeGwei = feeWei / 1e9;
  return Math.min(100, Math.max(0, ((Math.log10(feeGwei) + 3) / 4) * 100));
}

function getRegimeFromValue(val: number): { label: string; color: string } {
  if (val < 25)  return { label: "UNDERSATURATED", color: "#52666E" };
  if (val < 60)  return { label: "HEALTHY",        color: "#00A86B" };
  if (val < 85)  return { label: "CONGESTED",      color: "#E8A020" };
  return           { label: "SPIKE",             color: "#E5484D" };
}

export function BlobFeeGauge({ latestFeeWei, ethUsd }: Props) {
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) return <div className="min-h-[280px]" />;

  const gaugeVal = toGaugeValue(latestFeeWei);
  const feeGwei  = latestFeeWei > 0 ? latestFeeWei / 1e9 : null;
  const costUsd  =
    latestFeeWei > 0 && ethUsd != null
      ? (latestFeeWei * GAS_PER_BLOB) / 1e18 * ethUsd
      : null;

  const isDark = theme !== "light";
  const regime = latestFeeWei > 0 ? getRegimeFromValue(gaugeVal) : null;
  const pointerColor = isDark ? "#E8F0F2" : "#0A1C20";

  const option = {
    backgroundColor: "transparent",
    series: [
      {
        type: "gauge",
        startAngle: 200,
        endAngle: -20,
        min: 0,
        max: 100,
        radius: "90%",
        center: ["50%", "75%"],
        splitNumber: 0,
        axisLine: {
          lineStyle: {
            width: 12,
            color: [
              [0.25, "#52666E"],
              [0.60, "#00A86B"],
              [0.85, "#E8A020"],
              [1,    "#E5484D"],
            ],
          },
        },
        axisTick:  { show: false },
        splitLine: { show: false },
        axisLabel: { show: false },
        pointer: {
          length: "60%",
          width: 3,
          itemStyle: { color: pointerColor },
        },
        anchor: {
          show: true,
          size: 10,
          itemStyle: {
            color: pointerColor,
            borderColor: isDark ? "#1A2830" : "#C8D8DC",
            borderWidth: 2,
          },
        },
        detail: { show: false },
        data: [{ value: latestFeeWei > 0 ? gaugeVal : 0 }],
        animation: true,
        animationEasingUpdate: "cubicOut" as const,
        animationDurationUpdate: 800,
      },
    ],
  };

  return (
    <div className="flex min-h-[280px] flex-col items-center justify-center gap-2 text-center w-full">
      <div className="relative w-full" style={{ maxWidth: 300, margin: "0 auto" }}>
        <ReactECharts option={option} style={{ height: 155, width: "100%" }} />
        {/* Regime label rendered below arc, not inside ECharts */}
        <p
          className="absolute text-[10px] uppercase tracking-[0.12em]"
          style={{
            bottom: 4,
            left: "50%",
            transform: "translateX(-50%)",
            fontFamily: "var(--font-body)",
            color: regime ? regime.color : "var(--text-tertiary)",
            whiteSpace: "nowrap",
            fontWeight: 600,
          }}
        >
          {regime ? regime.label : "NO DATA"}
        </p>
      </div>

      {/* USD cost — Geist Mono, large */}
      <p className="font-mono text-4xl font-bold tracking-tight text-foreground mt-1">
        {costUsd !== null ? formatUsd(costUsd) : "—"}
      </p>
      <p className="caption">per blob · last hour average</p>

      {feeGwei !== null && (
        <p className="caption">
          blob base fee:{" "}
          <span className="font-mono text-text-secondary">
            {feeGwei < 0.0001
              ? feeGwei.toPrecision(3)
              : feeGwei.toFixed(4)}{" "}
            gwei
          </span>
        </p>
      )}
      {ethUsd != null && (
        <p className="caption text-text-secondary/60">
          ETH / USD:{" "}
          <span className="font-mono">${ethUsd.toLocaleString()}</span>
        </p>
      )}
      {ethUsd == null && latestFeeWei > 0 && (
        <p className="caption text-text-secondary/60">ETH price unavailable</p>
      )}
    </div>
  );
}
