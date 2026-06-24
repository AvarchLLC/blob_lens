"use client";

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { blobCostUsd, formatUsd } from "@/lib/ethPrice";
import type { MarketHour } from "@/types";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

const GAS_PER_BLOB = 131_072;

interface Props {
  data: MarketHour[];
  ethUsd: number;
}

interface GridCell {
  hour: number;
  dayOffset: number;
  usd: number | null;
  avgFeeGwei: string;
  ts: string;
}

function costColor(usd: number, isDark: boolean): string {
  if (usd < 0.0001) return isDark ? "#1E2D45" : "#1A3A4A";
  if (usd < 0.001)  return isDark ? "#3D4F6B" : "#4A6A7A";
  if (usd < 0.01)   return "#10B981";
  if (usd < 0.10)   return "#F59E0B";
  return "#EF4444";
}

function dayLabel(now: Date, dayOffset: number): string {
  const d = new Date(now);
  d.setDate(now.getDate() - dayOffset);
  return d.toLocaleDateString("en-US", { month: "short", day: "2-digit" });
}

export function CostHeatmap({ data, ethUsd }: Props) {
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) return <div className="h-full w-full animate-pulse bg-surface-elevated rounded-md" />;

  const isDark = theme !== "light";
  const emptyColor = isDark ? "#111827" : "#E2E8F0";

  const now = new Date();
  const days = [6, 5, 4, 3, 2, 1, 0];

  const grid: GridCell[] = [];
  for (const dayOffset of days) {
    for (let hour = 0; hour < 24; hour++) {
      const d = new Date(now);
      d.setDate(now.getDate() - dayOffset);
      d.setHours(hour, 0, 0, 0);
      const match = data.find((m) => {
        const t = new Date(m.hour);
        return (
          t.getUTCFullYear() === d.getUTCFullYear() &&
          t.getUTCMonth()    === d.getUTCMonth()    &&
          t.getUTCDate()     === d.getUTCDate()     &&
          t.getUTCHours()    === d.getUTCHours()
        );
      });
      grid.push({
        dayOffset,
        hour,
        usd: match ? blobCostUsd(match.avg_fee, ethUsd) : null,
        avgFeeGwei: match && Number(match.avg_fee) > 0
          ? (Number(match.avg_fee) / 1e9).toFixed(5)
          : "—",
        ts: d.toISOString(),
      });
    }
  }

  return (
    <div className="space-y-3">
      <div className="w-full overflow-x-auto scrollbar-none pb-2">
        <div className="flex gap-2 min-w-[580px] sm:min-w-0">
          <div className="flex flex-col justify-between py-0.5" style={{ minWidth: "52px" }}>
            {days.map((dayOffset) => (
              <span key={dayOffset} className="text-[10px] leading-none text-text-secondary opacity-60">
                {dayLabel(now, dayOffset)}
              </span>
            ))}
          </div>

          <div className="flex-1">
            <TooltipProvider delayDuration={80}>
              <div
                className="grid gap-[3px]"
                style={{ gridTemplateColumns: "repeat(24, minmax(0, 1fr))", gridTemplateRows: "repeat(7, 14px)" }}
              >
                {grid.map((cell, i) => {
                  const color = cell.usd !== null ? costColor(cell.usd, isDark) : emptyColor;
                  const dateStr = new Date(cell.ts).toLocaleString("en-US", {
                    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
                  });

                  return (
                    <Tooltip key={i}>
                      <TooltipTrigger asChild>
                        <button
                          className="w-full rounded-sm focus:outline-none"
                          style={{
                            height: "14px",
                            backgroundColor: color,
                            opacity: cell.usd !== null ? 0.88 : 1,
                            border: "none",
                            cursor: "default",
                          }}
                        />
                      </TooltipTrigger>
                      <TooltipContent side="top" className="px-3 py-2 space-y-1 max-w-[200px]">
                        <p className="font-mono text-[11px] text-text-secondary">{dateStr}</p>
                        {cell.usd !== null ? (
                          <>
                            <p className="text-xs font-semibold text-text-primary">
                              {formatUsd(cell.usd)} / blob
                            </p>
                            <p className="font-mono text-[10px] text-text-secondary">
                              {cell.avgFeeGwei} gwei avg fee
                            </p>
                            <p className="text-[10px] text-text-secondary/60">
                              1 blob = {GAS_PER_BLOB.toLocaleString()} gas
                            </p>
                          </>
                        ) : (
                          <p className="text-[11px] text-text-secondary/50">No data</p>
                        )}
                      </TooltipContent>
                    </Tooltip>
                  );
                })}
              </div>
            </TooltipProvider>

            <div className="relative mt-1" style={{ height: "14px" }}>
              {[0, 6, 12, 18, 23].map((h) => (
                <span
                  key={h}
                  className="absolute text-[9px] text-text-secondary opacity-60"
                  style={{ left: `${(h / 23) * 100}%`, transform: "translateX(-50%)" }}
                >
                  {h}h
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4 flex-wrap">
        <p className="text-[10px] text-text-secondary opacity-60">Cost per blob (USD) · 7d × 24h</p>
        <div className="flex items-center gap-3 ml-auto flex-wrap">
          {[
            { color: isDark ? "#1E2D45" : "#1A3A4A", label: "< $0.0001" },
            { color: isDark ? "#3D4F6B" : "#4A6A7A", label: "< $0.001" },
            { color: "#10B981", label: "< $0.01" },
            { color: "#F59E0B", label: "< $0.10" },
            { color: "#EF4444", label: "> $0.10" },
          ].map(({ color, label }) => (
            <span key={label} className="flex items-center gap-1 text-[9px] text-text-secondary opacity-60">
              <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: color }} />
              {label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
