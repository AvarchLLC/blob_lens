'use client';

import Link from 'next/link';
import { RollupBadge } from '@/components/shared/RollupBadge';
import { BlobSparkline } from '@/components/charts/BlobSparkline';
import type { LeaderboardRow, SparklinePoint } from '@/types';
import { ArrowRight } from 'lucide-react';

interface Props {
  leaderboard: LeaderboardRow[];
  sparklines: SparklinePoint[];
}

const TIER_COLOR: Record<string, string> = {
  excellent: 'var(--status-healthy)',
  good: 'var(--status-warning)',
  poor: 'var(--status-critical)',
};

function tier(score: number): string {
  if (score >= 70) return 'excellent';
  if (score >= 40) return 'good';
  return 'poor';
}

export function EfficiencyLeaderboardMini({ leaderboard, sparklines }: Props) {
  const top5 = [...leaderboard]
    .filter((r) => r.rollup !== 'UNKNOWN' && Number(r.total_blobs) > 0)
    .sort((a, b) => Number(b.efficiency_score) - Number(a.efficiency_score))
    .slice(0, 5);

  if (!top5.length) {
    return <p className="py-8 text-center text-xs text-text-secondary italic opacity-50">No efficiency data available.</p>;
  }

  // Build sparkline map
  const sparkMap = new Map<string, SparklinePoint[]>();
  for (const sp of sparklines) {
    const arr = sparkMap.get(sp.rollup) ?? [];
    arr.push(sp);
    sparkMap.set(sp.rollup, arr);
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h4 className="text-[10px] font-bold uppercase tracking-widest text-text-secondary opacity-60">
          Top Performers
        </h4>
        <Link
          href="/leaderboard"
          className="flex items-center gap-1 text-[10px] font-bold text-primary hover:text-primary-hover transition-colors uppercase tracking-wider"
        >
          Full Rankings <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      {/* Table */}
      <div className="space-y-1">
        {top5.map((row, idx) => {
          const eff = Number(row.efficiency_score);
          const t = tier(eff);
          const costGwei = Number(row.cost_per_blob_gwei);
          const spark = sparkMap.get(row.rollup) ?? [];

          return (
            <div
              key={row.rollup}
              className="flex items-center gap-3 py-2.5 px-3 rounded-lg hover:bg-surface-elevated/50 transition-colors group"
            >
              {/* Rank */}
              <span className="text-[10px] font-bold text-text-secondary opacity-40 w-4 text-center">
                {idx + 1}
              </span>

              {/* Rollup */}
              <div className="flex-1 min-w-0">
                <RollupBadge rollup={row.rollup} linkable />
              </div>

              {/* Sparkline */}
              {spark.length > 1 && (
                <div className="hidden sm:block w-16 h-6 opacity-60 group-hover:opacity-100 transition-opacity">
                  <BlobSparkline points={spark} />
                </div>
              )}

              {/* Cost */}
              <div className="text-right hidden md:block">
                <p className="font-mono text-[11px] font-bold text-text-primary">
                  {costGwei < 0.001 ? costGwei.toPrecision(2) : costGwei.toFixed(3)}
                </p>
                <p className="text-[8px] text-text-secondary opacity-40 uppercase">Gwei/blob</p>
              </div>

              {/* Score */}
              <div
                className="flex items-center justify-center h-8 w-12 rounded-md font-mono text-sm font-bold"
                style={{
                  backgroundColor: `color-mix(in srgb, ${TIER_COLOR[t]} 12%, transparent)`,
                  color: TIER_COLOR[t],
                }}
              >
                {eff.toFixed(0)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
