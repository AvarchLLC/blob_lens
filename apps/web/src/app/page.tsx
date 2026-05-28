import { getOverviewStats, getLeaderboard, getForecastData, getMarketActivity } from "@/lib/queries";
import { LandingClient } from "@/components/landing/LandingClient";

export const revalidate = 60;

export default async function LandingPage() {
  const [stats, leaderboard, forecast, market] = await Promise.all([
    getOverviewStats().catch(() => ({ total_txs: 0, total_blobs: 0, rollup_count: 0, avg_utilization_24h: 0 })),
    getLeaderboard(24).catch(() => []),
    getForecastData().catch(() => null),
    getMarketActivity(1).catch(() => []),
  ]);

  return <LandingClient stats={stats} leaderboard={leaderboard} forecast={forecast} market={market} />;
}
