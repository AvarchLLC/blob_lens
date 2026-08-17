"use client";

import React, { useMemo } from "react";
import { cn } from "@/lib/utils";
import type { DateRangeState } from "@/components/shared/time-range-picker";
import { getTimeRangeBounds, formatTimestampLabel } from "@/lib/telemetry-data";

export interface TimelineHour {
  timestamp: string;
  maxBlobsInBlock: number;
  avgFeeGwei?: number;
}

const REGIME_CONFIG = {
  undersaturated: { label: "Quiet (≤2)", color: "bg-[#64748B] dark:bg-[#64748B]", textColor: "text-[#64748B]" },
  healthy: { label: "Healthy (3)", color: "bg-[#059669] dark:bg-[#10B981]", textColor: "text-[#059669] dark:text-[#10B981]" },
  congested: { label: "Congested (4-5)", color: "bg-[#D97706] dark:bg-[#F59E0B]", textColor: "text-[#D97706] dark:text-[#F59E0B]" },
  spike: { label: "Spike (≥6)", color: "bg-[#DC2626] dark:bg-[#EF4444]", textColor: "text-[#DC2626] dark:text-[#EF4444]" },
};

function classifyRegime(maxBlobs: number): keyof typeof REGIME_CONFIG {
  if (maxBlobs <= 2) return "undersaturated";
  if (maxBlobs === 3) return "healthy";
  if (maxBlobs <= 5) return "congested";
  return "spike";
}

interface RegimeTimelineProps {
  hours?: TimelineHour[];
  timeRange?: DateRangeState;
}

export function RegimeTimeline({ hours: customHours, timeRange }: RegimeTimelineProps) {
  const hours = useMemo(() => {
    if (customHours) return customHours;

    const bounds = getTimeRangeBounds(timeRange);
    const result: TimelineHour[] = [];
    const count = Math.min(32, bounds.count);

    for (let i = count; i >= 0; i--) {
      const timeMs = bounds.endMs - i * bounds.stepMs;
      const label = formatTimestampLabel(timeMs, bounds.formatType);
      const maxBlobs = Math.min(
        6,
        Math.max(1, Math.floor(1 + Math.abs(Math.sin(i / 2.2) * 5.5)))
      );

      result.push({
        timestamp: label,
        maxBlobsInBlock: maxBlobs,
        avgFeeGwei: Number((0.001 + Math.abs(Math.sin(i / 3)) * 0.1).toFixed(4)),
      });
    }
    return result;
  }, [customHours, timeRange]);

  const presetLabel = (timeRange?.preset || "24h").toUpperCase();

  return (
    <div className="flex flex-col gap-3 w-full">
      {/* Telemetry Strip */}
      <div className="flex h-7 w-full gap-0.5 rounded-[6px] overflow-hidden p-0.5 bg-[var(--surface-sunken)] border border-dashed border-[var(--border)]">
        {hours.map((h, i) => {
          const regimeKey = classifyRegime(h.maxBlobsInBlock);
          const config = REGIME_CONFIG[regimeKey];
          return (
            <div
              key={i}
              title={`${h.timestamp} | Regime: ${regimeKey.toUpperCase()} (Max ${h.maxBlobsInBlock} blobs/block)`}
              className={cn(
                "flex-1 h-full cursor-pointer transition-all hover:scale-y-110 hover:z-10 rounded-[1px]",
                config.color
              )}
            />
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] font-mono text-[var(--text-secondary)]">
        <span className="uppercase tracking-wider font-semibold text-[var(--text-primary)]">
          {presetLabel} Market State Timeline
        </span>
        <div className="flex items-center gap-3">
          {Object.entries(REGIME_CONFIG).map(([key, cfg]) => (
            <div key={key} className="flex items-center gap-1.5">
              <span className={cn("w-2 h-2 rounded-[1px]", cfg.color)} />
              <span className="capitalize text-[var(--text-secondary)]">{cfg.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
