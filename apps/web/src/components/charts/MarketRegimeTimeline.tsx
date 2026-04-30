"use client";

import { classifyRegime } from "@/lib/utils";
import type { MarketHour } from "@/types";

const REGIME_COLOR: Record<string, string> = {
  undersaturated: "#3D3D4E",
  healthy: "#1A8C6A",
  congested: "#C4822A",
  spike: "#C0394A",
};

interface Props {
  data: MarketHour[];
}

export function MarketRegimeTimeline({ data }: Props) {
  if (!data.length)
    return <p className="py-4 text-center text-sm text-muted-foreground">No data</p>;

  return (
    <div className="flex w-full h-6 gap-px rounded overflow-hidden" title="Regime timeline (left = oldest)">
      {data.map((d, i) => {
        const regime = classifyRegime(d.max_blobs_in_block);
        return (
          <div
            key={i}
            className="flex-1"
            style={{ backgroundColor: REGIME_COLOR[regime], opacity: 0.85 }}
            title={`${d.hour} — ${regime} (max ${d.max_blobs_in_block} blobs)`}
          />
        );
      })}
    </div>
  );
}
