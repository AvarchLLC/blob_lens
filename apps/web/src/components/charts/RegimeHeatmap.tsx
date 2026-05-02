"use client";

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

interface GridCell {
  hour: number;
  dayOffset: number;
  regime: string | null;
  ts: string;
}

function dayLabel(now: Date, dayOffset: number): string {
  const d = new Date(now);
  d.setDate(now.getDate() - dayOffset);
  return d.toLocaleDateString("en-US", { month: "short", day: "2-digit" });
}

export function RegimeHeatmap({ data }: Props) {
  const now = new Date();
  // dayOffsets from 6 (oldest) → 0 (today), each row = one day, 24 cols = hours
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
          t.getUTCDate()     === d.getUTCDate()      &&
          t.getUTCHours()    === d.getUTCHours()
        );
      });
      grid.push({
        dayOffset,
        hour,
        regime: match ? classifyRegime(match.max_blobs_in_block) : null,
        ts: d.toISOString(),
      });
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        {/* Day labels column */}
        <div className="flex flex-col justify-between py-0.5" style={{ minWidth: "52px" }}>
          {days.map((dayOffset) => (
            <span key={dayOffset} className="caption leading-none" style={{ fontSize: "0.625rem" }}>
              {dayLabel(now, dayOffset)}
            </span>
          ))}
        </div>

        {/* Heatmap grid: 7 rows × 24 cols */}
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
                  backgroundColor: cell.regime ? regimeCell[cell.regime] : "#111827",
                  opacity: cell.regime ? 0.88 : 1,
                  border: "none",
                  outline: "none",
                  cursor: "default",
                }}
                title={`${new Date(cell.ts).toLocaleString()} · ${cell.regime ?? "no data"}`}
              />
            ))}
          </div>

          {/* Hour axis — 0h, 6h, 12h, 18h, 23h */}
          <div className="relative mt-1" style={{ height: "14px" }}>
            {[0, 6, 12, 18, 23].map((h) => (
              <span
                key={h}
                className="absolute caption"
                style={{
                  left: `${(h / 23) * 100}%`,
                  transform: "translateX(-50%)",
                  fontSize: "0.575rem",
                }}
              >
                {h}h
              </span>
            ))}
          </div>
        </div>
      </div>

      <p className="caption">
        24h × 7d regime heatmap &mdash; Data from April 29, grows daily
      </p>
    </div>
  );
}
