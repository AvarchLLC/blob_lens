/**
 * Premium chart styling utilities for ECharts
 * Provides consistent, luxury-themed chart configurations
 */

export const chartTheme = {
  dark: {
    backgroundColor: "transparent",
    tooltip: {
      backgroundColor: "rgba(10, 10, 12, 0.92)",
      borderColor: "rgba(0, 223, 129, 0.3)",
      borderWidth: 1,
      textStyle: {
        color: "#fafafa",
        fontSize: 12,
        fontFamily: "Space Grotesk, system-ui, sans-serif",
      },
      padding: [12, 14],
      axisPointer: {
        lineStyle: {
          color: "rgba(0, 223, 129, 0.2)",
          width: 1,
        },
        shadowStyle: {
          color: "rgba(0, 223, 129, 0.05)",
        },
      },
    },
    gridDefaults: {
      top: 8,
      right: 8,
      bottom: 24,
      left: 0,
      containLabel: true,
    },
    axis: {
      axisLabel: {
        color: "#71717a",
        fontSize: 11,
        fontFamily: "Space Grotesk, system-ui, sans-serif",
      },
      axisLine: {
        show: false,
      },
      axisTick: {
        show: false,
      },
      splitLine: {
        lineStyle: {
          color: "rgba(255, 255, 255, 0.04)",
        },
      },
    },
    lineStyle: {
      color: "#00df81",
      width: 2.5,
    },
    areaGradient: {
      type: "linear" as const,
      x: 0,
      y: 0,
      x2: 0,
      y2: 1,
      colorStops: [
        { offset: 0, color: "rgba(0, 223, 129, 0.25)" },
        { offset: 0.5, color: "rgba(0, 223, 129, 0.12)" },
        { offset: 1, color: "rgba(0, 223, 129, 0.02)" },
      ],
    },
  },
  light: {
    backgroundColor: "transparent",
    tooltip: {
      backgroundColor: "rgba(255, 255, 255, 0.96)",
      borderColor: "rgba(5, 150, 105, 0.3)",
      borderWidth: 1,
      textStyle: {
        color: "#0F172A",
        fontSize: 12,
        fontFamily: "Space Grotesk, system-ui, sans-serif",
      },
      padding: [12, 14],
      axisPointer: {
        lineStyle: {
          color: "rgba(5, 150, 105, 0.2)",
          width: 1,
        },
        shadowStyle: {
          color: "rgba(5, 150, 105, 0.05)",
        },
      },
    },
    gridDefaults: {
      top: 8,
      right: 8,
      bottom: 24,
      left: 0,
      containLabel: true,
    },
    axis: {
      axisLabel: {
        color: "#94A3B8",
        fontSize: 11,
        fontFamily: "Space Grotesk, system-ui, sans-serif",
      },
      axisLine: {
        show: false,
      },
      axisTick: {
        show: false,
      },
      splitLine: {
        lineStyle: {
          color: "rgba(0, 0, 0, 0.02)",
        },
      },
    },
    lineStyle: {
      color: "#059669",
      width: 2.5,
    },
    areaGradient: {
      type: "linear" as const,
      x: 0,
      y: 0,
      x2: 0,
      y2: 1,
      colorStops: [
        { offset: 0, color: "rgba(5, 150, 105, 0.20)" },
        { offset: 0.5, color: "rgba(5, 150, 105, 0.10)" },
        { offset: 1, color: "rgba(5, 150, 105, 0.02)" },
      ],
    },
  },
};

/**
 * Get the appropriate chart theme based on current theme
 */
export function getChartTheme(isDark: boolean) {
  return isDark ? chartTheme.dark : chartTheme.light;
}

/**
 * Enhanced tooltip formatter helper
 */
export function createTooltipFormatter(isUsd: boolean, formatter: (v: number) => string) {
  return (params: { axisValue: string; value: number | null }[]) => {
    const val = params[0].value;
    if (val == null) {
      return `<div style="display:flex;gap:8px;">
        <span style="color:#71717a;font-size:11px">${params[0].axisValue}</span>
        <span style="color:#52525b">—</span>
      </div>`;
    }

    return `<div style="display:flex;flex-direction:column;gap:4px;">
      <span style="color:#71717a;font-size:11px">${params[0].axisValue}</span>
      <span style="font-family:monospace;color:#00df81;font-weight:600">${formatter(val)}</span>
    </div>`;
  };
}

/**
 * Animation configuration for chart entrance
 */
export const animationConfig = {
  animation: true,
  animationEasing: "cubicOut" as const,
  animationDuration: 600,
  animationDelay: (i: number) => i * 30,
};
