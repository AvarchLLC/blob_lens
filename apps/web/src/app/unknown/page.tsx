import { PageHeader, PageSection } from "@/components/shared/PageHeader";
import { MetricCard } from "@/components/shared/MetricCard";
import { ChartCardFooter } from "@/components/shared/ChartCardFooter";
import { getAllUnknownSenders } from "@/lib/queries";
import { formatNumber } from "@/lib/utils";
import { ExternalLink, ShieldAlert, ArrowRight } from "lucide-react";
import Link from "next/link";

export const revalidate = 60;

export default async function UnknownPage() {
  const senders = await getAllUnknownSenders(100).catch(() => []);

  const totalBlobs = senders.reduce((s, r) => s + Number(r.total_blobs), 0);
  const totalTxs = senders.reduce((s, r) => s + Number(r.tx_count), 0);

  return (
    <div className="animate-page-in space-y-10">
      {/* ── Page Header ── */}
      <PageHeader 
        meta="Unattributed Senders"
        title="Unknown Entities"
        summary="Monitoring blob submitters that are not yet matched to any known rollup sequencer in the registry. Help us identify them to improve data quality."
      >
        <a
          href="https://github.com/AvarchLLC/blob_lens/issues/new?title=Add+rollup+attribution&body=Address%3A+%0ASequencer+for%3A+"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-4 py-2 bg-primary/5 text-primary border border-dashed border-primary/30 rounded-none text-xs font-bold uppercase tracking-widest hover:bg-primary/10 transition-all font-mono"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          Identify a Rollup
        </a>
      </PageHeader>

      {/* ── Summary Grid ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <MetricCard 
          label="Unique Addresses" 
          value={senders.length} 
          note="Unidentified active sequencer addresses."
          icon="database"
          accentColor="#9060FF"
          glowColor="rgba(144, 96, 255, 0.15)"
        />
        <MetricCard 
          label="Total Blobs" 
          value={formatNumber(totalBlobs)} 
          note="Unattributed data availability volume."
          icon="gauge"
          accentColor="#00df81"
          glowColor="rgba(0, 223, 129, 0.15)"
        />
        <MetricCard 
          label="Transactions" 
          value={formatNumber(totalTxs)} 
          note="Total Type-3 transactions from these entities."
          icon="zap"
          accentColor="#00A7B5"
          glowColor="rgba(0, 167, 181, 0.15)"
        />
      </div>

      {/* ── Main Senders Section ── */}
      <PageSection
        label="Observation"
        title="Senders Ranked by Volume"
        description="Telemetry feed listing unattributed addresses ranked by total blob storage submissions."
      >
        {senders.length === 0 ? (
          <div className="py-20 text-center border border-dashed border-border/50 rounded-none bg-surface/10">
            <ShieldAlert className="h-10 w-10 text-text-secondary opacity-30 mx-auto mb-4" />
            <p className="text-xs text-text-secondary opacity-50 italic font-mono uppercase tracking-wider">
              No unattributed senders found.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto w-full border border-dashed border-border bg-surface/10 rounded-none relative">
            {/* Top neon glow bar */}
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-[#00df81] shadow-[0_0_8px_rgba(0,223,129,0.5)]" />

            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-surface-elevated/40 border-b border-dashed border-border/30 text-[10px] font-mono uppercase tracking-widest text-text-secondary">
                  <th className="px-6 py-4 text-left font-bold opacity-60">#</th>
                  <th className="px-6 py-4 text-left font-bold opacity-60">From Address</th>
                  <th className="px-6 py-4 text-right font-bold opacity-60">TXs</th>
                  <th className="px-6 py-4 text-right font-bold opacity-60">Blobs / TX</th>
                  <th className="px-6 py-4 text-right font-bold opacity-60">Total Blobs</th>
                  <th className="px-6 py-4 text-right font-bold opacity-60">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dashed divide-border/25">
                {senders.map((s, i) => (
                  <tr 
                    key={s.from_address} 
                    className="group hover:bg-surface-elevated/30 transition-all duration-300"
                  >
                    {/* Rank */}
                    <td className="px-6 py-4 font-mono text-xs text-text-secondary opacity-40">
                      {String(i + 1).padStart(2, "0")}
                    </td>

                    {/* Address Link */}
                    <td className="px-6 py-4">
                      <Link 
                        href={`/address/${s.from_address}`}
                        className="font-mono text-xs text-text-primary hover:text-primary transition-colors tracking-tight font-bold break-all"
                      >
                        {s.from_address}
                      </Link>
                    </td>

                    {/* Transaction Count */}
                    <td className="px-6 py-4 text-right font-mono text-xs text-text-secondary tabular-nums">
                      {formatNumber(Number(s.tx_count))}
                    </td>

                    {/* Average Blobs per Transaction */}
                    <td className="px-6 py-4 text-right font-mono text-xs text-text-secondary tabular-nums">
                      {Number(s.avg_blobs_per_tx).toFixed(1)}
                    </td>

                    {/* Total Blobs */}
                    <td className="px-6 py-4 text-right font-mono text-xs font-bold text-text-primary tabular-nums">
                      {formatNumber(Number(s.total_blobs))}
                    </td>

                    {/* Inspect Link */}
                    <td className="px-6 py-4 text-right">
                      <Link
                        href={`/address/${s.from_address}`}
                        className="inline-flex items-center gap-1 text-[10px] font-bold text-primary hover:text-primary-hover font-mono"
                      >
                        [ INSPECT ]
                        <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Table Footer */}
            <div className="px-6 py-4 border-t border-dashed border-border/10 bg-surface/5">
              <ChartCardFooter />
            </div>
          </div>
        )}
      </PageSection>
    </div>
  );
}
