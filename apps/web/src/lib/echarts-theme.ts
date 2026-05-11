export const blobLensTheme = {
  backgroundColor: 'transparent',
  textStyle: {
    fontFamily: "'Space Grotesk', Arial, sans-serif",
    color: '#6B7280',
  },
  grid: {
    left: '2%', right: '2%', top: '8%', bottom: '12%', containLabel: true,
  },
  xAxis: {
    axisLine: { show: false },
    axisTick: { show: false },
    axisLabel: { color: '#4B5563', fontSize: 11, fontFamily: "'Space Grotesk', Arial, sans-serif" },
    splitLine: { show: false },
  },
  yAxis: {
    axisLine: { show: false },
    axisTick: { show: false },
    axisLabel: { color: '#4B5563', fontSize: 11, fontFamily: "'Space Grotesk', Arial, sans-serif" },
    splitLine: { lineStyle: { color: 'rgba(255,255,255,0.04)', type: 'dashed' } },
  },
  tooltip: {
    backgroundColor: 'rgba(5, 8, 16, 0.9)',
    borderColor: 'rgba(16, 185, 129, 0.3)',
    borderWidth: 1,
    borderRadius: 10,
    padding: [10, 14],
    textStyle: { color: '#F9FAFB', fontSize: 12, fontFamily: "'Space Grotesk', Arial, sans-serif" },
    extraCssText: 'backdrop-filter: blur(12px); box-shadow: 0 4px 20px rgba(0,0,0,0.4);',
  },
  legend: {
    textStyle: { color: '#6B7280', fontSize: 11, fontFamily: "'Space Grotesk', Arial, sans-serif" },
    icon: 'circle',
    itemWidth: 6,
    itemHeight: 6,
  },
};
