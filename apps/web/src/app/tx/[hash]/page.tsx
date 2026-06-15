import { getTxDetail } from "@/lib/queries";
import { getEthPrice, formatUsd } from "@/lib/ethPrice";
import { PageHeader } from "@/components/shared/PageHeader";
import { shortHash, formatFee } from "@/lib/utils";
import { CheckCircle, XCircle, Layers, Zap, Database } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

interface Props { params: Promise<{ hash: string }> }

function weiToEth(wei: string | number): string {
  const n = typeof wei === "number" ? BigInt(Math.round(wei)) : BigInt(wei || "0");
  const eth = Number(n) / 1e18;
  if (eth === 0) return "0 ETH";
  if (eth < 0.000001) return `${(Number(n) / 1e9).toFixed(2)} Gwei`;
  return `${eth.toFixed(6)} ETH`;
}

function weiToUsd(wei: string | number, price: number | null): string | null {
  if (!price) return null;
  const n = typeof wei === "number" ? BigInt(Math.round(wei)) : BigInt(wei || "0");
  return formatUsd((Number(n) / 1e18) * price);
}

function gasPriceGwei(wei: number): string {
  if (!wei) return "—";
  return `${(wei / 1e9).toFixed(3)} Gwei`;
}

export default async function TxDetailPage({ params }: Props) {
  const { hash } = await params;
  const [tx, ethUsd] = await Promise.all([getTxDetail(hash), getEthPrice()]);

  if (!tx) {
    return (
      <main className="max-w-5xl mx-auto px-4 py-8">
        <div className="surface border border-border rounded-xl p-12 text-center space-y-3">
          <div className="h-12 w-12 rounded-full bg-border/30 flex items-center justify-center mx-auto">
            <Database className="h-5 w-5 text-text-secondary" />
          </div>
          <p className="font-semibold text-text-primary">Transaction not found</p>
          <p className="text-sm text-text-secondary">This hash doesn't match a blob transaction in our index</p>
          <p className="font-mono text-xs text-text-secondary/50 break-all max-w-lg mx-auto pt-1">{hash}</p>
        </div>
      </main>
    );
  }

  const execFeeWei = (BigInt(tx.gas_used) * BigInt(tx.effective_gas_price)).toString();
  const blobFeeWei = (BigInt(tx.blob_gas_used) * BigInt(tx.blob_gas_price)).toString();
  const totalFeeWei = (BigInt(execFeeWei) + BigInt(blobFeeWei)).toString();

  return (
    <main className="max-w-5xl mx-auto px-4 py-8 space-y-6 animate-fade-up">
      <PageHeader
        meta="Transaction"
        title={shortHash(tx.tx_hash)}
        summary={tx.tx_hash}
      />

      {/* Status row */}
      <div className="flex flex-wrap items-center gap-2">
        {tx.status ? (
          <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full border border-status-healthy/40 bg-status-healthy/10 text-status-healthy">
            <CheckCircle className="h-3.5 w-3.5" /> Success
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full border border-status-critical/40 bg-status-critical/10 text-status-critical">
            <XCircle className="h-3.5 w-3.5" /> Failed
          </span>
        )}
        <span className="text-xs px-3 py-1.5 rounded-full border border-border text-text-secondary bg-surface">
          EIP-4844 Blob
        </span>
        {tx.rollup && (
          <span className="text-xs px-3 py-1.5 rounded-full border border-primary/30 bg-primary/5 text-primary font-semibold">
            {tx.rollup}
          </span>
        )}
        <span className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border border-blue-500/30 bg-blue-500/5 text-blue-400 font-semibold">
          <Layers className="h-3 w-3" />
          {tx.num_blobs} blob{tx.num_blobs !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Core info grid */}
      <div className="surface border border-border rounded-xl overflow-hidden">
        <div className="grid grid-cols-1 divide-y divide-border">
          <InfoRow label="Block">
            <Link href={`/block/${tx.block_number}`} className="font-mono text-primary hover:underline">
              #{tx.block_number.toLocaleString()}
            </Link>
          </InfoRow>
          <InfoRow label="Timestamp">
            {new Date(tx.block_timestamp).toUTCString()}
          </InfoRow>
          <InfoRow label="From">
            <Link href={`/address/${tx.from_address}`} className="font-mono text-primary hover:underline break-all text-sm">
              {tx.from_address}
            </Link>
          </InfoRow>
          <InfoRow label="To">
            {tx.to_address
              ? <Link href={`/address/${tx.to_address}`} className="font-mono text-primary hover:underline break-all text-sm">{tx.to_address}</Link>
              : <span className="text-text-secondary italic text-sm">Contract creation</span>
            }
          </InfoRow>
        </div>
      </div>

      {/* Fee breakdown */}
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary mb-3">Fee Breakdown</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          {/* Execution */}
          <div className="surface-elevated border border-border rounded-xl p-5 space-y-4">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-center justify-center">
                <Zap className="h-3.5 w-3.5 text-orange-400" />
              </div>
              <p className="text-xs font-bold uppercase tracking-wider text-text-secondary">Execution Gas</p>
            </div>
            <div className="space-y-2.5 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-text-secondary">Gas Used</span>
                <span className="font-mono">{tx.gas_used ? tx.gas_used.toLocaleString() : "—"}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-text-secondary">Gas Price</span>
                <span className="font-mono">{gasPriceGwei(tx.effective_gas_price)}</span>
              </div>
              <div className="h-px bg-border" />
              <div className="flex justify-between items-center">
                <span className="text-text-secondary font-medium">Fee</span>
                <div className="text-right">
                  <p className="font-semibold font-mono">{weiToEth(execFeeWei)}</p>
                  {ethUsd && <p className="text-xs text-text-secondary">{weiToUsd(execFeeWei, ethUsd)}</p>}
                </div>
              </div>
            </div>
          </div>

          {/* Blob */}
          <div className="surface-elevated border border-border rounded-xl p-5 space-y-4">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                <Layers className="h-3.5 w-3.5 text-blue-400" />
              </div>
              <p className="text-xs font-bold uppercase tracking-wider text-text-secondary">Blob Gas</p>
            </div>
            <div className="space-y-2.5 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-text-secondary">Blob Gas Used</span>
                <span className="font-mono">{tx.blob_gas_used ? tx.blob_gas_used.toLocaleString() : "—"}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-text-secondary">Blob Base Fee</span>
                <span className="font-mono">{tx.blob_gas_price ? gasPriceGwei(tx.blob_gas_price) : (tx.blob_base_fee ? formatFee(tx.blob_base_fee) : "—")}</span>
              </div>
              <div className="h-px bg-border" />
              <div className="flex justify-between items-center">
                <span className="text-text-secondary font-medium">Fee</span>
                <div className="text-right">
                  <p className="font-semibold font-mono">{weiToEth(blobFeeWei)}</p>
                  {ethUsd && <p className="text-xs text-text-secondary">{weiToUsd(blobFeeWei, ethUsd)}</p>}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Total */}
        <div className="mt-3 surface border border-primary/20 bg-primary/5 rounded-xl p-4 flex items-center justify-between">
          <p className="text-sm font-semibold text-text-primary">Total Fee</p>
          <div className="text-right">
            <p className="font-bold font-mono text-text-primary">{weiToEth(totalFeeWei)}</p>
            {ethUsd && <p className="text-xs text-primary font-semibold">{weiToUsd(totalFeeWei, ethUsd)}</p>}
          </div>
        </div>
      </div>

      {/* Blob commitments */}
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary mb-3">
          Blob Commitments ({tx.num_blobs})
        </p>
        <div className="surface border border-border rounded-xl overflow-hidden">
          {tx.blob_hashes.map((h, i) => (
            <div key={i} className="flex items-center gap-4 p-3 border-b border-border last:border-0 hover:bg-white/[0.02] transition-colors">
              <span className="h-5 w-5 rounded-md bg-primary/10 border border-primary/20 flex items-center justify-center text-[10px] font-bold text-primary shrink-0">
                {i}
              </span>
              <p className="font-mono text-xs text-text-secondary break-all">{h}</p>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-start gap-4 px-5 py-3.5 hover:bg-white/[0.02] transition-colors">
      <span className="text-xs font-bold uppercase tracking-wider text-text-secondary w-24 shrink-0 pt-0.5">{label}</span>
      <span className="text-sm text-text-primary flex-1">{children}</span>
    </div>
  );
}
