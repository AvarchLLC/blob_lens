import { Suspense } from "react";
import { PageHeader, PageSection } from "@/components/shared/PageHeader";
import { formatUsd, formatEth } from "@/lib/ethPrice";
import { getWhales, getWhaleHistory } from "@/lib/queries";
import { Badge } from "@/components/ui/badge";
import { WhaleCategoryDonut } from "@/components/charts/WhaleCategoryDonut";
import { TopWhalesBarChart } from "@/components/charts/TopWhalesBarChart";
import { WhaleHistoryLineChart } from "@/components/charts/WhaleHistoryLineChart";
import { TimeRangePicker } from "@/components/shared/TimeRangePicker";
import { Wallet, ShieldCheck, History, Search, AlertTriangle, Activity } from "lucide-react";

export const revalidate = 300; // 5 minutes

const HOURS_LABEL: Record<number, string> = {
  24:   "24 hours",
  168:  "7 days",
  720:  "30 days",
  2160: "90 days",
};

export default async function WhaleWatchPage({
  searchParams,
}: {
  searchParams: Promise<{ hours?: string }>;
}) {
  const { hours: hoursParam } = await searchParams;
  // Default to 30 days (720 hours) for a better history trend
  const hours = [24, 168, 720, 2160].includes(Number(hoursParam)) ? Number(hoursParam) : 720;
  const days = Math.ceil(hours / 24);

  const [whales, history] = await Promise.all([
    getWhales(100).catch(() => []),
    getWhaleHistory(days).catch(() => []),
  ]);
  
  const totalEth = whales.reduce((acc, w) => acc + (w.balance_eth || 0), 0);
  const totalUsd = whales.reduce((acc, w) => acc + (w.balance_usd || 0), 0);
  const verifiedCount = whales.filter(w => w.is_verified).length;
  const sanctionedWhales = whales.filter(w => w.is_sanctioned);

  return (
    <div className="animate-page-in space-y-8">
      <PageHeader
        meta="Market Intelligence"
        title="Whale Watch"
        summary="Tracking the largest ETH holders and entity-labeled wallets. Monitor institutional movements, exchange reserves, and founder activity."
      >
        <div className="flex flex-col items-start md:items-end gap-2.5">
          <Suspense fallback={<div className="h-9 w-56 rounded-none bg-border/30 animate-pulse" />}>
            <TimeRangePicker basePath="/whale-watch" current={hours} />
          </Suspense>
          <div className="flex items-center gap-2 px-3 py-1 bg-primary/10 border border-dashed border-primary/30 rounded-none">
             <Activity className="h-3.5 w-3.5 text-primary" />
             <span className="text-[10px] font-bold uppercase tracking-widest text-primary font-mono">Live Entity Surveillance</span>
          </div>
        </div>
      </PageHeader>

      {sanctionedWhales.length > 0 && (
        <div className="p-4 bg-status-spike/10 border border-dashed border-status-spike/30 rounded-none flex items-start gap-4">
          <div className="h-10 w-10 bg-status-spike/20 border border-status-spike/30 flex items-center justify-center shrink-0">
            <AlertTriangle className="h-5 w-5 text-status-spike" />
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-status-spike font-mono">OFAC Compliance Alert</h3>
            <p className="text-[11px] text-text-secondary leading-relaxed font-mono mt-1">
              {sanctionedWhales.length} wallet(s) in the top 100 are currently flagged on the OFAC Sanctions List. Regulatory restrictions and compliance rules apply to interactions involving these addresses.
            </p>
          </div>
        </div>
      )}

      {/* ── Orientation strip: metrics ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          label="Total ETH Tracked"
          value={formatEth(totalEth)}
          note="Aggregate balance of top 100 whales"
        />
        <StatCard
          label="Total Valuation"
          value={formatUsd(totalUsd)}
          note="Combined valuation in USD"
        />
        <StatCard
          label="Wallets Monitored"
          value={whales.length.toString()}
          note="High-value entities under surveillance"
        />
        <StatCard
          label="Verified Entities"
          value={`${verifiedCount} / ${whales.length}`}
          note="Wallets with confirmed labels"
        />
      </div>

      {/* ── Visual Analysis: Category Share & Top Active Whales side-by-side ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-5 flex flex-col">
          <PageSection
            label="Attribution"
            title="Whale Category Share"
            description="Distribution of aggregate native ETH balance across entity categories."
            interpretation="The dominance of Smart Contracts reflects massive lockups in the consensus layer and decentralized protocols, while Exchanges represent active trading float."
            fullHeight
            className="flex-1"
          >
            <WhaleCategoryDonut data={whales} />
          </PageSection>
        </div>

        <div className="lg:col-span-7 flex flex-col">
          <PageSection
            label="Comparison"
            title="Active Whale Balances"
            description="Balance comparison of the top 10 active exchange and entity wallets (consensus contract excluded)."
            interpretation="Excluding the massive Beacon Deposit Contract reveals the relative sizes of centralized exchange reserves (like Binance and Coinbase) which act as immediate market liquidity."
            fullHeight
            className="flex-1"
          >
            <TopWhalesBarChart data={whales} />
          </PageSection>
        </div>
      </div>

      {/* ── Historical Balance Trends Chart ── */}
      <PageSection
        label="Historical Analytics"
        title={`Whale Balance Trends — Last ${HOURS_LABEL[hours]}`}
        description="Daily historical balance tracking of the top 5 largest active exchange and entity wallets."
        interpretation="Traces capital flows over time. Sharp drops in exchange balances indicate coins moving to cold storage or staking contracts, while spikes represent incoming sell-side liquidity."
      >
        {history.length ? <WhaleHistoryLineChart data={history} /> : <Empty />}
      </PageSection>

      {/* ── Leaderboard Table ── */}
      <PageSection
        label="Leaderboard"
        title="Top Ethereum Holders"
        description="Ranking of wallets by native ETH balance, featuring verified entity labels and compliance tags."
        noPadding
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead className="bg-surface-elevated border-b border-dashed border-border">
              <tr>
                <th className="px-6 py-4 text-left text-[10px] font-bold uppercase tracking-widest text-text-secondary opacity-60 font-mono">Rank</th>
                <th className="px-6 py-4 text-left text-[10px] font-bold uppercase tracking-widest text-text-secondary opacity-60 font-mono">Entity / Address</th>
                <th className="px-6 py-4 text-left text-[10px] font-bold uppercase tracking-widest text-text-secondary opacity-60 font-mono">Category</th>
                <th className="px-6 py-4 text-right text-[10px] font-bold uppercase tracking-widest text-text-secondary opacity-60 font-mono">Balance</th>
                <th className="px-6 py-4 text-right text-[10px] font-bold uppercase tracking-widest text-text-secondary opacity-60 font-mono">USD Valuation</th>
                <th className="px-6 py-4 text-right text-[10px] font-bold uppercase tracking-widest text-text-secondary opacity-60 font-mono">Last Synchronized</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dashed divide-border/40">
              {whales.map((whale, index) => (
                <tr key={whale.id} className="group hover:bg-surface-elevated transition-colors">
                  <td className="px-6 py-4 font-mono text-xs text-text-secondary opacity-70">
                    #{index + 1}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-text-primary font-mono">
                          {whale.label || `${whale.address.slice(0, 6)}...${whale.address.slice(-4)}`}
                        </span>
                        {whale.is_verified && (
                          <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                        )}
                        {whale.is_sanctioned && (
                          <Badge variant="destructive" className="text-[8px] h-4 px-1 rounded-none uppercase tracking-tighter font-mono bg-status-spike/10 text-status-spike border border-status-spike/30 hover:bg-status-spike/20">
                            Sanctioned
                          </Badge>
                        )}
                      </div>
                      <span className="text-[10px] font-mono text-text-secondary opacity-50 truncate max-w-[280px]">
                        {whale.address}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <Badge variant="outline" className="capitalize text-[9px] tracking-wider rounded-none font-mono font-bold border-dashed border-border text-text-secondary bg-surface/30">
                      {whale.category || "individual"}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 text-right font-mono text-xs font-bold text-text-primary">
                    {formatEth(whale.balance_eth)}
                  </td>
                  <td className="px-6 py-4 text-right font-mono text-xs text-text-secondary">
                    {formatUsd(whale.balance_usd)}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-1.5 text-[9px] font-bold uppercase tracking-wider text-text-secondary opacity-60 font-mono">
                      <History className="h-3 w-3" />
                      {new Date(whale.last_updated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </PageSection>
      
      {/* ── Heuristics Deep Dive ── */}
      <div className="surface border border-dashed border-border rounded-none p-6 bg-surface/10 mt-8">
        <div className="flex items-start gap-4">
          <div className="h-10 w-10 rounded-none bg-surface-elevated border border-dashed border-border flex items-center justify-center shrink-0">
            <Search className="h-5 w-5 text-text-secondary" />
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-widest text-text-primary font-mono mb-2">Whale Identification Heuristics</h3>
            <p className="text-[11px] text-text-secondary leading-relaxed font-mono opacity-80 max-w-4xl">
              Our indexer continuously monitors the top 10,000 Ethereum addresses. Wallets are categorized using heuristic analysis of transaction patterns, known contract signatures, and community-sourced labels. Verified entities include centralized exchanges, protocol treasuries, and prominent industry builders. Tracking these movements provides an early warning system for market-wide liquidity shifts.
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
