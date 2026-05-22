import { PageHeader, PageSection } from "@/components/shared/PageHeader";
import { getOFACList } from "@/lib/queries";
import { Badge } from "@/components/ui/badge";
import { ShieldAlert, Search, Info, Scale } from "lucide-react";

export const revalidate = 3600; // 1 hour

export default async function OFACPage() {
  const sanctions = await getOFACList();

  return (
    <div className="animate-page-in">
      <PageHeader
        meta="Compliance"
        title="OFAC Sanctions List"
        summary="Monitoring Ethereum addresses sanctioned by the Office of Foreign Assets Control (OFAC) and other regulatory bodies. Ensuring network transparency and compliance."
      >
        <div className="flex items-center gap-2 px-3 py-1.5 bg-destructive/10 border border-destructive/20 rounded-full">
           <ShieldAlert className="h-3.5 w-3.5 text-destructive" />
           <span className="text-[10px] font-bold uppercase tracking-widest text-destructive">Restricted Entities</span>
        </div>
      </PageHeader>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-12">
        <div className="lg:col-span-2 p-8 border border-border bg-surface rounded-xl flex flex-col justify-center">
          <div className="flex items-start gap-4 mb-6">
            <div className="h-10 w-10 rounded-lg bg-destructive/10 border border-destructive/20 flex items-center justify-center shrink-0">
              <Scale className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <h3 className="text-sm font-bold uppercase tracking-widest text-text-primary mb-2">Compliance & Regulatory Oversight</h3>
              <p className="text-xs text-text-secondary leading-relaxed">
                BlobLens tracks addresses identified by OFAC as being associated with sanctioned entities, including mixers like Tornado Cash and cyber-crime groups like Lazarus. This list is updated via official government sources and community verification.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="flex flex-col">
              <span className="text-[10px] font-bold uppercase tracking-widest text-text-secondary opacity-40 mb-1">Tracked Addresses</span>
              <span className="text-2xl font-display text-text-primary">{sanctions.length}</span>
            </div>
            <div className="h-8 w-px bg-border" />
            <div className="flex flex-col">
              <span className="text-[10px] font-bold uppercase tracking-widest text-text-secondary opacity-40 mb-1">Source Reliability</span>
              <span className="text-2xl font-display text-primary">High</span>
            </div>
          </div>
        </div>

        <div className="p-8 border border-primary/20 bg-primary/5 rounded-xl">
           <div className="flex items-center gap-2 mb-4">
             <Search className="h-4 w-4 text-primary" />
             <h3 className="text-xs font-bold uppercase tracking-widest text-primary">Compliance Check</h3>
           </div>
           <p className="text-[11px] text-text-secondary mb-4 leading-relaxed">
             Need to verify a specific address? Use our API or the search bar above to check if a wallet is on the restricted list.
           </p>
           <button className="w-full py-2 bg-background border border-primary/20 rounded-lg text-[10px] font-bold uppercase tracking-widest text-primary hover:bg-primary/5 transition-colors">
             Launch Search Engine
           </button>
        </div>
      </div>

      <PageSection
        label="Restriction List"
        title="Sanctioned Wallet Inventory"
        description="Detailed list of restricted Ethereum addresses and their associated risk profiles."
      >
        <div className="overflow-x-auto border border-border rounded-xl bg-surface">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-background/50 border-b border-border">
                <th className="px-6 py-4 text-left text-[10px] font-bold uppercase tracking-widest text-text-secondary opacity-40">Entity / Address</th>
                <th className="px-6 py-4 text-left text-[10px] font-bold uppercase tracking-widest text-text-secondary opacity-40">Source</th>
                <th className="px-6 py-4 text-left text-[10px] font-bold uppercase tracking-widest text-text-secondary opacity-40">Severity</th>
                <th className="px-6 py-4 text-left text-[10px] font-bold uppercase tracking-widest text-text-secondary opacity-40">Risk Tags</th>
                <th className="px-6 py-4 text-right text-[10px] font-bold uppercase tracking-widest text-text-secondary opacity-40">Added Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {sanctions.map((s) => (
                <tr key={s.id} className="group hover:bg-surface-elevated transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-0.5">
                      <span className="font-bold text-text-primary">
                        {s.label || "Unnamed Restricted Entity"}
                      </span>
                      <span className="text-[10px] font-mono text-text-secondary opacity-40 truncate max-w-[250px]">
                        {s.address}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <Badge variant="outline" className="text-[10px] tracking-tight opacity-60">
                      {s.source.replace('_', ' ')}
                    </Badge>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1.5">
                      <div className={`h-1.5 w-1.5 rounded-full ${s.severity === 'high' ? 'bg-destructive' : 'bg-orange-500'}`} />
                      <span className={`text-[11px] font-bold uppercase tracking-wider ${s.severity === 'high' ? 'text-destructive' : 'text-orange-500'}`}>
                        {s.severity}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1">
                      {(s.risk_tags ?? []).map((tag: string) => (
                        <Badge key={tag} className="text-[9px] bg-destructive/5 text-destructive border-destructive/20 capitalize">
                          {tag.replace('_', ' ')}
                        </Badge>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className="text-[10px] font-mono text-text-secondary opacity-40">
                      {new Date(s.added_at).toLocaleDateString()}
                    </span>
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
          <h3 className="text-sm font-bold uppercase tracking-widest text-text-primary mb-2">Legal Disclaimer</h3>
          <p className="text-xs text-text-secondary leading-relaxed max-w-4xl">
            The information provided on this page is for educational and transparency purposes only. BlobLens does not provide legal advice. While we strive for accuracy, the sanctioned status of addresses can change rapidly. Users are encouraged to verify information with official government sources such as the US Treasury Department&apos;s OFAC website.
          </p>
        </div>
      </div>
    </div>
  );
}
