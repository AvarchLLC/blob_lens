import { PageHeader } from "@/components/shared/PageHeader";
import { Key, ExternalLink } from "lucide-react";
import Wallet360Client from "./Wallet360Client";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Wallet 360 | BlobLens",
  description: "Full-spectrum Ethereum wallet intelligence — transactions, ERC-20, NFTs, blob activity, and OFAC screening.",
};

export default function Wallet360Page() {
  return (
    <div className="animate-page-in">
      <PageHeader
        meta="Developer API"
        title="Wallet 360"
        summary="Full-spectrum Ethereum wallet intelligence. Normal transactions, ERC-20 transfers, NFT activity, blob data, and compliance screening — all in one Etherscan-compatible API."
      >
        <div className="flex flex-wrap gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/5 border border-dashed border-primary/30 rounded-none font-mono">
            <Key className="h-3.5 w-3.5 text-primary" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-primary">API Access Required</span>
          </div>
          <a
            href="https://www.mywallet360.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary border border-primary/25 hover:bg-primary/20 rounded-none text-xs font-bold uppercase tracking-widest transition-all font-mono"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            MyWallet360 Web App
          </a>
        </div>
      </PageHeader>
      <Wallet360Client />
    </div>
  );
}

