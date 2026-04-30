"use client";

import { classifyRegime } from "@/lib/utils";
import type { MarketHour } from "@/types";

interface Props {
  data: MarketHour[];
}

const regimeCell: Record<string, string> = {
  undersaturated: "#3D3D4E",
  healthy: "#1A8C6A",
  congested: "#C4822A",
  spike: "#C0394A",
};

interface GridCell {
  hour: number;
  dayOffset: number;
  regime: string | null;
  ts: string;
}

export function RegimeHeatmap({ data }: Props) {
  const now = new Date();
  const grid: GridCell[] = [];

  for (let dayOffset = 6; dayOffset >= 0; dayOffset--) {
    for (let hour = 0; hour < 24; hour++) {
      const d = new Date(now);
      d.setDate(now.getDate() - dayOffset);
      d.setHours(hour, 0, 0, 0);
      const match = data.find((m) => {
        const t = new Date(m.hour);
        return (
          t.getUTCFullYear() === d.getUTCFullYear() &&
          t.getUTCMonth() === d.getUTCMonth() &&
          t.getUTCDate() === d.getUTCDate() &&
          t.getUTCHours() === d.getUTCHours()
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
      <div className="grid grid-cols-[repeat(24,minmax(0,1fr))] gap-1">
        {grid.map((cell, i) => (
          <button
            key={i}
            className="h-3.5 w-full rounded-sm"
            style={{
              backgroundColor: cell.regime ? regimeCell[cell.regime] : "#1A1A1A",
              opacity: cell.regime ? 0.9 : 1,
            }}
            title={`${new Date(cell.ts).toLocaleString()} · ${cell.regime ?? "no data"}`}
          />
        ))}
      </div>
      <p className="text-xs text-[#5C5575]">
        24h × 7d regime heatmap &mdash; Data from April 29, grows daily
      </p>
    </div>
  );
}
