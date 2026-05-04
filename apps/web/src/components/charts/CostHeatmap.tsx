"use client";

import { blobCostUsd, formatUsd } from "@/lib/ethPrice";
import type { MarketHour } from "@/types";

const GAS_PER_BLOB = 131_072;

interface Props {
  data: MarketHour[];
  ethUsd: number;
}

function costColor(usd: number): string {
  if (usd < 0.0001) return "#1E2D45";
  if (usd < 0.001)  return "#3D4F6B";
  if (usd < 0.01)   return "#10B981";
  if (usd < 0.10)   return "#F59E0B";
  return "#EF4444";
}

function dayLabel(now: Date, dayOffset: number): string {
  const d = new Date(now);
  d.setDate(now.getDate() - dayOffset);
  return d.toLocaleDateString("en-US", { month: "short", day: "2-digit" });
}

interface GridCell {
  hour: number;
  dayOffset: number;
  usd: number | null;
  ts: string;
}

export function CostHeatmap({ data, ethUsd }: Props) {
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
        ts: d.toISOString(),
      });
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <div className="flex flex-col justify-between py-0.5" style={{ minWidth: "52px" }}>
          {days.map((dayOffset) => (
            <span key={dayOffset} className="caption leading-none" style={{ fontSize: "0.625rem" }}>
              {dayLabel(now, dayOffset)}
            </span>
          ))}
        </div>

        <div className="flex-1">
          <div
            className="grid gap-[3px]"
            style={{ gridTemplateColumns: "repeat(24, minmax(0, 1fr))", gridTemplateRows: "repeat(7, 14px)" }}
          >
            {grid.map((cell, i) => (
              <button
                key={i}
                className="w-full rounded-sm"
                style={{
                  height: "14px",
                  backgroundColor: cell.usd !== null ? costColor(cell.usd) : "#111827",
                  opacity: cell.usd !== null ? 0.88 : 1,
                  border: "none",
                  outline: "none",
                  cursor: "default",
                }}
                title={
                  cell.usd !== null
                    ? `${new Date(cell.ts).toLocaleString()} · ${formatUsd(cell.usd)} / blob`
                    : `${new Date(cell.ts).toLocaleString()} · no data`
                }
              />
            ))}
          </div>

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

      <div className="flex items-center gap-4">
        <p className="caption">Cost per blob (USD) · 7d × 24h</p>
        <div className="flex items-center gap-3 ml-auto">
          {[
            { color: "#1E2D45", label: "< $0.0001" },
            { color: "#3D4F6B", label: "< $0.001" },
            { color: "#10B981", label: "< $0.01" },
            { color: "#F59E0B", label: "< $0.10" },
            { color: "#EF4444", label: "> $0.10" },
          ].map(({ color, label }) => (
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
