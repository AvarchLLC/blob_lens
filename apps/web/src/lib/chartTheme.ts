/**
 * Protocol Intelligence chart styling utilities for ECharts
 * Provides consistent, institutional-grade chart configurations
 */

export function getWatermarkGraphic(isDark: boolean) {
  const formattedTime = new Date().toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short'
  });

  // Theme-aware colors
  const textColor = isDark ? 'rgba(142, 142, 168, 0.35)' : 'rgba(88, 84, 122, 0.45)';
  const logoOpacity = isDark ? 0.04 : 0.05;
  const centralTextFill = isDark ? 'rgba(139, 92, 246, 0.07)' : 'rgba(124, 58, 237, 0.08)';
  const centralSubFill = isDark ? 'rgba(139, 92, 246, 0.04)' : 'rgba(124, 58, 237, 0.05)';

  return [
    {
      type: 'image',
      id: 'wm-logo',
      left: 'center',
      top: 'middle',
      z: -10,
      style: {
        image: '/brand/bloblens-logo.svg',
        width: 72,
        height: 72,
        opacity: logoOpacity,
      }
    },
    {
      type: 'text',
      id: 'wm-text',
      left: 'center',
      top: '57%',
      z: -10,
      style: {
        text: 'BLOBLENS',
        font: 'bold 12px var(--font-mono), monospace',
        fill: centralTextFill,
        textAlign: 'center',
        letterSpacing: 4,
      }
    },
    {
      type: 'text',
      id: 'wm-text-sub',
      left: 'center',
      top: '61%',
      z: -10,
      style: {
        text: 'DATA AVAILABILITY TELEMETRY',
        font: '600 7px var(--font-mono), monospace',
        fill: centralSubFill,
        textAlign: 'center',
        letterSpacing: 2,
      }
    }
  ];
}

// Static fallback for backwards compatibility
export const watermarkGraphic = getWatermarkGraphic(true);

