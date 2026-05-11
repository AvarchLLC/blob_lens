import { LeaderboardClient } from "@/app/leaderboard/LeaderboardClient";
import { UnknownSendersSection } from "@/components/shared/UnknownSendersSection";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { getLeaderboard, getRollupSparklines, getUnknownSenders } from "@/lib/queries";
import { Trophy } from "lucide-react";

export const revalidate = 30;

export default async function LeaderboardPage() {
  const [initialLeaderboard, sparklines, unknownSenders] = await Promise.all([
    getLeaderboard(24).catch(() => []),
    getRollupSparklines().catch(() => []),
    getUnknownSenders().catch(() => []),
  ]);

  return (
    <div className="page-root py-8 space-y-6">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h1 className="topbar-title">Leaderboard</h1>
          <p className="topbar-sub">Rollup activity rankings</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Trophy className="h-4 w-4" />
            <h2 className="section-title">Rollup Leaderboard</h2>
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
