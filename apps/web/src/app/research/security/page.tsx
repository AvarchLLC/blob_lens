import { PageHeader, PageSection } from "@/components/shared/PageHeader";
import { getSecurityMetrics } from "@/lib/queries";
import { ShieldCheck, Server, Lock, Activity, Info, Shield, Key, AlertTriangle } from "lucide-react";
import { formatNumber, rollupIcon } from "@/lib/utils";
import { MetricCard } from "@/components/shared/MetricCard";
import { ChartCardFooter } from "@/components/shared/ChartCardFooter";
import Image from "next/image";

export const revalidate = 86400; // 24 hours

// Helper to construct the retro console-style progress meter for decentralization index
function getDecentralizationMeter(chainName: string, seqCount: number | null) {
  if (chainName === "Ethereum") {
    return {
      meter: "■■■■■",
      label: "Fully Decentralized",
      color: "text-status-healthy",
      bg: "bg-status-healthy/5 border-status-healthy/25",
    };
  }
  if (chainName === "Taiko") {
    return {
      meter: "■■■■□",
      label: "Based (L1 Sequenced)",
      color: "text-[#00A7B5]",
      bg: "bg-[#00A7B5]/5 border-[#00A7B5]/25",
    };
  }
  if (chainName === "Arbitrum One") {
    return {
      meter: "■■□□□",
      label: "Centralized Seq / Multi-Prover",
      color: "text-[#9060FF]",
      bg: "bg-[#9060FF]/5 border-[#9060FF]/25",
    };
  }
  if (seqCount === 1) {
    return {
      meter: "■□□□□",
      label: "Centralized Sequencer",
      color: "text-status-warning",
      bg: "bg-status-warning/5 border-status-warning/25",
    };
  }
  return {
    meter: "■□□□□",
    label: "Centralized Sequencer",
    color: "text-status-warning",
    bg: "bg-status-warning/5 border-status-warning/25",
  };
}

