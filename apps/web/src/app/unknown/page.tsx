import { InfoTooltip } from "@/components/shared/InfoTooltip";
import { PageHeader, PageSection } from "@/components/shared/PageHeader";
import { MetricCard } from "@/components/shared/MetricCard";
import { getAllUnknownSenders } from "@/lib/queries";
import { formatNumber } from "@/lib/utils";
import { HelpCircle, ExternalLink } from "lucide-react";

export const revalidate = 60;

export default async function UnknownPage() {
  const senders = await getAllUnknownSenders(100).catch(() => []);

  const totalBlobs = senders.reduce((s, r) => s + Number(r.total_blobs), 0);
  const totalTxs = senders.reduce((s, r) => s + Number(r.tx_count), 0);

  return (
    <div className="animate-page-in">
      <PageHeader 
        meta="Unattributed Senders"
        title="Unknown Entities"
        summary="Monitoring blob submitters that are not yet matched to any known rollup sequencer in the registry. Help us identify them to improve data quality."
      >
        <a
          href="https://github.com/AvarchLLC/blob_lens/issues/new?title=Add+rollup+attribution&body=Address%3A+%0ASequencer+for%3A+"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary border border-primary/20 rounded-md text-xs font-bold uppercase tracking-widest hover:bg-primary/20 transition-colors"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          Identify a rollup
        </a>
      </PageHeader>

      {/* Summary strip */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <MetricCard 
          label="Unique Addresses" 
          value={senders.length} 
          note="Unidentified sequencer addresses."
        />
        <MetricCard 
          label="Total Blobs" 
          value={formatNumber(totalBlobs)} 
          note="Unattributed data availability volume."
        />
        <MetricCard 
          label="Transactions" 
          value={formatNumber(totalTxs)} 
          note="Total Type-3 transactions from these entities."
        />
      </div>

      <PageSection
        label="Observation"
        title="Senders Ranked by Volume"
        description="Detailed list of addresses ranked by total blob submissions."
        interpretation="Large volume from unidentified addresses often suggests new or experimental rollups. If you recognize an address, please contribute to the registry."
        noPadding
      >
        {senders.length === 0 ? (
          <p className="py-20 text-center text-sm text-text-secondary opacity-50 italic">No unattributed senders found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-sidebar/50 border-b border-border">
                <tr>
                  <th className="px-6 py-4 text-left text-[10px] font-bold uppercase tracking-[0.15em] text-text-secondary">#</th>
                  <th className="px-6 py-4 text-left text-[10px] font-bold uppercase tracking-[0.15em] text-text-secondary">From Address</th>
                  <th className="px-6 py-4 text-right text-[10px] font-bold uppercase tracking-[0.15em] text-text-secondary">TXs</th>
                  <th className="px-6 py-4 text-right text-[10px] font-bold uppercase tracking-[0.15em] text-text-secondary">Blobs/TX</th>
                  <th className="px-6 py-4 text-right text-[10px] font-bold uppercase tracking-[0.15em] text-text-secondary">Total Blobs</th>
                  <th className="px-6 py-4 text-right text-[10px] font-bold uppercase tracking-[0.15em] text-text-secondary">Explorer</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {senders.map((s, i) => (
                  <tr key={s.from_address} className="hover:bg-surface-elevated transition-colors group">
                    <td className="px-6 py-4 font-mono text-xs text-text-secondary opacity-50">{i + 1}</td>
                    <td className="px-6 py-4 font-mono text-xs text-text-primary tracking-tight">
                      {s.from_address}
                    </td>
                    <td className="px-6 py-4 text-right font-mono text-xs text-text-secondary">
                      {formatNumber(Number(s.tx_count))}
                    </td>
                    <td className="px-6 py-4 text-right font-mono text-xs text-text-secondary">
                      {Number(s.avg_blobs_per_tx).toFixed(1)}
                    </td>
                    <td className="px-6 py-4 text-right font-mono text-xs font-bold text-text-primary">
                      {formatNumber(Number(s.total_blobs))}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <a
                        href={`https://etherscan.io/address/${s.from_address}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[10px] font-bold text-primary hover:underline"
                      >
                        ETHERSCAN
                        <ExternalLink className="h-2.5 w-2.5" />
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </PageSection>
    </div>
  );
}

