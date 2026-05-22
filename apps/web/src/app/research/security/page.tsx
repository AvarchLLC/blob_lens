import { PageHeader, PageSection } from "@/components/shared/PageHeader";
import { getSecurityMetrics } from "@/lib/queries";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, Server, Lock, Activity, Info } from "lucide-react";
import { formatNumber } from "@/lib/utils";

export const revalidate = 86400; // 24 hours

export default async function SecurityPage() {
  const metrics = await getSecurityMetrics();

  return (
    <div className="animate-page-in">
      <PageHeader
        meta="Deep Research"
        title="Protocol Security Metrics"
        summary="Comparative analysis of decentralization and economic security between Ethereum L1 and connected Layer 2 rollups."
      >
        <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 border border-primary/20 rounded-full">
           <ShieldCheck className="h-3.5 w-3.5 text-primary" />
           <span className="text-[10px] font-bold uppercase tracking-widest text-primary">Trust-less Verification</span>
        </div>
      </PageHeader>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-12">
        <div className="lg:col-span-2 p-8 border border-border bg-surface rounded-xl flex flex-col justify-center relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-5">
             <Lock className="h-32 w-32 text-primary" />
          </div>
          <div className="flex items-start gap-4 mb-6 relative z-10">
            <div className="h-10 w-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
              <Server className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="text-sm font-bold uppercase tracking-widest text-text-primary mb-2">The Security Gap</h3>
              <p className="text-xs text-text-secondary leading-relaxed max-w-2xl">
                Ethereum L1 is secured by over a million decentralized validators. In contrast, most current Layer 2 implementations rely on a limited set of sequencers. Understanding this discrepancy is crucial for evaluating protocol risk and long-term sovereignty.
              </p>
            </div>
          </div>
        </div>

        <div className="p-8 border border-primary/20 bg-primary/5 rounded-xl">
           <div className="flex items-center gap-2 mb-4">
             <Activity className="h-4 w-4 text-primary" />
             <h3 className="text-xs font-bold uppercase tracking-widest text-primary">L1 Staking Ratio</h3>
           </div>
           <div className="flex flex-col">
              <span className="text-3xl font-display text-text-primary">28.5%</span>
              <span className="text-[10px] text-text-secondary opacity-60 uppercase tracking-widest font-bold mt-1">of total supply staked</span>
           </div>
        </div>
      </div>

      <PageSection
        label="Comparison"
        title="Validator & Sequencer Distribution"
        description="Head-to-head comparison of node operators across the stack."
      >
        <div className="overflow-x-auto border border-border rounded-xl bg-surface">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-background/50 border-b border-border">
                <th className="px-6 py-4 text-left text-[10px] font-bold uppercase tracking-widest text-text-secondary opacity-40">Chain / Layer</th>
                <th className="px-6 py-4 text-left text-[10px] font-bold uppercase tracking-widest text-text-secondary opacity-40">Validators / Sequencers</th>
                <th className="px-6 py-4 text-left text-[10px] font-bold uppercase tracking-widest text-text-secondary opacity-40">Staking Ratio (%)</th>
                <th className="px-6 py-4 text-left text-[10px] font-bold uppercase tracking-widest text-text-secondary opacity-40">Security Model</th>
                <th className="px-6 py-4 text-right text-[10px] font-bold uppercase tracking-widest text-text-secondary opacity-40">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {metrics.map((m) => (
                <tr key={m.chain_name} className="group hover:bg-surface-elevated transition-colors">
                  <td className="px-6 py-4">
                    <span className="font-bold text-text-primary">{m.chain_name}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-0.5">
                       <span className="font-mono text-xs font-bold text-text-primary">
                          {formatNumber(m.validator_count || m.sequencer_count || 0)}
                       </span>
                       <span className="text-[10px] text-text-secondary opacity-40 uppercase tracking-tight">
                          {m.chain_name === 'Ethereum' ? 'Active Validators' : 'Sequencer Set'}
                       </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-mono text-xs text-text-secondary">
                       {m.staking_ratio ? `${m.staking_ratio}%` : '—'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <Badge variant="outline" className="text-[10px] tracking-tight opacity-60">
                       {m.chain_name === 'Ethereum' ? 'Proof of Stake' : 'Optimistic / ZK Rollup'}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                       <div className="h-1.5 w-1.5 rounded-full bg-status-healthy" />
                       <span className="text-[10px] font-bold uppercase tracking-widest text-text-secondary opacity-40">Tracked</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </PageSection>

      <div className="mt-12 p-8 border border-border bg-surface rounded-xl flex items-start gap-4">
        <div className="h-10 w-10 rounded-lg bg-surface-elevated border border-border flex items-center justify-center shrink-0">
          <Info className="h-5 w-5 text-text-secondary" />
        </div>
        <div>
          <h3 className="text-sm font-bold uppercase tracking-widest text-text-primary mb-2">Methodology Note</h3>
          <p className="text-xs text-text-secondary leading-relaxed max-w-4xl">
            L1 validator counts are fetched directly from the Beacon API state. L2 sequencer data is currently sourced from protocol registries and rollup documentation. As L2s move toward decentralized sequencing (e.g., Espresso, Astria), these metrics will be updated to reflect live peer counts.
          </p>
        </div>
      </div>
    </div>
  );
}
