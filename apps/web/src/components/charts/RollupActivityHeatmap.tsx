"use client";

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
    <div className="space-y-2">
      {days.map((day) => (
        <div key={day} className="grid grid-cols-[72px_1fr] items-center gap-2">
          <span className="text-xs text-[#9D93B8]">{day.slice(5)}</span>
          <div className="grid grid-cols-[repeat(24,minmax(0,1fr))] gap-1">
            {Array.from({ length: 24 }).map((_, h) => {
              const value = buckets.get(`${day}-${h}`) ?? 0;
              const alpha = value === 0 ? 0.08 : Math.max(0.18, value / max);
              return (
                <div
                  key={`${day}-${h}`}
                  className="h-3.5 rounded-sm"
                  style={{ backgroundColor: `rgba(138,79,216,${alpha})` }}
                  title={`${day} ${h}:00 UTC · ${value} blobs`}
                />
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
