import { Suspense } from "react";
import { LeaderboardClient } from "./leaderboard-client";

export const metadata = {
  title: "Rollup Leaderboard | BlobLens",
  description:
    "Ranked DA efficiency scores for all tracked Ethereum rollups — packing efficiency, timing score, coordination, cost per blob, and network share.",
};

export default function LeaderboardPage() {
  return (
    <main className="px-4 sm:px-6 pb-16">
      <Suspense fallback={
        <div className="flex items-center justify-center h-48 font-mono text-xs text-[var(--text-muted)] animate-pulse tracking-widest">
          [ LOADING LEADERBOARD... ]
        </div>
      }>
        <LeaderboardClient />
      </Suspense>
    </main>
  );
}
