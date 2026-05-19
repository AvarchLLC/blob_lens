import { BlockFeed } from "@/components/shared/BlockFeed";
import { InfoTooltip } from "@/components/shared/InfoTooltip";
import { LiveBlobFeed } from "@/components/shared/LiveBlobFeed";
import { RegimeBadge } from "@/components/shared/RegimeBadge";
import { PageHeader, PageSection } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getMarketActivity } from "@/lib/queries";
import { BarChart2, Layers, Activity } from "lucide-react";
import { LiveStats } from "./LiveStats";

export const revalidate = 0;

export default async function LivePage() {
  const market1h = await getMarketActivity(1).catch(() => []);
  const latestHour = market1h[market1h.length - 1];

  return (
    <div className="animate-page-in">
      <PageHeader
        meta="Monitoring"
        title="Live Stream"
        summary="Real-time observability of Ethereum's EIP-4844 activity. Monitor block-by-block blob production, transaction flow, and network-wide stats."
      >
        <div className="flex items-center gap-3">
          <div className="px-4 py-2 surface border border-border flex items-center gap-2">
            <span className="pulse-dot" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-status-healthy">Live Feed</span>
          </div>
          <RegimeBadge maxBlobsInBlock={latestHour?.max_blobs_in_block ?? 0} size="lg" />
        </div>
      </PageHeader>

      <PageSection
        label="Observability"
        title="Blob Activity Stream"
        description="Real-time stream of Ethereum blocks and transactions containing EIP-4844 blobs."
        interpretation="This feed is polled every 12 seconds directly from the BlobLens indexer. Switch to 'Stats' for an aggregated real-time summary of the current hour."
      >
        <Tabs defaultValue="blocks" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6 bg-surface-elevated">
            <TabsTrigger value="blocks">Blocks</TabsTrigger>
            <TabsTrigger value="transactions">Transactions</TabsTrigger>
            <TabsTrigger value="stats" className="flex items-center gap-2">
              <BarChart2 className="h-3.5 w-3.5" />
              Stats
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="blocks" className="mt-0 animate-fade-up">
            <div className="h-[600px] overflow-y-auto custom-scrollbar">
              <BlockFeed />
            </div>
          </TabsContent>
          
          <TabsContent value="transactions" className="mt-0 animate-fade-up">
            <div className="h-[600px] overflow-y-auto custom-scrollbar">
              <LiveBlobFeed />
            </div>
          </TabsContent>
          
          <TabsContent value="stats" className="mt-0 animate-fade-up">
            <LiveStats />
          </TabsContent>
        </Tabs>
      </PageSection>

      <div className="mt-8 flex items-center justify-center gap-2">
        <Activity className="h-3 w-3 text-text-secondary opacity-50" />
        <span className="text-[10px] uppercase font-bold tracking-widest text-text-secondary opacity-50">
          Connected to Alchemy · Lodestar Mainnet
        </span>
      </div>
    </div>
  );
}
