"use client";

import { classifyRegime } from "@/lib/utils";
import type { MarketHour } from "@/types";

const REGIME_BG: Record<string, string> = {
  undersaturated: "bg-slate-600",
  healthy: "bg-emerald-500",
  congested: "bg-amber-500",
  spike: "bg-red-500",
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
            className={`flex-1 ${REGIME_BG[regime]}`}
            title={`${d.hour} — ${regime} (max ${d.max_blobs_in_block} blobs)`}
          />
        );
      })}
    </div>
  );
}
