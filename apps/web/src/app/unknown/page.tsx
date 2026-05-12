import { InfoTooltip } from "@/components/shared/InfoTooltip";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { getAllUnknownSenders } from "@/lib/queries";
import { formatNumber } from "@/lib/utils";
import { HelpCircle } from "lucide-react";

export const revalidate = 60;

export default async function UnknownPage() {
  const senders = await getAllUnknownSenders(100).catch(() => []);

  const totalBlobs = senders.reduce((s, r) => s + Number(r.total_blobs), 0);
  const totalTxs = senders.reduce((s, r) => s + Number(r.tx_count), 0);

  return (
    <div className="page-root py-8 space-y-6">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h1 className="topbar-title">Unattributed Senders</h1>
          <p className="topbar-sub">Blob submitters not matched to any known rollup sequencer</p>
        </div>
        <div className="flex items-center gap-1.5 caption text-[#fcbb00]">
          <HelpCircle className="h-3.5 w-3.5" />
          {senders.length} addresses
        </div>
      </div>

      {/* Summary strip */}
      <section className="grid grid-cols-3 gap-4">
        <div className="glass-card rounded-lg px-4 py-3">
          <div className="flex items-center gap-1.5 mb-1">
            <p className="caption">Addresses</p>
            <InfoTooltip content="Distinct from addresses that submitted EIP-4844 blob transactions but couldn't be matched to any known rollup sequencer in the registry." side="bottom" />
          </div>
          <p className="font-mono text-xl font-bold text-foreground">{senders.length}</p>
        </div>
        <div className="glass-card rounded-lg px-4 py-3">
          <div className="flex items-center gap-1.5 mb-1">
            <p className="caption">Total Blobs</p>
            <InfoTooltip content="Sum of all EIP-4844 blobs submitted by unattributed addresses. This represents data availability usage that hasn't been attributed to a rollup." side="bottom" />
          </div>
          <p className="font-mono text-xl font-bold text-foreground">{totalBlobs.toLocaleString()}</p>
        </div>
        <div className="glass-card rounded-lg px-4 py-3">
          <div className="flex items-center gap-1.5 mb-1">
            <p className="caption">Transactions</p>
          </div>
          <p className="font-mono text-xl font-bold text-foreground">{totalTxs.toLocaleString()}</p>
        </div>
      </section>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <HelpCircle className="h-4 w-4" />
            <h2 className="section-title">Unknown Senders</h2>
            <InfoTooltip
              content="Addresses ranked by total blob volume. If you recognize any of these as a rollup sequencer, open an issue on GitHub to add them to the registry."
              side="bottom"
            />
            <a
              href="https://github.com/dhanushlnaik/blob_lens/issues/new?title=Add+rollup+attribution&body=Address%3A+%0ASequencer+for%3A+"
              target="_blank"
              rel="noopener noreferrer"
              className="ml-auto text-xs text-[#10B981] hover:text-[#10B981]/80 transition-colors"
            >
              Identify a rollup →
            </a>
          </div>
        </CardHeader>
        <CardContent>
          {senders.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No unattributed senders found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="pb-2 pr-4 text-left text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">#</th>
                    <th className="pb-2 pr-4 text-left text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">From Address</th>
                    <th className="pb-2 pr-4 text-right text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">TXs</th>
                    <th className="pb-2 pr-4 text-right text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">Blobs/TX</th>
                    <th className="pb-2 pr-4 text-right text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">Total Blobs</th>
                    <th className="pb-2 text-right text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">Etherscan</th>
                  </tr>
                </thead>
                <tbody>
                  {senders.map((s, i) => (
                    <tr key={s.from_address} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                      <td className="py-2.5 pr-4 font-mono text-xs text-muted-foreground">{i + 1}</td>
                      <td className="py-2.5 pr-4 font-mono text-xs text-foreground/80 max-w-[260px] truncate">
                        {s.from_address}
                      </td>
                      <td className="py-2.5 pr-4 text-right font-mono text-xs text-muted-foreground">
                        {formatNumber(Number(s.tx_count))}
                      </td>
                      <td className="py-2.5 pr-4 text-right font-mono text-xs text-muted-foreground">
                        {Number(s.avg_blobs_per_tx).toFixed(1)}
                      </td>
                      <td className="py-2.5 pr-4 text-right font-mono text-xs font-semibold text-foreground">
                        {formatNumber(Number(s.total_blobs))}
                      </td>
                      <td className="py-2.5 text-right">
                        <a
                          href={`https://etherscan.io/address/${s.from_address}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-[#10B981] hover:text-[#10B981]/80 transition-colors"
                        >
                          View ↗
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
