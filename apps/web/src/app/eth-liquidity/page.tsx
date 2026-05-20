import { MetricCard } from "@/components/shared/MetricCard";
import { PageHeader, PageSection } from "@/components/shared/PageHeader";
import { formatUsd, formatNumber } from "@/lib/utils";
import { getETHLiquidity } from "@/lib/queries";
import { Card, CardContent } from "@/components/ui/card";
import { ETHDistributionDonut } from "@/components/charts/ETHDistributionDonut";
import { BarChart3, Database, ShieldCheck, Wallet } from "lucide-react";

export const revalidate = 3600;

const CAT_LABELS: Record<string, string> = {
  staked: "Staking Pools",
  cex: "Centralized Exchanges",
  enterprise: "Enterprise Treasuries",
  bridges: "Cross-chain Bridges",
};

export default async function ETHLiquidityPage() {
  const snapshots = await getETHLiquidity();
  
  const totalEth = snapshots.reduce((acc, s) => acc + s.balance_eth, 0);
  const totalUsd = snapshots.reduce((acc, s) => acc + s.balance_usd, 0);
  const totalAddresses = snapshots.reduce((acc, s) => acc + s.num_addresses, 0);

  return (
    <div className="animate-page-in">
      <PageHeader
        meta="Market Intelligence"
        title="ETH Liquidity"
        summary="Mapping the distribution of Ethereum's native asset across key ecosystem sectors. Monitoring the balance between staked, exchange-held, and bridged ETH."
      >
        <div className="flex items-center gap-2 px-3 py-1.5 bg-status-healthy/10 border border-status-healthy/20 rounded-full">
           <ShieldCheck className="h-3.5 w-3.5 text-status-healthy" />
           <span className="text-[10px] font-bold uppercase tracking-widest text-status-healthy">Systemic Security</span>
        </div>
      </PageHeader>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        <MetricCard
          label="Total Indexed ETH"
          value={formatNumber(totalEth)}
          note="Combined balance across all sectors."
        />
        <MetricCard
          label="Total USD Value"
          value={formatUsd(totalUsd)}
          note="Valuation based on current market price."
        />
        <MetricCard
          label="Target Addresses"
          value={totalAddresses.toString()}
          note="Key wallets monitored for liquidity."
        />
        <MetricCard
          label="Sectors"
          value={snapshots.length.toString()}
          note="Core liquidity categories."
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-12">
        <div className="lg:col-span-5 h-[400px]">
          <Card className="h-full bg-surface border-border overflow-hidden">
            <div className="p-6 border-b border-border bg-sidebar/50">
               <h3 className="text-xs font-bold uppercase tracking-widest text-text-secondary">Sector Allocation</h3>
            </div>
            <CardContent className="h-[320px] p-0">
               <ETHDistributionDonut data={snapshots} />
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-7">
          <PageSection
            label="Distribution"
            title="Sector Breakdown"
            description="Detailed balances and valuations per liquidity category."
            interpretation="Concentration in 'Staked' indicates high long-term security commitment, while high 'CEX' balances suggest potential sell-side liquidity or retail activity."
          >
            <div className="overflow-x-auto border border-border rounded-xl bg-surface">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-background/50 border-b border-border">
                    <th className="px-6 py-4 text-left text-[10px] font-bold uppercase tracking-widest text-text-secondary opacity-40">Category</th>
                    <th className="px-6 py-4 text-left text-[10px] font-bold uppercase tracking-widest text-text-secondary opacity-40">ETH Balance</th>
                    <th className="px-6 py-4 text-left text-[10px] font-bold uppercase tracking-widest text-text-secondary opacity-40">USD Value</th>
                    <th className="px-6 py-4 text-right text-[10px] font-bold uppercase tracking-widest text-text-secondary opacity-40">Wallets</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30">
                  {snapshots.map((s) => (
                    <tr key={s.category} className="group hover:bg-surface-elevated transition-colors">
                      <td className="px-6 py-4 text-xs font-bold text-text-primary capitalize">
                        {CAT_LABELS[s.category] || s.category}
                      </td>
                      <td className="px-6 py-4 font-mono text-xs font-bold text-text-primary">
                        {formatNumber(s.balance_eth)} ETH
                      </td>
                      <td className="px-6 py-4 font-mono text-xs text-text-secondary opacity-80">
                        {formatUsd(s.balance_usd)}
                      </td>
                      <td className="px-6 py-4 text-right font-mono text-xs text-text-secondary opacity-40">
                        {s.num_addresses}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </PageSection>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
         <Card className="bg-surface border-border">
            <CardContent className="p-8">
               <div className="flex items-center gap-4 mb-4">
                  <div className="h-10 w-10 rounded-lg bg-status-healthy/10 flex items-center justify-center border border-status-healthy/20">
                     <Database className="h-5 w-5 text-status-healthy" />
                  </div>
                  <h3 className="text-sm font-bold uppercase tracking-widest text-text-primary">Staking Dominance</h3>
               </div>
               <p className="text-xs text-text-secondary leading-relaxed">
                  Monitoring the balance between liquid ETH and staked ETH is critical for understanding Ethereum&apos;s economic security. As the staking ratio increases, the circulating supply of ETH effectively decreases, impacting the fee market dynamics indexed by BlobLens.
               </p>
            </CardContent>
         </Card>

         <Card className="bg-surface border-border">
            <CardContent className="p-8">
               <div className="flex items-center gap-4 mb-4">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center border border-primary/20">
                     <BarChart3 className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="text-sm font-bold uppercase tracking-widest text-text-primary">Exchange Liquidity</h3>
               </div>
               <p className="text-xs text-text-secondary leading-relaxed">
                  Low exchange balances often precede volatility as the depth of available liquidity on centralized venues thins. We track major CEX hot wallets to provide a real-time proxy for retail and institutional trade readiness.
               </p>
            </CardContent>
         </Card>
      </div>
    </div>
  );
}
