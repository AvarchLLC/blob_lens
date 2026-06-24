"use client";

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { classifyRegime } from "@/lib/utils";
import type { MarketHour } from "@/types";

interface Props {
  data: MarketHour[];
}

const regimeCell: Record<string, string> = {
  undersaturated: "#3D4F6B",
  healthy:        "#10B981",
  congested:      "#F59E0B",
  spike:          "#EF4444",
};

const regimeLabel: Record<string, string> = {
  undersaturated: "Quiet",
  healthy:        "Healthy",
  congested:      "Congested",
  spike:          "Spike",
};

interface GridCell {
  hour: number;
  dayOffset: number;
  regime: string | null;
  ts: string;
  maxBlobs: number;
  utilization: number;
  avgFeeGwei: string;
}

function dayLabel(now: Date, dayOffset: number): string {
  const d = new Date(now);
  d.setDate(now.getDate() - dayOffset);
  return d.toLocaleDateString("en-US", { month: "short", day: "2-digit" });
}

export function RegimeHeatmap({ data, daysCount = 7 }: Props & { daysCount?: number }) {
  const now = new Date();
  const days = Array.from({ length: daysCount }, (_, i) => daysCount - 1 - i);

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
          t.getUTCDate()     === d.getUTCDate()      &&
          t.getUTCHours()    === d.getUTCHours()
        );
      });
      grid.push({
        dayOffset,
        hour,
        regime: match ? classifyRegime(match.max_blobs_in_block) : null,
        ts: d.toISOString(),
        maxBlobs: match?.max_blobs_in_block ?? 0,
        utilization: match ? Number(match.avg_utilization) : 0,
        avgFeeGwei: match && Number(match.avg_fee) > 0
          ? (Number(match.avg_fee) / 1e9).toFixed(5)
          : "—",
      });
    }
  }

  return (
    <div className="space-y-3">
      <div className="w-full overflow-x-auto scrollbar-none pb-2">
        <div className="flex gap-2 min-w-[580px] sm:min-w-0">
          <div className="flex flex-col justify-between py-0.5" style={{ minWidth: "52px" }}>
            {days.map((dayOffset) => (
              <span key={dayOffset} className="caption leading-none" style={{ fontSize: "0.625rem" }}>
                {dayLabel(now, dayOffset)}
              </span>
            ))}
          </div>

          <div className="flex-1">
            <TooltipProvider delayDuration={80}>
              <div
                className="grid gap-[3px]"
                style={{ gridTemplateColumns: "repeat(24, minmax(0, 1fr))", gridTemplateRows: `repeat(${daysCount}, 14px)` }}
              >
                {grid.map((cell, i) => {
                  const color = cell.regime ? regimeCell[cell.regime] : "#111827";
                  const label = cell.regime ? regimeLabel[cell.regime] : null;
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
                            opacity: cell.regime ? 0.88 : 1,
                            border: "none",
                            cursor: "default",
                          }}
                        />
                      </TooltipTrigger>
                      <TooltipContent side="top" className="px-3 py-2 space-y-1 max-w-[200px]">
                        <p className="font-mono text-[11px] text-muted-foreground">{dateStr}</p>
                        {label ? (
                          <>
                            <p className="text-xs font-semibold" style={{ color }}>
                              {label}
                            </p>
                            <p className="font-mono text-[10px] text-muted-foreground">
                              {cell.maxBlobs} blobs/block · {cell.utilization.toFixed(1)}% util
                            </p>
                            <p className="font-mono text-[10px] text-muted-foreground">
                              {cell.avgFeeGwei} gwei avg fee
                            </p>
                          </>
                        ) : (
                          <p className="text-[11px] text-muted-foreground/50">No data</p>
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
                  className="absolute caption"
                  style={{ left: `${(h / 23) * 100}%`, transform: "translateX(-50%)", fontSize: "0.575rem" }}
                >
                  {h}h
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 flex-wrap">
        <p className="caption">24h × {daysCount}d regime heatmap</p>
        <div className="flex items-center gap-3 ml-auto flex-wrap">
          {[
            { label: "Quiet",     color: "#3D4F6B" },
            { label: "Healthy",   color: "#10B981" },
            { label: "Congested", color: "#F59E0B" },
            { label: "Spike",     color: "#EF4444" },
          ].map(({ label, color }) => (
            <span key={label} className="flex items-center gap-1 caption" style={{ fontSize: "0.575rem" }}>
              <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: color }} />
              {label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