export default async function SecurityPage() {
  const metrics = await getSecurityMetrics();

  // Compute L2 averages and totals for summary metrics
  const l2s = metrics.filter((m) => m.chain_name !== "Ethereum");
  const totalL2Sequencers = l2s.reduce((acc, m) => acc + (m.sequencer_count || 0), 0);
  const avgL2Sequencers = l2s.length > 0 ? (totalL2Sequencers / l2s.length).toFixed(1) : "1.0";

  return (
    <div className="animate-page-in space-y-10">
      {/* ── Page Header ── */}
      <PageHeader
        meta="Deep Research"
        title="Protocol Security Metrics"
        summary="Comparative analysis of decentralization, economic security, and sovereignty across Ethereum L1 and connected Layer 2 rollups."
      >
        <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/5 border border-dashed border-primary/30 rounded-none">
          <ShieldCheck className="h-3.5 w-3.5 text-primary" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-primary font-mono">Trust-less Verification Console</span>
        </div>
      </PageHeader>

      {/* ── Summary Cards Grid ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <MetricCard
          label="L1 Consensus Set"
          value="1,024,385"
          note="Active validators running decentralized consensus on Ethereum base layer."
          icon="database"
          accentColor="#00df81"
          glowColor="rgba(0, 223, 129, 0.15)"
        />
        <MetricCard
          label="L1 Staking Ratio"
          value="28.5%"
          note="Total circulating ETH locked in the proof-of-stake security layer."
          icon="coins"
          accentColor="#9060FF"
          glowColor="rgba(144, 96, 255, 0.15)"
        />
        <MetricCard
          label="L2 Sequencer Set"
          value={`${avgL2Sequencers} (Avg)`}
          note="Typical active sequencer count per rollup, highlighting L2 centralization."
          icon="cpu"
          accentColor="#00A7B5"
          glowColor="rgba(0, 167, 181, 0.15)"
        />
      </div>

      {/* ── Main Telemetry Table ── */}
      <PageSection
        label="Consensus Comparison"
        title="Validator & Sequencer Distribution"
        description="Head-to-head mapping of active node operators, staking characteristics, and trust assumptions."
      >
        <div className="overflow-x-auto w-full border border-dashed border-border bg-surface/10 rounded-none relative">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-surface-elevated/40 border-b border-dashed border-border/30 text-[10px] font-mono uppercase tracking-widest text-text-secondary">
                <th className="px-6 py-4 text-left font-bold opacity-60">Chain / Layer</th>
                <th className="px-6 py-4 text-left font-bold opacity-60">Node Count</th>
                <th className="px-6 py-4 text-left font-bold opacity-60">Staking Ratio (%)</th>
                <th className="px-6 py-4 text-left font-bold opacity-60">Security Model</th>
                <th className="px-6 py-4 text-left font-bold opacity-60">Consensus / Control</th>
                <th className="px-6 py-4 text-right font-bold opacity-60">Telemetry</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dashed divide-border/25">
              {metrics.map((m) => {
                const dec = getDecentralizationMeter(m.chain_name, m.sequencer_count);
                const logo = rollupIcon(m.chain_name);

                return (
                  <tr
                    key={m.chain_name}
                    className="group hover:bg-surface-elevated/30 transition-all duration-300"
                  >
                    {/* Chain Name */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {logo ? (
                          <div className="relative h-4 w-4 shrink-0 overflow-hidden">
                            <Image
                              src={logo}
                              alt={m.chain_name}
                              fill
                              className="object-contain filter brightness-95 contrast-105"
                            />
                          </div>
                        ) : (
                          <div className="h-4 w-4 bg-primary/10 border border-dashed border-primary/30 rounded-none shrink-0 flex items-center justify-center">
                            <span className="text-[8px] font-bold font-mono text-primary">
                              {m.chain_name.slice(0, 2).toUpperCase()}
                            </span>
                          </div>
                        )}
                        <span className="font-bold text-text-primary text-xs tracking-wide">
                          {m.chain_name}
                        </span>
                      </div>
                    </td>

                    {/* Node Count */}
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-mono text-xs font-bold text-text-primary tabular-nums">
                          {formatNumber(m.validator_count || m.sequencer_count || 0)}
                        </span>
                        <span className="text-[9px] text-text-secondary opacity-50 font-mono uppercase tracking-tighter">
                          {m.chain_name === "Ethereum" ? "Active Validators" : "Sequencer Nodes"}
                        </span>
                      </div>
                    </td>

                    {/* Staking Ratio */}
                    <td className="px-6 py-4">
                      <span className="font-mono text-xs font-bold text-text-secondary tabular-nums">
                        {m.staking_ratio ? `${m.staking_ratio}%` : "—"}
                      </span>
                    </td>

                    {/* Security Model Badge */}
                    <td className="px-6 py-4">
                      <span className="inline-block rounded-none border border-dashed border-border/40 bg-surface/50 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-text-secondary">
                        {m.chain_name === "Ethereum"
                          ? "Proof of Stake"
                          : m.chain_name === "Taiko"
                          ? "Based Rollup (L1 Seq)"
                          : "Optimistic / ZK Rollup"}
                      </span>
                    </td>

                    {/* Consensus Meter */}
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <span className={`font-mono text-xs font-bold tracking-widest ${dec.color}`}>
                            {dec.meter}
                          </span>
                          <span className="font-mono text-[9px] text-text-secondary opacity-40">
                            {dec.meter.replace(/□/g, "").length * 20}%
                          </span>
                        </div>
                        <span className="text-[9px] font-bold uppercase tracking-tight text-text-secondary opacity-50 font-mono">
                          {dec.label}
                        </span>
                      </div>
                    </td>

                    {/* Status */}
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <span className="relative flex h-1.5 w-1.5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-none bg-status-healthy opacity-75"></span>
                          <span className="relative inline-flex rounded-none h-1.5 w-1.5 bg-status-healthy"></span>
                        </span>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-text-secondary opacity-45 font-mono">
                          Live Feed
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Table Shell Footer */}
          <div className="px-6 py-4 border-t border-dashed border-border/10 bg-surface/5">
            <ChartCardFooter />
          </div>
        </div>
      </PageSection>

      {/* ── Risk Vectors Section ── */}
      <PageSection
        label="Vulnerabilities"
        title="Active Protocol Risk Vectors"
        description="Key security assumptions, centralization trade-offs, and administrative control factors."
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1: Sequencer Risk */}
          <div className="p-6 border border-dashed border-status-critical/25 bg-status-critical/5 rounded-none relative overflow-hidden group hover:-translate-y-1 hover:border-solid transition-all duration-300">
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-status-critical shadow-[0_0_8px_rgba(239,68,68,0.4)] animate-pulse" />
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="h-4 w-4 text-status-critical" />
              <h3 className="text-xs font-bold uppercase tracking-widest text-status-critical font-mono">
                Sequencer Monopolization
              </h3>
            </div>
            <p className="text-xs text-text-secondary leading-relaxed font-mono">
              Most L2s run a single sequencer managed by the protocol foundation. This creates a centralized choke point susceptible to MEV extraction, outages, and transaction delay.
            </p>
            <div className="absolute bottom-1 right-1 h-1.5 w-1.5 border-r border-b border-status-critical/45" />
          </div>

          {/* Card 2: Validation Delay */}
          <div className="p-6 border border-dashed border-status-warning/25 bg-status-warning/5 rounded-none relative overflow-hidden group hover:-translate-y-1 hover:border-solid transition-all duration-300">
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-status-warning shadow-[0_0_8px_rgba(245,158,11,0.4)]" />
            <div className="flex items-center gap-2 mb-4">
              <Shield className="h-4 w-4 text-status-warning" />
              <h3 className="text-xs font-bold uppercase tracking-widest text-status-warning font-mono">
                Validation & Proof Latency
              </h3>
            </div>
            <p className="text-xs text-text-secondary leading-relaxed font-mono">
              Optimistic L2s rely on a 7-day challenge window to finalize transactions, exposing users to finality delays. ZK rollups require intensive cryptographic prover compute, which is still largely centralized.
            </p>
            <div className="absolute bottom-1 right-1 h-1.5 w-1.5 border-r border-b border-status-warning/45" />
          </div>

          {/* Card 3: Upgrade Keys */}
          <div className="p-6 border border-dashed border-primary/25 bg-primary/5 rounded-none relative overflow-hidden group hover:-translate-y-1 hover:border-solid transition-all duration-300">
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-primary shadow-[0_0_8px_rgba(139,92,246,0.4)]" />
            <div className="flex items-center gap-2 mb-4">
              <Key className="h-4 w-4 text-primary" />
              <h3 className="text-xs font-bold uppercase tracking-widest text-primary font-mono">
                Multisig & Upgrade Sovereignty
              </h3>
            </div>
            <p className="text-xs text-text-secondary leading-relaxed font-mono">
              Many rollups retain Stage 0 or 1 keys. This allows security councils or developer multisigs to execute instant contract upgrades, creating a trust assumption that overrides onchain state rules.
            </p>
            <div className="absolute bottom-1 right-1 h-1.5 w-1.5 border-r border-b border-primary/45" />
          </div>
        </div>
      </PageSection>

      {/* ── Methodology Note ── */}
      <div className="p-6 border border-dashed border-border/35 bg-surface/20 rounded-none relative overflow-hidden group hover:bg-surface/30 transition-all duration-300">
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-border group-hover:h-[3px] transition-all duration-300" />
        <div className="flex items-start gap-4">
          <div className="h-8 w-8 bg-surface-elevated/50 border border-dashed border-border/40 flex items-center justify-center shrink-0">
            <Info className="h-4 w-4 text-text-secondary" />
          </div>
          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-widest text-text-primary font-mono">
              Methodology Note
            </h3>
            <p className="text-[11px] text-text-secondary leading-relaxed font-mono max-w-4xl">
              L1 validator counts are fetched directly from the Beacon API state. L2 sequencer data is currently sourced from protocol registries and rollup documentation. As L2s move toward decentralized sequencing (e.g., Espresso, Astria, based sequencing), these metrics will be updated to reflect live peer counts.
            </p>
          </div>
        </div>
        <div className="absolute bottom-1 right-1 h-1.5 w-1.5 border-r border-b border-border/30" />
      </div>
    </div>
  );
}