export const chartTheme = {
  dark: {
    backgroundColor: "transparent",
    tooltip: {
      backgroundColor: "rgba(16, 16, 30, 0.95)",
      borderColor: "rgba(139, 92, 246, 0.4)",
      borderWidth: 1,
      borderType: "dashed",
      borderRadius: 0,
      padding: [10, 14],
      textStyle: {
        color: "#F5F3FF",
        fontSize: 11,
        fontFamily: "var(--font-mono), monospace",
      },
      extraCssText: "backdrop-filter: blur(8px); box-shadow: 0 0 15px rgba(139, 92, 246, 0.1); border-style: dashed !important;",
      axisPointer: {
        lineStyle: {
          color: "rgba(139, 92, 246, 0.2)",
          width: 1,
        },
        shadowStyle: {
          color: "rgba(139, 92, 246, 0.05)",
        },
      },
    },
    gridDefaults: {
      top: 24,
      right: 16,
      bottom: 24,
      left: 0,
      containLabel: true,
    },
    axis: {
      axisLabel: {
        color: "#8E8EA8",
        fontSize: 10,
        fontFamily: "var(--font-mono), monospace",
        margin: 8,
      },
      axisLine: {
        show: false,
      },
      axisTick: {
        show: false,
      },
      splitLine: {
        lineStyle: {
          color: "var(--border)",
          opacity: 0.4,
          type: "dashed" as const,
        },
      },
    },
    lineStyle: {
      color: "#8B5CF6",
      width: 2,
    },
    areaGradient: {
      type: "linear" as const,
      x: 0,
      y: 0,
      x2: 0,
      y2: 1,
      colorStops: [
        { offset: 0, color: "rgba(139, 92, 246, 0.20)" },
        { offset: 1, color: "rgba(139, 92, 246, 0.02)" },
      ],
    },
    graphic: watermarkGraphic,
    legend: {
      show: true,
      textStyle: { color: "#8E8EA8", fontSize: 10 },
      itemWidth: 8,
      itemHeight: 8,
      selectedMode: true,
    },
    dataZoom: [
      {
        type: 'inside',
        start: 0,
        end: 100,
        zoomOnMouseWheel: 'alt',
      },
      {
        type: 'slider',
        show: true,
        start: 0,
        end: 100,
        height: 20,
        bottom: 5,
        borderColor: 'transparent',
        fillerColor: 'rgba(139, 92, 246, 0.05)',
        handleStyle: { color: 'rgba(139, 92, 246, 0.3)' }
      }
    ]
  },
  light: {
    backgroundColor: "transparent",
    tooltip: {
      backgroundColor: "rgba(255, 255, 255, 0.96)",
      borderColor: "rgba(124, 58, 237, 0.4)",
      borderWidth: 1,
      borderType: "dashed",
      borderRadius: 0,
      padding: [10, 14],
      textStyle: {
        color: "#0E0C1B",
        fontSize: 11,
        fontFamily: "var(--font-mono), monospace",
      },
      extraCssText: "backdrop-filter: blur(8px); box-shadow: 0 4px 20px rgba(124, 58, 237, 0.08); border-style: dashed !important;",
      axisPointer: {
        lineStyle: {
          color: "rgba(124, 58, 237, 0.2)",
          width: 1,
        },
        shadowStyle: {
          color: "rgba(124, 58, 237, 0.05)",
        },
      },
    },
    gridDefaults: {
      top: 40,
      right: 16,
      bottom: 24,
      left: 0,
      containLabel: true,
    },
    axis: {
      axisLabel: {
        color: "#58547A",
        fontSize: 10,
        fontFamily: "var(--font-mono), monospace",
        margin: 8,
      },
      axisLine: {
        show: false,
      },
      axisTick: {
        show: false,
      },
      splitLine: {
        lineStyle: {
          color: "var(--border)",
          opacity: 0.4,
          type: "dashed" as const,
        },
      },
    },
    lineStyle: {
      color: "#7C3AED",
      width: 2,
    },
    areaGradient: {
      type: "linear" as const,
      x: 0,
      y: 0,
      x2: 0,
      y2: 1,
      colorStops: [
        { offset: 0, color: "rgba(124, 58, 237, 0.15)" },
        { offset: 1, color: "rgba(124, 58, 237, 0.02)" },
      ],
    },
    graphic: watermarkGraphic,
    legend: {
      show: true,
      textStyle: { color: "#58547A", fontSize: 10 },
      itemWidth: 8,
      itemHeight: 8,
      selectedMode: true,
    },
    dataZoom: [
      {
        type: 'inside',
        start: 0,
        end: 100,
        zoomOnMouseWheel: 'alt',
      },
      {
        type: 'slider',
        show: true,
        start: 0,
        end: 100,
        height: 20,
        bottom: 5,
        borderColor: 'transparent',
        fillerColor: 'rgba(124, 58, 237, 0.05)',
        handleStyle: { color: 'rgba(124, 58, 237, 0.3)' }
      }
    ]
  },
};

export function getChartTheme(isDark: boolean) {
  const baseTheme = isDark ? chartTheme.dark : chartTheme.light;
  return {
    ...baseTheme,
    graphic: getWatermarkGraphic(isDark)
  };
}

export function createTooltipFormatter(isUsd: boolean, formatter: (v: number) => string) {
  return (params: { axisValue: string; value: number | null }[]) => {
    const val = params[0].value;
    if (val == null) {
      return `<div style="display:flex;gap:8px;">
        <span style="color:#8E8EA8;font-size:11px">${params[0].axisValue}</span>
        <span style="color:#1C1C34">—</span>
      </div>`;
    }

    return `<div style="display:flex;flex-direction:column;gap:4px;">
      <span style="color:#8E8EA8;font-size:11px">${params[0].axisValue}</span>
      <span style="font-family:monospace;color:#8B5CF6;font-weight:700">${formatter(val)}</span>
    </div>`;
  };
}

export const animationConfig = {
  animation: true,
  animationEasing: "cubicOut" as const,
  animationDuration: 600,
  animationDelay: (i: number) => i * 20,
};
