import { BlockFeed } from "@/components/shared/BlockFeed";
import { LiveBlobFeed } from "@/components/shared/LiveBlobFeed";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Layers } from "lucide-react";

export const revalidate = 0;

export default function LivePage() {
  return (
    <div className="page-root py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="topbar-title">Live Feed</h1>
          <p className="topbar-sub">Real-time EIP-4844 blob activity · Ethereum mainnet</p>
        </div>
        <span className="flex items-center gap-1.5 caption text-[#10B981]">
          <span className="pulse-dot" />
          live
        </span>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Layers className="h-4 w-4" />
            <h2 className="section-title">Blob Activity</h2>
            <span className="ml-2 flex items-center gap-1.5">
              <span className="pulse-dot" />
              <span className="caption text-[#10B981]">refreshes every 12s</span>
            </span>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="blocks">
            <TabsList className="mb-4">
              <TabsTrigger value="blocks">Blocks</TabsTrigger>
              <TabsTrigger value="transactions">Transactions</TabsTrigger>
            </TabsList>
            <TabsContent value="blocks">
              <BlockFeed />
            </TabsContent>
            <TabsContent value="transactions">
              <LiveBlobFeed />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
