import { BlobsPerBlockChart } from "@/components/charts/BlobsPerBlockChart";
import { CumulativeBlobGrowth } from "@/components/charts/CumulativeBlobGrowth";
import { RegimeHeatmap } from "@/components/charts/RegimeHeatmap";
import { SlotUtilizationChart } from "@/components/charts/SlotUtilizationChart";
import { AppHeader } from "@/components/shared/AppHeader";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { getMarketActivity } from "@/lib/queries";
import { Activity, BarChart3, FlaskConical, TrendingUp } from "lucide-react";

export const revalidate = 60;

export default async function ResearchPage() {
  const market = await getMarketActivity(168).catch(() => []);

  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader active="research" />

      <main className="mx-auto w-full max-w-7xl flex-1 space-y-8 px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <FlaskConical className="h-5 w-5 text-[#10B981]" />
          <div>
            <h1 className="section-title text-foreground" style={{ fontSize: "1.125rem" }}>Research Data</h1>
            <p className="caption mt-0.5">Long-horizon metrics for academic and analytical use · 7-day window</p>
          </div>
        </div>

        <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2 text-sm text-[#9D93B8]">
                <TrendingUp className="h-4 w-4" />
                <h2 className="section-title">Cumulative Blob Growth</h2>
              </div>
            </CardHeader>
            <CardContent>
              <CumulativeBlobGrowth data={market} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2 text-sm text-[#9D93B8]">
                <BarChart3 className="h-4 w-4" />
                <h2 className="section-title">Slot Utilization</h2>
              </div>
            </CardHeader>
            <CardContent>
              <SlotUtilizationChart data={market} />
            </CardContent>
          </Card>
        </section>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2 text-sm text-[#9D93B8]">
              <Activity className="h-4 w-4" />
              <h2 className="section-title">Blobs per Block</h2>
            </div>
          </CardHeader>
          <CardContent>
            <BlobsPerBlockChart data={market} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="section-title">Regime Heatmap</h2>
          </CardHeader>
          <CardContent>
            <RegimeHeatmap data={market} />
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
