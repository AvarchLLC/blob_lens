import { getOverviewStats } from "@/lib/queries";
import { LandingClient } from "@/components/landing/LandingClient";

export const revalidate = 3600;

export default async function LandingPage() {
  const stats = await getOverviewStats().catch(() => ({
    total_txs: 0, total_blobs: 0, rollup_count: 0, avg_utilization_24h: 0,
  }));

  return <LandingClient stats={stats} />;
}
