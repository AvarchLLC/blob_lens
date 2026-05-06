"use client";

import ReactECharts from "echarts-for-react";
import { formatUsd } from "@/lib/ethPrice";

const GAS_PER_BLOB = 131_072;
const CARD_BG = "#111827"; // matches --card in globals.css

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

const LEVELS = [
  { max: 20,  label: "Ultra Cheap", color: "#22c55e" },
  { max: 40,  label: "Cheap",       color: "#84cc16" },
  { max: 58,  label: "Moderate",    color: "#eab308" },
  { max: 72,  label: "Elevated",    color: "#f97316" },
  { max: 87,  label: "Expensive",   color: "#ea580c" },
  { max: 100, label: "Extreme",     color: "#dc2626" },
] as const;

function getLevel(v: number) {
  return LEVELS.find((l) => v <= l.max) ?? LEVELS[LEVELS.length - 1];
}

export function BlobFeeGauge({ latestFeeWei, ethUsd }: Props) {
  const gaugeVal = toGaugeValue(latestFeeWei);
  const feeGwei  = latestFeeWei > 0 ? latestFeeWei / 1e9 : null;
  const costUsd  =
    latestFeeWei > 0 && ethUsd != null
      ? (latestFeeWei * GAS_PER_BLOB) / 1e18 * ethUsd
      : null;

  const level = latestFeeWei > 0 ? getLevel(gaugeVal) : null;

  // Build color stops with thin gaps that match the card background
  const GAP  = 0.012;
  const N    = 6;
  const seg  = (1 - GAP * (N - 1)) / N;
  const stops: [number, string][] = [];
  LEVELS.forEach(({ color }, i) => {
    stops.push([seg * (i + 1) + GAP * i, color]);
    if (i < N - 1) stops.push([seg * (i + 1) + GAP * (i + 1), CARD_BG]);
  });

  const option = {
    backgroundColor: "transparent",
    series: [
      {
        type: "gauge",
        startAngle: 180,
        endAngle: 0,
        min: 0,
        max: 100,
        radius: "90%",
        center: ["50%", "82%"],
        axisLine: {
          roundCap: false,
          lineStyle: { width: 30, color: stops },
        },
        axisTick:  { show: false },
        splitLine: { show: false },
        axisLabel: { show: false },
        pointer: {
          length: "62%",
          width: 5,
          itemStyle: { color: "#F9FAFB" },
        },
        anchor: {
          show: true,
          size: 16,
          itemStyle: {
            color: "#F9FAFB",
            borderColor: "#4B5563",
            borderWidth: 3,
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
    <div className="flex min-h-[280px] flex-col items-center justify-center gap-2 text-center">
      <div className="relative w-full" style={{ maxWidth: 300, margin: "0 auto" }}>
        <ReactECharts option={option} style={{ height: 155, width: "100%" }} />
        <p
          className="absolute text-[11px] font-semibold tracking-widest uppercase"
          style={{
            bottom: 2,
            left: "50%",
            transform: "translateX(-50%)",
            color: level ? level.color : "#4B5563",
            whiteSpace: "nowrap",
          }}
        >
          {level ? level.label : "No Data"}
        </p>
      </div>

      <p className="font-mono text-4xl font-bold tracking-tight text-foreground mt-1">
        {costUsd !== null ? formatUsd(costUsd) : "—"}
      </p>
      <p className="caption">per blob · last hour average</p>
      {feeGwei !== null && (
        <p className="caption">
          blob base fee:{" "}
          <span className="font-mono text-[#9CA3AF]">
            {feeGwei < 0.0001
              ? feeGwei.toPrecision(3)
              : feeGwei.toFixed(4)}{" "}
            gwei
          </span>
        </p>
      )}
      {ethUsd != null && (
        <p className="caption text-[#4B5563]">
          ETH / USD:{" "}
          <span className="font-mono">${ethUsd.toLocaleString()}</span>
        </p>
      )}
      {ethUsd == null && latestFeeWei > 0 && (
        <p className="caption text-[#4B5563]">ETH price unavailable</p>
      )}
    </div>
  );
}
