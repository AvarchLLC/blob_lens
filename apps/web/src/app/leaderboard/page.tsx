import { LeaderboardClient } from "@/app/leaderboard/LeaderboardClient";
import { AppHeader } from "@/components/shared/AppHeader";
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
    <div className="flex min-h-screen flex-col">
      <AppHeader active="leaderboard" />

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2 text-sm text-[#9D93B8]">
              <Trophy className="h-4 w-4" />
              <h2 className="section-title">Rollup Leaderboard</h2>
            </div>
          </CardHeader>
          <CardContent>
            <LeaderboardClient initialLeaderboard={initialLeaderboard} sparklines={sparklines} />
          </CardContent>
        </Card>

        <UnknownSendersSection senders={unknownSenders} />
      </main>
    </div>
  );
}
