import { LeaderboardClient } from "@/app/leaderboard/LeaderboardClient";
import { InfoTooltip } from "@/components/shared/InfoTooltip";
import { RollupBadge } from "@/components/shared/RollupBadge";
import { UnknownSendersSection } from "@/components/shared/UnknownSendersSection";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { getLeaderboard, getRollupSparklines, getUnknownSenders } from "@/lib/queries";
import { Gauge, Trophy, Zap } from "lucide-react";

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
    <div className="page-root py-8 space-y-6">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h1 className="topbar-title">Leaderboard</h1>
          <p className="topbar-sub">Rollup activity rankings</p>
        </div>
      </div>

      {/* DA Efficiency spotlight */}
      {top3Efficient.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <h2 className="section-title">Top DA Efficiency (24h)</h2>
            <InfoTooltip
              content="Composite score (0–100) measuring how cost-efficiently each rollup submits blobs. Formula: 70% blob packing score + 30% timing score. Packing = average blobs per transaction vs the 6-blob maximum. Timing = how cheaply they submit relative to the network average fee for the period. A score of 80+ is excellent."
              side="bottom"
            />
          </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {top3Efficient.map((row, idx) => {
            const score = Number(row.efficiency_score);
            const packing = Number(row.packing_score);
            const timing = Number(row.timing_score);
            const color = score >= 80 ? "#00df81" : score >= 50 ? "#fcbb00" : "#f97316";
            const bg    = score >= 80 ? "rgba(0,223,129,0.08)" : score >= 50 ? "rgba(252,187,0,0.08)" : "rgba(249,115,22,0.08)";
            const medal = idx === 0 ? "🥇" : idx === 1 ? "🥈" : "🥉";
            return (
              <Card key={row.rollup} variant="bordered" className="p-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-1.5">
                      <span className="text-base leading-none">{medal}</span>
                      <RollupBadge rollup={row.rollup} linkable />
                    </div>
                    <p className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground font-medium flex items-center gap-1">
                      <Zap className="h-2.5 w-2.5" /> DA Efficiency
                    </p>
                  </div>
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold shrink-0"
                    style={{ background: bg, color, border: `1px solid ${color}33` }}
                  >
                    {score.toFixed(0)}
                  </div>
                </div>
                <div className="mt-3 space-y-1.5">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <Gauge className="h-2.5 w-2.5" /> Packing
                    </span>
                    <span className="font-mono font-semibold" style={{ color }}>{packing.toFixed(0)}%</span>
                  </div>
                  <div className="h-1 w-full overflow-hidden rounded-full bg-[#1E2D45]">
                    <div className="h-full rounded-full transition-all" style={{ width: `${packing}%`, backgroundColor: color }} />
                  </div>
                  <div className="flex items-center justify-between text-[10px] pt-0.5">
                    <span className="text-muted-foreground">Timing score</span>
                    <span className="font-mono font-semibold text-foreground">{timing.toFixed(0)}/100</span>
                  </div>
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-muted-foreground">Cost/blob</span>
                    <span className="font-mono text-foreground">{Number(row.cost_per_blob_gwei).toFixed(3)} gwei</span>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
        </div>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Trophy className="h-4 w-4" />
            <h2 className="section-title">Rollup Leaderboard</h2>
            <InfoTooltip
              content="Ranks rollups by total blobs submitted in the selected time window. Click any column header to re-sort. Packing score measures how full each transaction was (higher = more efficient). Efficiency combines packing + timing. Click a row to drill into per-rollup analytics."
              side="bottom"
            />
          </div>
        </CardHeader>
        <CardContent>
          <LeaderboardClient initialLeaderboard={initialLeaderboard} sparklines={sparklines} />
        </CardContent>
      </Card>

      <UnknownSendersSection senders={unknownSenders} />
    </div>
  );
}
