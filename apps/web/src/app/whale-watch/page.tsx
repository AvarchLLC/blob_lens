import { MetricCard } from "@/components/shared/MetricCard";
import { PageHeader, PageSection } from "@/components/shared/PageHeader";
import { formatUsd, formatEth } from "@/lib/ethPrice";
import { getWhales } from "@/lib/queries";
import { Badge } from "@/components/ui/badge";
import { Wallet, ShieldCheck, History, Search, AlertTriangle } from "lucide-react";

export const revalidate = 300; // 5 minutes

export default async function WhaleWatchPage() {
  const whales = await getWhales(100);
  
  const totalEth = whales.reduce((acc, w) => acc + (w.balance_eth || 0), 0);
  const totalUsd = whales.reduce((acc, w) => acc + (w.balance_usd || 0), 0);
  const verifiedCount = whales.filter(w => w.is_verified).length;
  const sanctionedWhales = whales.filter(w => w.is_sanctioned);

  return (
    <div className="animate-page-in">
      <PageHeader
        meta="Market Intelligence"
        title="Whale Watch"
        summary="Tracking the largest ETH holders and entity-labeled wallets. Monitor institutional movements, exchange reserves, and founder activity."
      >
        <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 border border-primary/20 rounded-full">
           <ShieldCheck className="h-3.5 w-3.5 text-primary" />
           <span className="text-[10px] font-bold uppercase tracking-widest text-primary">Verified Entity Tracking</span>
        </div>
      </PageHeader>

      {sanctionedWhales.length > 0 && (
        <div className="mb-8 p-4 bg-destructive/10 border border-destructive/20 rounded-xl flex items-center gap-4 animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="h-10 w-10 rounded-full bg-destructive/20 flex items-center justify-center shrink-0">
            <AlertTriangle className="h-5 w-5 text-destructive" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-destructive">Compliance Alert</h3>
            <p className="text-xs text-destructive/80">
              {sanctionedWhales.length} whale wallet(s) in the top 100 are currently on the OFAC Sanctions List. Regulatory restrictions apply.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        <MetricCard
          label="Total ETH Tracked"
          value={formatEth(totalEth)}
          note="Aggregate balance of top 100 whales."
        />
        <MetricCard
          label="Total Value (USD)"
          value={formatUsd(totalUsd)}
          note="Combined valuation in USD."
        />
        <MetricCard
          label="Wallets Monitored"
          value={whales.length.toString()}
          note="High-value entities under surveillance."
        />
        <MetricCard
          label="Verified Entities"
          value={verifiedCount.toString()}
          note="Wallets with confirmed labels."
        />
      </div>

      <PageSection
        label="Leaderboard"
        title="Top Ethereum Holders"
        description="Ranking of wallets by ETH balance, including labeled entities and unknown whales."
      >
        <div className="cosmic-card p-0 overflow-hidden">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-background/50 border-b border-dotted border-border">
                <th className="px-6 py-4 text-left text-[10px] font-bold uppercase tracking-widest text-text-secondary opacity-40">Rank</th>
                <th className="px-6 py-4 text-left text-[10px] font-bold uppercase tracking-widest text-text-secondary opacity-40">Entity / Address</th>
                <th className="px-6 py-4 text-left text-[10px] font-bold uppercase tracking-widest text-text-secondary opacity-40">Category</th>
                <th className="px-6 py-4 text-left text-[10px] font-bold uppercase tracking-widest text-text-secondary opacity-40">Balance (ETH)</th>
                <th className="px-6 py-4 text-left text-[10px] font-bold uppercase tracking-widest text-text-secondary opacity-40">Value (USD)</th>
                <th className="px-6 py-4 text-right text-[10px] font-bold uppercase tracking-widest text-text-secondary opacity-40">Last Updated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dotted divide-border/50">
              {whales.map((whale, index) => (
                <tr key={whale.id} className="group hover:bg-surface-elevated transition-colors">
                  <td className="px-6 py-4 font-mono text-xs text-text-secondary opacity-40">
                    #{index + 1}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-text-primary">
                          {whale.label || `${whale.address.slice(0, 6)}...${whale.address.slice(-4)}`}
                        </span>
                        {whale.is_verified && (
                          <ShieldCheck className="h-3 w-3 text-primary" />
                        )}
                        {whale.is_sanctioned && (
                          <Badge variant="destructive" className="text-[8px] h-3.5 px-1 uppercase tracking-tighter">
                            Sanctioned
                          </Badge>
                        )}
                      </div>
                      <span className="text-[10px] font-mono text-text-secondary opacity-40 truncate max-w-[200px]">
                        {whale.address}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <Badge variant="outline" className="capitalize text-[10px] tracking-tight opacity-60">
                      {whale.category}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 font-mono text-xs font-bold text-text-primary">
                    {formatEth(whale.balance_eth)}
                  </td>
                  <td className="px-6 py-4 font-mono text-xs text-text-secondary opacity-80">
                    {formatUsd(whale.balance_usd)}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-1 text-[10px] font-bold uppercase tracking-widest text-text-secondary opacity-40">
                      <History className="h-2.5 w-2.5" />
                      {new Date(whale.last_updated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </PageSection>
      
      <div className="mt-12 cosmic-card">
        <div className="flex items-start gap-4">
          <div className="h-10 w-10 rounded-lg bg-surface-elevated border border-border flex items-center justify-center shrink-0">
            <Search className="h-5 w-5 text-text-secondary" />
          </div>
          <div>
            <h3 className="text-sm font-bold uppercase tracking-widest text-text-primary mb-2">Whale Identification Heuristics</h3>
            <p className="text-xs text-text-secondary leading-relaxed max-w-3xl">
              Our indexer continuously monitors the top 10,000 Ethereum addresses. Wallets are categorized using heuristic analysis of transaction patterns, known contract signatures, and community-sourced labels. Verified entities include centralized exchanges, protocol treasuries, and prominent industry builders. Tracking these movements provides an early warning system for market-wide liquidity shifts.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
