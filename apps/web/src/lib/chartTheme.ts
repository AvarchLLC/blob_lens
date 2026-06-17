/**
 * Protocol Intelligence chart styling utilities for ECharts
 * Provides consistent, institutional-grade chart configurations
 */

export const watermarkGraphic = [
  {
    type: 'image',
    id: 'wm-logo',
    left: 'center',
    top: 'middle',
    z: -10,
    style: {
      image: '/brand/bloblogo.png',
      width: 48,
      height: 48,
      opacity: 0.07,
    }
  },
  {
    type: 'text',
    id: 'wm-text',
    left: 'center',
    top: '58%',
    z: -10,
    style: {
      text: 'BlobLens',
      font: 'bold 13px system-ui, sans-serif',
      fill: 'rgba(0, 167, 181, 0.09)',
      textAlign: 'center',
    }
  }
];

export const chartTheme = {
  dark: {
    backgroundColor: "transparent",
    tooltip: {
      backgroundColor: "var(--surface-elevated)",
      borderColor: "var(--border)",
      borderWidth: 1,
      borderRadius: 8,
      padding: [10, 14],
      textStyle: {
        color: "var(--text-primary)",
        fontSize: 12,
        fontFamily: "var(--font-mono), monospace",
      },
      extraCssText: "backdrop-filter: blur(8px);",
      axisPointer: {
        lineStyle: {
          color: "rgba(0, 167, 181, 0.2)",
          width: 1,
        },
        shadowStyle: {
          color: "rgba(0, 167, 181, 0.05)",
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
        color: "#7E9098", // Text Secondary
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
          color: "var(--border)", // Border color
          opacity: 0.4,
          type: "dashed" as const,
        },
      },
    },
    lineStyle: {
      color: "#00A7B5", // Primary Teal
      width: 2,
    },
    areaGradient: {
      type: "linear" as const,
      x: 0,
      y: 0,
      x2: 0,
      y2: 1,
      colorStops: [
        { offset: 0, color: "rgba(0, 167, 181, 0.20)" },
        { offset: 1, color: "rgba(0, 167, 181, 0.02)" },
      ],
    },
    graphic: watermarkGraphic,
    legend: {
      show: true,
      textStyle: { color: "#7E9098", fontSize: 10 },
      itemWidth: 8,
      itemHeight: 8,
      selectedMode: true, // Allows deselecting individual L2s
    },
    dataZoom: [
      {
        type: 'inside',
        start: 0,
        end: 100,
        zoomOnMouseWheel: 'alt', // Professional zoom behavior
      },
      {
        type: 'slider',
        show: false, // Keep slider hidden by default but available
        start: 0,
        end: 100,
        height: 20,
        bottom: 5,
        borderColor: 'transparent',
        fillerColor: 'rgba(0, 167, 181, 0.05)',
        handleStyle: { color: 'rgba(0, 167, 181, 0.3)' }
      }
    ]
  },
  light: {
    backgroundColor: "transparent",
    tooltip: {
      backgroundColor: "var(--surface-elevated)",
      borderColor: "var(--border)",
      borderWidth: 1,
      borderRadius: 8,
      padding: [10, 14],
      textStyle: {
        color: "var(--text-primary)",
        fontSize: 12,
        fontFamily: "var(--font-mono), monospace",
      },
      extraCssText: "backdrop-filter: blur(8px);",
      axisPointer: {
        lineStyle: {
          color: "rgba(0, 138, 150, 0.2)",
          width: 1,
        },
        shadowStyle: {
          color: "rgba(0, 138, 150, 0.05)",
        },
      },
    },
    gridDefaults: {
      top: 40, // Increased for legend
      right: 16,
      bottom: 24,
      left: 0,
      containLabel: true,
    },
    axis: {
      axisLabel: {
        color: "#5C7077",
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
      color: "#008A96",
      width: 2,
    },
    areaGradient: {
      type: "linear" as const,
      x: 0,
      y: 0,
      x2: 0,
      y2: 1,
      colorStops: [
        { offset: 0, color: "rgba(0, 138, 150, 0.15)" },
        { offset: 1, color: "rgba(0, 138, 150, 0.02)" },
      ],
    },
    graphic: watermarkGraphic,
    legend: {
      show: true,
      textStyle: { color: "#5C7077", fontSize: 10 },
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
        show: false,
        start: 0,
        end: 100,
        height: 20,
        bottom: 5,
        borderColor: 'transparent',
        fillerColor: 'rgba(0, 138, 150, 0.05)',
        handleStyle: { color: 'rgba(0, 138, 150, 0.3)' }
      }
    ]
  },
};

export function getChartTheme(isDark: boolean) {
  return isDark ? chartTheme.dark : chartTheme.light;
}

export function createTooltipFormatter(isUsd: boolean, formatter: (v: number) => string) {
  return (params: { axisValue: string; value: number | null }[]) => {
    const val = params[0].value;
    if (val == null) {
      return `<div style="display:flex;gap:8px;">
        <span style="color:#8FA1A8;font-size:11px">${params[0].axisValue}</span>
        <span style="color:#1C2A30">—</span>
      </div>`;
    }

    return `<div style="display:flex;flex-direction:column;gap:4px;">
      <span style="color:#8FA1A8;font-size:11px">${params[0].axisValue}</span>
      <span style="font-family:monospace;color:#00A7B5;font-weight:700">${formatter(val)}</span>
    </div>`;
  };
}

export const animationConfig = {
  animation: true,
  animationEasing: "cubicOut" as const,
  animationDuration: 600,
  animationDelay: (i: number) => i * 20,
};
