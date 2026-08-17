import type { DateRangeState } from "@/components/shared/time-range-picker";

export interface TimeBounds {
  preset: string;
  count: number;
  stepMs: number;
  formatType: "hour" | "datetime" | "date";
  endMs: number;
}

export function getTimeRangeBounds(timeRange?: DateRangeState): TimeBounds {
  const preset = timeRange?.preset || "24h";
  // Fixed reference timestamp: 2026-08-13 12:00 UTC
  const nowMs = 1786536000000;

  if (preset === "24h") {
    return { preset, count: 24, stepMs: 3600000, formatType: "hour", endMs: nowMs };
  }
  if (preset === "7d") {
    return { preset, count: 28, stepMs: 6 * 3600000, formatType: "datetime", endMs: nowMs };
  }
  if (preset === "30d") {
    return { preset, count: 30, stepMs: 86400000, formatType: "date", endMs: nowMs };
  }
  if (preset === "90d") {
    return { preset, count: 90, stepMs: 86400000, formatType: "date", endMs: nowMs };
  }
  if (preset === "custom") {
    const startMs = timeRange?.startDate ? new Date(timeRange.startDate).getTime() : nowMs - 7 * 86400000;
    const endMs = timeRange?.endDate ? new Date(timeRange.endDate + "T23:59:59").getTime() : nowMs;
    const diffMs = Math.max(86400000, endMs - startMs);
    const count = Math.max(4, Math.min(120, Math.round(diffMs / 86400000)));
    const stepMs = diffMs / count;
    return { preset, count, stepMs, formatType: "date", endMs };
  }

  return { preset: "24h", count: 24, stepMs: 3600000, formatType: "hour", endMs: nowMs };
}

export function formatTimestampLabel(timeMs: number, formatType: "hour" | "datetime" | "date"): string {
  const d = new Date(timeMs);
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  if (formatType === "hour") {
    return `${String(d.getHours()).padStart(2, "0")}:00`;
  }
  if (formatType === "datetime") {
    return `${months[d.getMonth()]} ${d.getDate()} ${String(d.getHours()).padStart(2, "0")}:00`;
  }
  return `${months[d.getMonth()]} ${d.getDate()}`;
}
