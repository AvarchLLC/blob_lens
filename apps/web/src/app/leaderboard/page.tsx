import { LeaderboardClient } from "@/app/leaderboard/LeaderboardClient";
import { RollupBadge } from "@/components/shared/RollupBadge";
import { UnknownSendersSection } from "@/components/shared/UnknownSendersSection";
import { PageHeader, PageSection } from "@/components/shared/PageHeader";
import { getLeaderboard, getRollupSparklines, getUnknownSenders } from "@/lib/queries";
import { Trophy } from "lucide-react";

export const revalidate = 30;

export default async function LeaderboardPage() {
  const [initialLeaderboard, sparklines, unknownSenders] = await Promise.all([
    getLeaderboard(24).catch(() => []),
    getRollupSparklines().catch(() => []),
    getUnknownSenders().catch(() => []),
  ]);

  const top3Efficient = [...initialLeaderboard]
    .filter((r) => r.rollup !== "UNKNOWN" && Number(r.total_blobs) > 0)
    .sort((a, b) => Number(b.efficiency_score) - Number(a.efficiency_score))
    .slice(0, 3);

  return (
    <div className="animate-page-in">
      <PageHeader
        meta="Leaderboard"
        title="Protocol Efficiency"
        summary="Rollup activity rankings based on blob volume, batching efficiency, and market timing accuracy. Data represents the last 24 hours of on-chain submissions."
      />

      {/* DA Efficiency spotlight */}
      {top3Efficient.length > 0 && (
        <div className="mb-12">
          <div className="flex items-center gap-2 mb-6">
            <Trophy className="h-4 w-4 text-primary" />
            <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-text-secondary opacity-60">Top DA Performers (24h)</h2>
          </div>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {top3Efficient.map((row, idx) => {
              const score = Number(row.efficiency_score);
              const packing = Number(row.packing_score);
              const timing = Number(row.timing_score);
              const color = score >= 80 ? "var(--status-healthy)" : score >= 50 ? "var(--status-warning)" : "var(--status-critical)";
              const medal = idx === 0 ? "🥇" : idx === 1 ? "🥈" : "🥉";
              
              return (
                <div key={row.rollup} className="surface-elevated p-6 border-l-2" style={{ borderLeftColor: color }}>
                  <div className="flex items-start justify-between mb-6">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{medal}</span>
                        <RollupBadge rollup={row.rollup} linkable />
                      </div>
                      <p className="text-[9px] uppercase font-bold tracking-widest text-text-secondary opacity-50">Efficiency Tier</p>
                    </div>
                    <div className="font-mono text-2xl font-bold tracking-tighter" style={{ color }}>
                      {score.toFixed(0)}
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider text-text-secondary opacity-60">
                        <span>Packing</span>
                        <span style={{ color }}>{packing.toFixed(0)}%</span>
                      </div>
                      <div className="h-1 w-full bg-surface rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all" style={{ width: `${packing}%`, backgroundColor: color }} />
                      </div>
                    </div>
                    
                    <div className="pt-2 border-t border-border/50 flex justify-between items-center text-[10px] font-bold">
                       <span className="text-text-secondary opacity-50 uppercase tracking-wider">Timing Accuracy</span>
                       <span className="text-text-primary">{timing.toFixed(0)}/100</span>
                    </div>
                    <div className="flex justify-between items-center text-[10px] font-bold">
                       <span className="text-text-secondary opacity-50 uppercase tracking-wider">Avg Cost / Blob</span>
                       <span className="text-text-primary font-mono">{Number(row.cost_per_blob_gwei).toFixed(3)} G</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <PageSection
        label="Rankings"
        title="Rollup Leaderboard"
        description="Global rankings by total blob volume and DA performance metrics."
        interpretation="Packing score measures how well rollups utilize the 6-blob tx limit. Timing score reflects ability to batch during low-fee windows."
        noPadding
      >
        <div className="min-h-[600px]">
          <LeaderboardClient initialLeaderboard={initialLeaderboard} sparklines={sparklines} />
        </div>
      </PageSection>

      <div className="mt-12">
        <UnknownSendersSection senders={unknownSenders} />
      </div>
    </div>
  );
}
