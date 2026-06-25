import { Suspense } from "react";
import { PageHeader, PageSection } from "@/components/shared/PageHeader";
import { formatNumber } from "@/lib/utils";
import { formatUsd } from "@/lib/ethPrice";
import { getETHLiquidity, getETHLiquidityHistory } from "@/lib/queries";
import { ETHDistributionDonut } from "@/components/charts/ETHDistributionDonut";
import { ETHLiquidityTrendChart } from "@/components/charts/ETHLiquidityTrendChart";
import { StakingBreakdownChart } from "@/components/charts/StakingBreakdownChart";
import { TimeRangePicker } from "@/components/shared/TimeRangePicker";
import { BarChart3, Database, ShieldCheck, Wallet, Network } from "lucide-react";

export const revalidate = 30;

const CAT_LABELS: Record<string, string> = {
  staked: "Staking Pools",
  cex: "Centralized Exchanges",
  enterprise: "Enterprise Treasuries",
  bridges: "Cross-chain Bridges",
};

const HOURS_LABEL: Record<number, string> = {
  24:   "24 hours",
  168:  "7 days",
  720:  "30 days",
  2160: "90 days",
};

export default async function ETHLiquidityPage({
  searchParams,
}: {
  searchParams: Promise<{ hours?: string }>;
}) {
  const { hours: hoursParam } = await searchParams;
  // Default to 30 days (720 hours) for a better trend view
  const hours = [24, 168, 720, 2160].includes(Number(hoursParam)) ? Number(hoursParam) : 720;
  const days = Math.ceil(hours / 24);

  const [snapshots, history] = await Promise.all([
    getETHLiquidity().catch(() => []),
    getETHLiquidityHistory(days).catch(() => []),
  ]);
  
  const totalEth = snapshots.reduce((acc, s) => acc + s.balance_eth, 0);
  const totalUsd = snapshots.reduce((acc, s) => acc + s.balance_usd, 0);
  const totalAddresses = snapshots.reduce((acc, s) => acc + s.num_addresses, 0);
  const stakedEth = snapshots.find((s) => s.category === "staked")?.balance_eth || 0;

  return (
    <div className="animate-page-in space-y-8">
      <PageHeader
        meta="Market Intelligence"
        title="ETH Liquidity distribution"
        summary="Mapping the distribution of Ethereum's native asset across key ecosystem sectors. Monitoring the balance between staked, exchange-held, and bridged ETH."
      >
        <div className="flex flex-col items-start md:items-end gap-2.5">
          <Suspense fallback={<div className="h-9 w-56 rounded-none bg-border/30 animate-pulse" />}>
            <TimeRangePicker basePath="/eth-liquidity" current={hours} />
          </Suspense>
          <div className="flex items-center gap-2 px-3 py-1 bg-status-healthy/10 border border-dashed border-status-healthy/30 rounded-none">
             <ShieldCheck className="h-3.5 w-3.5 text-status-healthy" />
             <span className="text-[10px] font-bold uppercase tracking-widest text-status-healthy font-mono">Systemic Security Active</span>
          </div>
        </div>
      </PageHeader>

      {/* ── Orientation strip: high-level metrics ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          label="Total Indexed ETH"
          value={formatNumber(totalEth)}
          note="Combined balance across all sectors"
        />
        <StatCard
          label="Total Valuation"
          value={formatUsd(totalUsd)}
          note="Valuation in USD at current price"
        />
        <StatCard
          label="Wallets Monitored"
          value={totalAddresses.toLocaleString()}
          note="Core wallets tracked for liquidity"
        />
        <StatCard
          label="Active Sectors"
          value={`${snapshots.length} / 4`}
          note="Identified liquidity categories"
        />
      </div>

      {/* ── Allocation & Breakdown side-by-side in a responsive grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-5 flex flex-col">
          <PageSection
            label="Attribution"
            title="Sector Allocation"
            description="Share of total native ETH currently locked or held across categorized sectors."
            interpretation="A high concentration of staked ETH reflects a robust security model, while fluctuations in CEX and bridge sectors signal changing transactional demand."
            fullHeight
            className="flex-1"
          >
            <div className="flex justify-center py-4">
              {snapshots.length ? <ETHDistributionDonut data={snapshots} /> : <Empty />}
            </div>
          </PageSection>
        </div>

        <div className="lg:col-span-7 flex flex-col">
          <PageSection
            label="Distribution"
            title="Sector Breakdown"
            description="Detailed native ETH balances, USD valuations, and active addresses."
            interpretation="Real-time transparency of ETH supply distribution is key to understanding L1 fee dynamics and long-term liquidity scarcity."
            fullHeight
            className="flex-1"
            noPadding
          >
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead className="bg-surface-elevated border-b border-dashed border-border">
                  <tr>
                    <th className="px-6 py-4 text-left text-[10px] font-bold uppercase tracking-widest text-text-secondary opacity-60 font-mono">Category</th>
                    <th className="px-6 py-4 text-right text-[10px] font-bold uppercase tracking-widest text-text-secondary opacity-60 font-mono">ETH Balance</th>
                    <th className="px-6 py-4 text-right text-[10px] font-bold uppercase tracking-widest text-text-secondary opacity-60 font-mono">USD Value</th>
                    <th className="px-6 py-4 text-right text-[10px] font-bold uppercase tracking-widest text-text-secondary opacity-60 font-mono">Addresses</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dashed divide-border/40">
                  {snapshots.map((s) => (
                    <tr key={s.category} className="group hover:bg-surface-elevated transition-colors">
                      <td className="px-6 py-4 text-xs font-bold text-text-primary capitalize font-mono">
                        {CAT_LABELS[s.category] || s.category}
                      </td>
                      <td className="px-6 py-4 text-right font-mono text-xs font-bold text-text-primary">
                        {formatNumber(s.balance_eth)} ETH
                      </td>
                      <td className="px-6 py-4 text-right font-mono text-xs text-text-secondary">
                        {formatUsd(s.balance_usd)}
                      </td>
                      <td className="px-6 py-4 text-right font-mono text-xs text-text-secondary opacity-85">
                        {s.num_addresses.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </PageSection>
        </div>
      </div>

      {/* ── Staking Pools Breakdown side-by-side in a responsive grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-7 flex flex-col">
          <PageSection
            label="Consensus Security"
            title="Staking Pool Distribution"
            description="Validator share and native ETH deposits across major liquid staking protocols, exchanges, and independent operators."
            interpretation="Decentralized validator distribution is critical for Ethereum's censorship resistance. Lido's consensus share (~31%) is closely monitored by the community, while the growth in Solo Stakers represents healthier structural decentralization."
            fullHeight
            className="flex-1"
          >
            <StakingBreakdownChart stakedEth={stakedEth} />
          </PageSection>
        </div>
        
        <div className="lg:col-span-5 flex flex-col">
          <PageSection
            label="Analysis"
            title="Consensus Health Metrics"
            description="Systemic indicators derived from the active validator set."
            interpretation="A high validator count increases consensus overhead but ensures massive economic security. The minimum stake required is 32 ETH, forming a capital barrier that is democratized by liquid staking protocols."
            fullHeight
            className="flex-1"
          >
            <div className="space-y-6">
              <div className="surface border border-dashed border-border p-4 bg-surface/20">
                <h4 className="text-[10px] font-bold uppercase tracking-widest text-text-secondary opacity-60 font-mono mb-2">Total Staking Validators</h4>
                <p className="text-2xl font-bold font-mono text-text-primary">{(Math.floor(stakedEth / 32)).toLocaleString()}</p>
                <p className="text-[10px] text-text-secondary mt-1 font-mono">Active validator keys securing Ethereum Proof-of-Stake</p>
              </div>
              
              <div className="surface border border-dashed border-border p-4 bg-surface/20">
                <h4 className="text-[10px] font-bold uppercase tracking-widest text-text-secondary opacity-60 font-mono mb-2">Staking Protocol Diversity</h4>
                <div className="space-y-2 mt-3">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-text-secondary">Liquid Staking (Lido, RP):</span>
                    <span className="font-bold text-text-primary">35.0%</span>
                  </div>
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-text-secondary">CEX Pools (Coinbase, Binance):</span>
                    <span className="font-bold text-text-primary">22.1%</span>
                  </div>
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-text-secondary">Solo Stakers (Independent):</span>
                    <span className="font-bold text-text-primary">12.8%</span>
                  </div>
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-text-secondary">Institutional & Others:</span>
                    <span className="font-bold text-text-primary">30.1%</span>
                  </div>
                </div>
              </div>

              <div className="surface border border-dashed border-border p-4 bg-surface/20">
                <h4 className="text-[10px] font-bold uppercase tracking-widest text-text-secondary opacity-60 font-mono mb-2">Consensus Thresholds</h4>
                <p className="text-[11px] text-text-secondary leading-relaxed font-mono">
                  Ethereum requires a <span className="font-bold text-text-primary">2/3 supermajority</span> (66.7%) to finalize blocks. A single entity crossing the <span className="font-bold text-status-warning">33.3% threshold</span> (e.g. Lido at 31.2%) poses a tail risk of block delay/censorship coordination, making pool diversification a critical network objective.
                </p>
              </div>
            </div>
          </PageSection>
        </div>
      </div>

      {/* ── Historical Liquidity Trend Chart ── */}
      <PageSection
        label="Historical Trends"
        title={`Sector Distribution Trend — Last ${HOURS_LABEL[hours]}`}
        description="Daily historical breakdown of ETH balances across staking pools, centralized exchanges, bridges, and treasuries."
        interpretation="Stacked area view highlights the relative growth of different sectors. Growth in Staking indicates capital lockup, whereas an upward trend in CEX balances denotes potential short-term liquidity build-up."
      >
        {history.length ? <ETHLiquidityTrendChart data={history} /> : <Empty />}
      </PageSection>

      {/* ── Strategic Sector Deep Dives ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-8">
        <div className="surface border border-dashed border-border rounded-none p-5 bg-surface/10 flex flex-col justify-between">
           <div>
              <div className="flex items-center gap-3 mb-4">
                 <Database className="h-4 w-4 text-status-healthy" />
                 <h3 className="text-xs font-bold uppercase tracking-widest text-text-primary font-mono">Staking Pools</h3>
              </div>
              <p className="text-[11px] text-text-secondary leading-relaxed font-mono opacity-80">
                 Native validator deposits driving network security. Staked ETH yields establish the benchmark interest rate for the broader decentralized finance ecosystem, directly influencing layer-2 yield strategies and security thresholds.
              </p>
           </div>
        </div>

        <div className="surface border border-dashed border-border rounded-none p-5 bg-surface/10 flex flex-col justify-between">
           <div>
              <div className="flex items-center gap-3 mb-4">
                 <BarChart3 className="h-4 w-4 text-primary" />
                 <h3 className="text-xs font-bold uppercase tracking-widest text-text-primary font-mono">Centralized Exchanges</h3>
              </div>
              <p className="text-[11px] text-text-secondary leading-relaxed font-mono opacity-80">
                 Asset reserves held on centralized trading platforms. Tracking exchange balances serves as a primary proxy for ready-to-sell supply, institutional custody activity, and immediate retail market liquidity.
              </p>
           </div>
        </div>

        <div className="surface border border-dashed border-border rounded-none p-5 bg-surface/10 flex flex-col justify-between">
           <div>
              <div className="flex items-center gap-3 mb-4">
                 <Network className="h-4 w-4 text-indigo-400" />
                 <h3 className="text-xs font-bold uppercase tracking-widest text-text-primary font-mono">Cross-chain Bridges</h3>
              </div>
              <p className="text-[11px] text-text-secondary leading-relaxed font-mono opacity-80">
                 ETH locked in bridge smart contracts, representing assets migrated to rollups and external networks. A rising trend correlates with layer-2 network expansion and gas consumption activity monitored on BlobLens.
              </p>
           </div>
        </div>

        <div className="surface border border-dashed border-border rounded-none p-5 bg-surface/10 flex flex-col justify-between">
           <div>
              <div className="flex items-center gap-3 mb-4">
                 <Wallet className="h-4 w-4 text-amber-500" />
                 <h3 className="text-xs font-bold uppercase tracking-widest text-text-primary font-mono">Enterprise Treasuries</h3>
              </div>
              <p className="text-[11px] text-text-secondary leading-relaxed font-mono opacity-80">
                 Long-term protocol balances, corporate reserves, and foundation treasuries. These allocations highlight institutional accumulation, strategic reserves, and ecosystem developer funds committed to multi-year growth.
              </p>
           </div>
        </div>
      </div>
    </div>
  );
}

// ── Shared brutalist components ──

function StatCard({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="surface-elevated p-5 flex flex-col justify-between rounded-none border border-dashed border-border bg-surface/30">
      <span className="caption text-[11px] uppercase tracking-wider mb-2 block font-mono">{label}</span>
      <span
        className="font-mono font-bold text-text-primary text-2xl leading-tight truncate"
        title={value}
      >
        {value}
      </span>
      <p className="text-[11px] text-text-secondary mt-3 opacity-70 truncate font-mono">{note}</p>
    </div>
  );
}

function Empty({ label = "No data available" }: { label?: string }) {
  return (
    <div className="flex items-center justify-center py-12 text-xs text-text-secondary opacity-50 italic font-mono">
      {label}
    </div>
  );
}
