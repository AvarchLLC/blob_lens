"use client";

import { classifyRegime } from "@/lib/utils";
import type { MarketHour } from "@/types";

const REGIME_COLOR: Record<string, string> = {
  undersaturated: "#52666E",
  healthy:        "#00A86B",
  congested:      "#E8A020",
  spike:          "#E5484D",
};

interface Props {
  data: MarketHour[];
}

export function MarketRegimeTimeline({ data }: Props) {
  if (!data.length)
    return <p className="py-4 text-center text-sm text-text-secondary italic">No regime timeline data available</p>;

  return (
    <div className="w-full">
      {/* Timeline blocks */}
      <div className="flex w-full h-6 gap-0.5" title="Regime timeline (left = oldest)">
        {data.map((d, i) => {
          const regime = classifyRegime(d.max_blobs_in_block);
          return (
            <div
              key={i}
              className="flex-1 rounded-[3px] transition-all duration-300 hover:scale-y-110"
              style={{ backgroundColor: REGIME_COLOR[regime], opacity: 0.85 }}
              title={`${d.hour} — ${regime} (max ${d.max_blobs_in_block} blobs)`}
            />
          );
        })}
      </div>

      {/* Timeline Legend */}
      <div className="flex flex-wrap items-center gap-4 mt-2.5">
        {[
          { label: 'Undersaturated', color: '#52666E' },
          { label: 'Healthy', color: '#00A86B' },
          { label: 'Congested', color: '#E8A020' },
          { label: 'Spike', color: '#E5484D' },
        ].map(({ label, color }) => (
          <div key={label} className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: color }} />
            <span className="section-label font-bold text-[10px] leading-none" style={{ color: 'var(--text-secondary)' }}>
              {label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
