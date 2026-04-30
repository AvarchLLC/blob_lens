import { LeaderboardClient } from "@/app/leaderboard/LeaderboardClient";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { getLeaderboard, getRollupSparklines } from "@/lib/queries";
import { Trophy } from "lucide-react";
import Link from "next/link";

export const revalidate = 30;

export default async function LeaderboardPage() {
  const [initialLeaderboard, sparklines] = await Promise.all([
    getLeaderboard(24).catch(() => []),
    getRollupSparklines().catch(() => []),
  ]);

  return (
    <div className="flex flex-col flex-1">
      <header className="border-b border-border bg-card">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8 flex items-center justify-between">
          <Link
            href="/"
            className="text-lg font-bold text-foreground tracking-tight"
          >
            BlobLens
          </Link>
          <nav className="hidden sm:flex items-center gap-4 text-sm">
            <Link
              href="/"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Overview
            </Link>
            <Link href="/leaderboard" className="text-foreground font-medium">
              Leaderboard
            </Link>
            <Link
              href="/market"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Market
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1 mx-auto max-w-7xl w-full px-4 py-8 sm:px-6 lg:px-8">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2 text-base font-semibold text-foreground">
              <Trophy className="h-4 w-4 text-muted-foreground" />
              Rollup Leaderboard
            </div>
          </CardHeader>
          <CardContent>
            <LeaderboardClient
              initialLeaderboard={initialLeaderboard}
              sparklines={sparklines}
            />
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
