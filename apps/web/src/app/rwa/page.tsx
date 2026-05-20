import { MetricCard } from "@/components/shared/MetricCard";
import { PageHeader, PageSection } from "@/components/shared/PageHeader";
import { formatNumber } from "@/lib/utils";
import { formatUsd } from "@/lib/ethPrice";
import { getRWATokens } from "@/lib/queries";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Coins, Globe, Landmark, TrendingUp } from "lucide-react";

export const revalidate = 60;

export default async function RWAPage() {
  const tokens = await getRWATokens();
  
  const totalMarketCap = tokens.reduce((acc, t) => acc + (t.market_cap_usd || 0), 0);
  const totalVolume = tokens.reduce((acc, t) => acc + (t.volume_24h_usd || 0), 0);
  const topPerformer = [...tokens].sort((a, b) => (b.market_cap_usd || 0) - (a.market_cap_usd || 0))[0];

  return (
    <div className="animate-page-in">
      <PageHeader
        meta="Market Intelligence"
        title="RWA Valuation"
        summary="Tracking the on-chain valuation and market dynamics of Real-World Assets (RWAs). Monitoring tokenized treasuries, stablecoins, and commodities."
      >
        <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 border border-primary/20 rounded-full">
           <Landmark className="h-3.5 w-3.5 text-primary" />
           <span className="text-[10px] font-bold uppercase tracking-widest text-primary">Institutional Grade</span>
        </div>
      </PageHeader>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        <MetricCard
          label="Total RWA Market Cap"
          value={formatUsd(totalMarketCap)}
          note="Aggregate value across indexed tokens."
        />
        <MetricCard
          label="24h Volume"
          value={formatUsd(totalVolume)}
          note="Total trading volume in the last 24h."
        />
        <MetricCard
          label="Tokens Tracked"
          value={tokens.length.toString()}
          note="Number of RWA protocols monitored."
        />
        <MetricCard
          label="Top Asset"
          value={topPerformer?.symbol || "—"}
          note={`${topPerformer?.name || "No data"}`}
        />
      </div>

      <PageSection
        label="Asset Inventory"
        title="Tokenized Asset Leaderboard"
        description="Live pricing and market capitalization for tokenized RWAs on Ethereum."
      >
        <div className="overflow-x-auto border border-border rounded-xl bg-surface">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-background/50 border-b border-border">
                <th className="px-6 py-4 text-left text-[10px] font-bold uppercase tracking-widest text-text-secondary opacity-40">Asset</th>
                <th className="px-6 py-4 text-left text-[10px] font-bold uppercase tracking-widest text-text-secondary opacity-40">Symbol</th>
                <th className="px-6 py-4 text-left text-[10px] font-bold uppercase tracking-widest text-text-secondary opacity-40">Price (USD)</th>
                <th className="px-6 py-4 text-left text-[10px] font-bold uppercase tracking-widest text-text-secondary opacity-40">Market Cap</th>
                <th className="px-6 py-4 text-left text-[10px] font-bold uppercase tracking-widest text-text-secondary opacity-40">24h Volume</th>
                <th className="px-6 py-4 text-right text-[10px] font-bold uppercase tracking-widest text-text-secondary opacity-40">Chain</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {tokens.map((token) => (
                <tr key={token.id} className="group hover:bg-surface-elevated transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-surface-elevated border border-border flex items-center justify-center font-bold text-xs">
                        {token.symbol[0]}
                      </div>
                      <span className="font-bold text-text-primary">{token.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <Badge variant="outline" className="font-mono text-[10px] opacity-60">
                      {token.symbol}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 font-mono text-xs font-bold text-text-primary">
                    {token.price_usd ? `$${token.price_usd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })}` : "—"}
                  </td>
                  <td className="px-6 py-4 font-mono text-xs text-text-secondary opacity-80">
                    {token.market_cap_usd ? formatUsd(token.market_cap_usd) : "—"}
                  </td>
                  <td className="px-6 py-4 font-mono text-xs text-text-secondary opacity-60">
                    {token.volume_24h_usd ? formatUsd(token.volume_24h_usd) : "—"}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-1 text-[10px] font-bold uppercase tracking-widest text-text-secondary opacity-40">
                      <Globe className="h-2.5 w-2.5" />
                      Ethereum
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </PageSection>
      
      <div className="mt-12 p-8 border border-primary/20 bg-primary/5 rounded-xl">
        <div className="flex items-start gap-4">
          <div className="h-10 w-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
            <TrendingUp className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-bold uppercase tracking-widest text-text-primary mb-2">Institutional Inflow Analysis</h3>
            <p className="text-xs text-text-secondary leading-relaxed max-w-3xl">
              RWA tokens bridge the gap between traditional finance and DeFi. By tracking market caps and volumes, BlobLens provides insight into the velocity of real-world value moving on-chain. High utilization of tokenized treasuries like BlackRock&apos;s BUIDL indicates a shifting regime towards institutional collateralization on Ethereum.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
