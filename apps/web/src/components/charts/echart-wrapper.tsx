"use client";

import React, { useEffect, useRef, useState } from "react";
import * as echarts from "echarts";
import { useTheme } from "next-themes";

interface EChartWrapperProps {
  option: echarts.EChartsOption;
  style?: React.CSSProperties;
  className?: string;
  outerClassName?: string;
  loading?: boolean;
  showFooter?: boolean;
  showWatermark?: boolean;
  watermarkText?: string;
  updatedAt?: string;
}

export function ChartFooter({ updatedAt }: { updatedAt?: string }) {
  return (
    <div className="flex items-center justify-between pt-1.5 mt-2 border-t border-dashed border-[var(--border)] text-[10px] font-mono text-[var(--text-muted)] select-none w-full">
      <a
        href="https://bloblens.com"
        target="_blank"
        rel="noreferrer"
        className="flex items-center gap-1.5 hover:text-[var(--text-primary)] transition-colors font-bold text-[var(--primary-text)]"
      >
        <span className="w-1.5 h-1.5 rounded-full bg-[var(--success)]" />
        bloblens.com
      </a>
      <span className="uppercase tracking-wider">
        UPDATED: {updatedAt || "2026-08-13 • REAL-TIME"}
      </span>
    </div>
  );
}

export function EChartWrapper({
  option,
  style = { height: "240px", width: "100%" },
  className,
  outerClassName,
  loading = false,
  showFooter = true,
  showWatermark,
  watermarkText = "BLOBLENS",
  updatedAt,
}: EChartWrapperProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstanceRef = useRef<echarts.ECharts | null>(null);
  const { resolvedTheme } = useTheme();
  const [displayWatermark, setDisplayWatermark] = useState(false);

  useEffect(() => {
    if (!chartRef.current) return;

    if (chartInstanceRef.current) {
      chartInstanceRef.current.dispose();
    }

    const isDark = resolvedTheme === "dark";
    chartInstanceRef.current = echarts.init(
      chartRef.current,
      isDark ? "dark" : undefined,
      { renderer: "canvas" }
    );

    const chart = chartInstanceRef.current;

    if (loading) {
      chart.showLoading("default", {
        text: "FETCHING TELEMETRY...",
        color: isDark ? "#8B7BFF" : "#5B4BE0",
        textColor: isDark ? "#F4F4F8" : "#1A1A24",
        maskColor: isDark ? "rgba(18, 18, 23, 0.8)" : "rgba(255, 255, 255, 0.8)",
      });
    } else {
      chart.hideLoading();

      const isPieOrGauge = Array.isArray(option.series)
        ? option.series.some((s: any) => s?.type === "pie" || s?.type === "gauge")
        : (option.series as any)?.type === "pie" || (option.series as any)?.type === "gauge";

      const shouldDisplay = showWatermark !== undefined ? showWatermark : !isPieOrGauge;
      setDisplayWatermark(shouldDisplay);

      let finalOption = { ...option };

      if (shouldDisplay && watermarkText) {
        // Text-only watermark in ECharts — image is rendered as DOM overlay below
        const watermarkGraphic = {
          type: "text" as const,
          left: "center",
          top: "52%",
          z: 0,
          style: {
            text: watermarkText.toUpperCase(),
            fill: isDark ? "rgba(255,255,255,0.18)" : "rgba(0,0,0,0.10)",
            font: "bold 10px Geist Mono, monospace",
            textAlign: "center" as const,
          },
        };

        const existingGraphic = Array.isArray(option.graphic)
          ? option.graphic
          : option.graphic
          ? [option.graphic]
          : [];

        finalOption = {
          ...option,
          graphic: [...existingGraphic, watermarkGraphic],
        };
      }

      try {
        chart.setOption(finalOption, true);
      } catch (err) {
        console.error("[EChartWrapper] setOption failed:", err);
      }
    }

    const handleResize = () => { chart.resize(); };
    window.addEventListener("resize", handleResize);
    return () => { window.removeEventListener("resize", handleResize); };
  }, [option, loading, resolvedTheme, showWatermark, watermarkText]);

  useEffect(() => {
    return () => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.dispose();
        chartInstanceRef.current = null;
      }
    };
  }, []);

  const isDark = resolvedTheme === "dark";

  const fillParent = style?.height === "100%";

  return (
    <div className={`flex flex-col w-full${outerClassName ? ` ${outerClassName}` : ""}`}>
      <div className={fillParent ? "relative w-full flex-1 min-h-0" : "relative w-full"} style={fillParent ? undefined : { height: style?.height ?? "240px" }}>
        <div ref={chartRef} style={style} className={className} />

        {/* Logo watermark — DOM overlay so CSS filter works correctly in both modes */}
        {displayWatermark && !loading && (
          <img
            src="/brand/logomain.svg"
            alt=""
            aria-hidden
            className="absolute pointer-events-none select-none"
            style={{
              top: "38%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              width: 120,
              height: 120,
              opacity: isDark ? 0.22 : 0.10,
              // In dark mode: invert the dark logo to white; light mode: show as-is
              filter: isDark ? "brightness(0) invert(1)" : "none",
              zIndex: 0,
            }}
          />
        )}
      </div>
      {showFooter && <ChartFooter updatedAt={updatedAt} />}
    </div>
  );
}
