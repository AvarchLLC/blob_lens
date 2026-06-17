"use client";

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { BlobTransaction } from "@/types";

interface Props {
  txs: BlobTransaction[];
}

export function RollupActivityHeatmap({ txs }: Props) {
  if (!txs.length) return <p className="py-8 text-center text-sm text-muted-foreground">No data</p>;

  const buckets = new Map<string, number>();
  for (const tx of txs) {
    const d = new Date(tx.created_at);
    const day = d.toISOString().slice(0, 10);
    const hour = d.getUTCHours();
    const key = `${day}-${hour}`;
    buckets.set(key, (buckets.get(key) ?? 0) + Number(tx.num_blobs));
  }

  const max = Math.max(...buckets.values(), 1);
  const days = [...new Set(txs.map((t) => t.created_at.slice(0, 10)))].sort().slice(-7);

  return (
    <TooltipProvider delayDuration={80}>
      <div className="space-y-2">
        {days.map((day) => (
          <div key={day} className="grid grid-cols-[72px_1fr] items-center gap-2">
            <span className="text-xs text-[#9D93B8]">{day.slice(5)}</span>
            <div className="grid grid-cols-[repeat(24,minmax(0,1fr))] gap-1">
              {Array.from({ length: 24 }).map((_, h) => {
                const value = buckets.get(`${day}-${h}`) ?? 0;
                const alpha = value === 0 ? 0.08 : Math.max(0.18, value / max);
                const pctOfPeak = max > 0 ? Math.round((value / max) * 100) : 0;

                return (
                  <Tooltip key={`${day}-${h}`}>
                    <TooltipTrigger asChild>
                      <div
                        className="h-3.5 rounded-sm cursor-default"
                        style={{ backgroundColor: `rgba(0,167,181,${alpha})` }}
                      />
                    </TooltipTrigger>
                    <TooltipContent side="top" className="px-3 py-2 space-y-1 max-w-[180px]">
                      <p className="font-mono text-[11px] text-muted-foreground">
                        {day} · {String(h).padStart(2, "0")}:00 UTC
                      </p>
                      {value > 0 ? (
                        <>
                          <p className="text-xs font-semibold text-foreground">
                            {value} blob{value !== 1 ? "s" : ""}
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            {pctOfPeak}% of peak activity this week
                          </p>
                        </>
                      ) : (
                        <p className="text-[11px] text-muted-foreground/50">No blobs this hour</p>
                      )}
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </div>
          </div>
        ))}

        {/* Hour axis */}
        <div className="grid grid-cols-[72px_1fr] gap-2">
          <div />
          <div className="relative" style={{ height: "14px" }}>
            {[0, 6, 12, 18, 23].map((h) => (
              <span
                key={h}
                className="absolute text-[0.575rem] text-muted-foreground/50"
                style={{ left: `${(h / 23) * 100}%`, transform: "translateX(-50%)" }}
              >
                {h}h
              </span>
            ))}
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
