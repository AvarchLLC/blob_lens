"use client";

import React, { useMemo } from "react";
import { useTheme } from "next-themes";
import { EChartWrapper, ChartFooter } from "./echart-wrapper";
import type { EChartsOption } from "echarts";
import { Gauge, Zap, TrendingUp, AlertTriangle } from "lucide-react";

interface BlobFeeGaugeProps {
  latestFeeWei?: number;
  ethUsd?: number;
}

export function BlobFeeGauge({
  latestFeeWei = 1200000,
  ethUsd = 2850,
}: BlobFeeGaugeProps) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = mounted ? resolvedTheme === "dark" : true;

  const feeGwei = useMemo(() => latestFeeWei / 1e9, [latestFeeWei]);
  const usdCostPerBlob = useMemo(
    () => ((latestFeeWei * 131072) / 1e18) * ethUsd,
    [latestFeeWei, ethUsd]
  );

  // Calculate logarithmic scale position (0.001 Gwei -> 10 Gwei mapped to 0 -> 100)
  const gaugeValue = useMemo(() => {
    if (feeGwei <= 0.0001) return 0;
    const logVal = Math.log10(feeGwei);
    // Maps 0.001 (log=-3) to 0, 0.01 (log=-2) to 25, 0.1 (log=-1) to 50, 1 (log=0) to 75, 10 (log=1) to 100
    const normalized = ((logVal + 3) / 4) * 100;
    return Math.max(0, Math.min(100, normalized));
  }, [feeGwei]);

  // Determine current market regime & badge details
  const regimeInfo = useMemo(() => {
    if (feeGwei < 0.01) {
      return {
        label: "QUIET / LOW COST",
        color: "text-teal-700 dark:text-[#63F3FF] bg-teal-50 dark:bg-[#63F3FF]/10 border-teal-200 dark:border-[#63F3FF]/30",
        icon: Zap,
      };
    } else if (feeGwei < 0.1) {
      return {
        label: "NOMINAL DEMAND",
        color: "text-blue-700 dark:text-[#3B82F6] bg-blue-50 dark:bg-[#3B82F6]/10 border-blue-200 dark:border-[#3B82F6]/30",
        icon: Gauge,
      };
    } else if (feeGwei < 1.0) {
      return {
        label: "MODERATE CONGESTION",
        color: "text-purple-700 dark:text-[#9B7CFF] bg-purple-50 dark:bg-[#9B7CFF]/10 border-purple-200 dark:border-[#9B7CFF]/30",
        icon: TrendingUp,
      };
    } else {
      return {
        label: "HIGH FEE SURGE",
        color: "text-red-700 dark:text-[#FF5C7A] bg-red-50 dark:bg-[#FF5C7A]/10 border-red-200 dark:border-[#FF5C7A]/30",
        icon: AlertTriangle,
      };
    }
  }, [feeGwei]);

  const option = useMemo<EChartsOption>(() => {
    // Theme color variables
    const trackBg = isDark ? "#18212C" : "#E2E8F0";
    const labelColor = isDark ? "#A8B1BD" : "#4A5568";
    const tickColor = isDark ? "#384756" : "#CBD5E1";
    const pivotBorderColor = isDark ? "#07090D" : "#FFFFFF";

    // Arc color steps using BlobLens Design Tokens (Light mode uses high-contrast shades)
    const arcColors: [number, string][] = isDark
      ? [
          [0.25, "#63F3FF"], // Electric Cyan (Minimal / nominal)
          [0.50, "#3B82F6"], // Iris Blue (Optimal)
          [0.75, "#9B7CFF"], // Violet Accent (Elevated)
          [0.90, "#FFC857"], // Warning Amber (Surge)
          [1.00, "#FF5C7A"], // Danger Red (Saturated)
        ]
      : [
          [0.25, "#0284C7"], // Sky / Teal (High contrast in light mode)
          [0.50, "#2563EB"], // Blue
          [0.75, "#7C3AED"], // Violet
          [0.90, "#D97706"], // Amber
          [1.00, "#DC2626"], // Red
        ];

    return {
      backgroundColor: "transparent",
      series: [
        // Background track arc (thin outer outline for precision look)
        {
          type: "gauge",
          startAngle: 200,
          endAngle: -20,
          min: 0,
          max: 100,
          radius: "98%",
          center: ["50%", "62%"],
          axisLine: {
            lineStyle: {
              width: 2,
              color: [[1, trackBg]],
            },
          },
          splitLine: { show: false },
          axisTick: { show: false },
          axisLabel: { show: false },
          pointer: { show: false },
          detail: { show: false },
        },
        // Main fee gauge arc
        {
          type: "gauge",
          startAngle: 200,
          endAngle: -20,
          min: 0,
          max: 100,
          splitNumber: 4,
          radius: "90%",
          center: ["50%", "62%"],
          axisLine: {
            lineStyle: {
              width: 14,
              color: arcColors,
            },
          },
          pointer: {
            icon: "path://M-2.5,0 L2.5,0 L1.2,-82 L-1.2,-82 Z",
            length: "78%",
            width: 5,
            offsetCenter: [0, 0],
            itemStyle: {
              color: isDark ? "#63F3FF" : "#0284C7",
              shadowColor: isDark ? "rgba(99, 243, 255, 0.6)" : "rgba(2, 132, 199, 0.3)",
              shadowBlur: 8,
            },
          },
          anchor: {
            show: true,
            showAbove: true,
            size: 16,
            itemStyle: {
              color: isDark ? "#63F3FF" : "#0284C7",
              borderWidth: 3,
              borderColor: pivotBorderColor,
              shadowBlur: 6,
              shadowColor: isDark ? "rgba(99, 243, 255, 0.5)" : "rgba(0,0,0,0.15)",
            },
          },
          axisTick: {
            show: true,
            splitNumber: 5,
            length: 6,
            distance: -20,
            lineStyle: {
              color: tickColor,
              width: 1,
            },
          },
          splitLine: {
            show: true,
            length: 12,
            distance: -22,
            lineStyle: {
              color: labelColor,
              width: 2,
            },
          },
          axisLabel: {
            color: labelColor,
            fontSize: 10,
            fontFamily: "Geist Mono, monospace",
            distance: -38,
            formatter: (val: number) => {
              if (val === 0) return "0.001g";
              if (val === 25) return "0.01g";
              if (val === 50) return "0.1g";
              if (val === 75) return "1.0g";
              if (val === 100) return "10g";
              return "";
            },
          },
          title: { show: false },
          detail: { show: false },
          data: [{ value: gaugeValue }],
        },
      ],
    };
  }, [gaugeValue, isDark]);

  const ModeIcon = regimeInfo.icon;

  return (
    <div className="flex flex-col justify-between h-full min-h-[300px] w-full">
      {/* Top Status & Regime Badge */}
      <div className="flex items-center justify-between gap-2 px-1 pt-1 pb-2">
        <div className="flex items-center gap-1.5">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--primary)] opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--primary)]"></span>
          </span>
          <span className="text-[11px] font-mono text-[var(--text-muted)] uppercase tracking-wider">
            BASE FEE METER
          </span>
        </div>
        <div
          className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-semibold border ${regimeInfo.color}`}
        >
          <ModeIcon className="w-3 h-3" />
          <span>{regimeInfo.label}</span>
        </div>
      </div>

      {/* Main Gauge Chart Container */}
      <div className="relative w-full h-[220px] flex items-center justify-center -my-2">
        <EChartWrapper option={option} style={{ height: "220px", width: "100%" }} showFooter={false} showWatermark={false} />
      </div>

      {/* Primary Value Readout & Metrics */}
      <div className="flex flex-col items-center text-center pt-1 pb-2 border-t border-dashed border-[var(--border)] mt-auto">
        <span className="text-[10px] font-mono uppercase tracking-widest text-[var(--text-muted)]">
          ESTIMATED COST PER BLOB (128 KB)
        </span>
        <div className="flex items-baseline gap-1 my-0.5">
          <span className="text-3xl font-mono font-bold text-[var(--text-primary)] tabular-nums tracking-tight">
            ${usdCostPerBlob < 0.0001 ? usdCostPerBlob.toFixed(6) : usdCostPerBlob.toFixed(4)}
          </span>
          <span className="text-xs font-mono text-[var(--text-muted)]">USD</span>
        </div>
        <div className="flex items-center gap-2 text-[11px] font-mono text-[var(--text-secondary)] tabular-nums">
          <span className="text-[var(--primary)] font-semibold">
            {feeGwei < 0.0001 ? "<0.0001" : feeGwei.toFixed(4)} gwei
          </span>
          <span className="text-[var(--text-muted)]">•</span>
          <span>{latestFeeWei.toLocaleString()} wei/gas</span>
        </div>
      </div>

      {/* Sub-telemetry breakdown footer */}
      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[var(--border)] text-[10px] font-mono text-[var(--text-muted)]">
        <div className="flex flex-col items-start bg-[var(--surface-sunken)] p-2 rounded border border-[var(--border)]">
          <span className="text-[9px] uppercase tracking-wider text-[var(--text-muted)]">SCALE RANGE</span>
          <span className="font-semibold text-[var(--text-primary)] mt-0.5">0.001 - 10.0 GWEI</span>
        </div>
        <div className="flex flex-col items-start bg-[var(--surface-sunken)] p-2 rounded border border-[var(--border)] font-mono">
          <span className="text-[9px] uppercase tracking-wider text-[var(--text-muted)]">TARGET CAPACITY</span>
          <span className="font-semibold text-[var(--text-primary)] mt-0.5">3 / 6 BLOBS/BLOCK</span>
        </div>
      </div>

      <ChartFooter />
    </div>
  );
}

