import { BlockFeed } from "@/components/shared/BlockFeed";
import { InfoTooltip } from "@/components/shared/InfoTooltip";
import { LiveBlobFeed } from "@/components/shared/LiveBlobFeed";
import { RegimeBadge } from "@/components/shared/RegimeBadge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getMarketActivity } from "@/lib/queries";
import { BarChart2, Layers } from "lucide-react";
import { LiveStats } from "./LiveStats";

export const revalidate = 0;

export default async function LivePage() {
  const market1h = await getMarketActivity(1).catch(() => []);
  const latestHour = market1h[market1h.length - 1];

  return (
    <div className="page-root py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="topbar-title">Live Feed</h1>
          <p className="topbar-sub">Real-time EIP-4844 blob activity · Ethereum mainnet</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 caption text-[#10B981]">
            <span className="pulse-dot" />
            live
          </span>
          <RegimeBadge maxBlobsInBlock={latestHour?.max_blobs_in_block ?? 0} size="sm" />
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Layers className="h-4 w-4" />
            <h2 className="section-title">Blob Activity</h2>
            <InfoTooltip
              content="Real-time stream of Ethereum blocks and transactions containing EIP-4844 blobs. Data is polled every 12 seconds. Switch between Blocks (one row per block) and Transactions (one row per type-3 tx) using the tabs below."
              side="bottom"
            />
            <span className="ml-2 flex items-center gap-1.5">
              <span className="pulse-dot" />
              <span className="caption text-[#10B981]">refreshes every 12s</span>
            </span>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="blocks">
            <TabsList className="mb-4">
              <TabsTrigger value="blocks">
                <span className="flex items-center gap-1.5">
                  Blocks
                  <InfoTooltip
                    content="Latest Ethereum blocks that contained at least one EIP-4844 blob transaction. Columns show: block number, blob count, block utilization (% of 9-blob capacity), blob base fee, which rollups appeared, and time. Click a block number to view on Etherscan."
                    side="bottom"
                  />
                </span>
              </TabsTrigger>
              <TabsTrigger value="transactions">
                <span className="flex items-center gap-1.5">
                  Transactions
                  <InfoTooltip
                    content="Latest individual EIP-4844 type-3 transactions. Shows transaction hash, block number, rollup attribution (based on known sequencer addresses), blob count, blob base fee paid, and timestamp. Click a hash to view on Etherscan."
                    side="bottom"
                  />
                </span>
              </TabsTrigger>
              <TabsTrigger value="stats">
                <span className="flex items-center gap-1.5">
                  <BarChart2 className="h-3.5 w-3.5" />
                  Stats
                  <InfoTooltip
                    content="Live summary stats for the current hour: blob and transaction rates, average fee, utilization, and top rollups by activity. Refreshes every 12 seconds."
                    side="bottom"
                  />
                </span>
              </TabsTrigger>
            </TabsList>
            <TabsContent value="blocks">
              <BlockFeed />
            </TabsContent>
            <TabsContent value="transactions">
              <LiveBlobFeed />
            </TabsContent>
            <TabsContent value="stats">
              <LiveStats />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
