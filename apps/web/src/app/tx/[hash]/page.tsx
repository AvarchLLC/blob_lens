import { getTxDetail } from "@/lib/queries";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { shortHash, formatFee } from "@/lib/utils";
import Link from "next/link";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ hash: string }>;
}

function weiToEth(wei: string | number): string {
  const n = typeof wei === "number" ? BigInt(Math.round(wei)) : BigInt(wei || "0");
  const eth = Number(n) / 1e18;
  if (eth === 0) return "0 ETH";
  if (eth < 0.0001) return `${(Number(n) / 1e9).toFixed(4)} Gwei`;
  return `${eth.toFixed(6)} ETH`;
}

function gasPriceGwei(wei: number): string {
  if (!wei) return "—";
  return `${(wei / 1e9).toFixed(3)} Gwei`;
}

function feeWei(gasUsed: number, gasPrice: number): string {
  return (BigInt(gasUsed) * BigInt(gasPrice)).toString();
}

export default async function TxDetailPage({ params }: Props) {
  const { hash } = await params;
  const tx = await getTxDetail(hash);
  if (tx === null) {
    return (
      <main className="max-w-5xl mx-auto px-4 py-8">
        <div className="surface border border-border rounded-lg p-8 text-center space-y-2">
          <p className="text-text-secondary text-sm">Transaction not found or data temporarily unavailable</p>
          <p className="font-mono text-xs text-text-secondary/60 break-all">{hash}</p>
        </div>
      </main>
    );
  }

  const statusColor = tx.status ? "text-green-400" : "text-red-400";
  const statusLabel = tx.status ? "Success" : "Failed";
  const execFeeWei = feeWei(tx.gas_used, tx.effective_gas_price);
  const blobFeeWei = feeWei(tx.blob_gas_used, tx.blob_gas_price);
  const totalFeeWei = (BigInt(execFeeWei) + BigInt(blobFeeWei)).toString();

  return (
    <main className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      <PageHeader title="Transaction" summary={hash} />

      {/* Badges */}
      <div className="flex flex-wrap gap-3">
        <span className={`text-sm font-semibold px-3 py-1 rounded-full border ${tx.status ? "border-green-700 bg-green-950" : "border-red-700 bg-red-950"} ${statusColor}`}>
          {statusLabel}
        </span>
        <span className="text-sm px-3 py-1 rounded-full border border-border text-text-secondary">
          EIP-4844 (Blob)
        </span>
        {tx.rollup && (
          <span className="text-sm px-3 py-1 rounded-full border border-border text-text-secondary">
            {tx.rollup}
          </span>
        )}
        <span className="text-sm px-3 py-1 rounded-full border border-blue-700 bg-blue-950 text-blue-300">
          {tx.num_blobs} blob{tx.num_blobs !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Core details */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <Row label="Block">
            <Link href={`/block/${tx.block_number}`} className="text-blue-400 hover:underline font-mono">
              #{tx.block_number.toLocaleString()}
            </Link>
          </Row>
          <Row label="Timestamp">{new Date(tx.block_timestamp).toUTCString()}</Row>
          <Row label="From">
            <Link href={`/address/${tx.from_address}`} className="text-blue-400 hover:underline font-mono text-sm break-all">
              {tx.from_address}
            </Link>
          </Row>
          <Row label="To">
            {tx.to_address ? (
              <Link href={`/address/${tx.to_address}`} className="text-blue-400 hover:underline font-mono text-sm break-all">
                {tx.to_address}
              </Link>
            ) : (
              <span className="text-text-secondary text-sm italic">Contract creation</span>
            )}
          </Row>
        </CardContent>
      </Card>

      {/* Fee breakdown — two columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Execution fee */}
        <Card>
          <CardHeader className="pb-2">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-text-secondary">Execution Gas</h2>
          </CardHeader>
          <CardContent className="space-y-3">
            <Row label="Gas Used">{tx.gas_used ? tx.gas_used.toLocaleString() : "—"}</Row>
            <Row label="Gas Price">{gasPriceGwei(tx.effective_gas_price)}</Row>
            <Row label="Execution Fee">
              <span className="font-semibold">{weiToEth(execFeeWei)}</span>
            </Row>
          </CardContent>
        </Card>

        {/* Blob fee */}
        <Card>
          <CardHeader className="pb-2">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-text-secondary">Blob Gas</h2>
          </CardHeader>
          <CardContent className="space-y-3">
            <Row label="Blob Gas Used">{tx.blob_gas_used ? tx.blob_gas_used.toLocaleString() : "—"}</Row>
            <Row label="Blob Base Fee">{tx.blob_gas_price ? gasPriceGwei(tx.blob_gas_price) : (tx.blob_base_fee ? formatFee(tx.blob_base_fee) : "—")}</Row>
            <Row label="Blob Fee">
              <span className="font-semibold">{weiToEth(blobFeeWei)}</span>
            </Row>
          </CardContent>
        </Card>
      </div>

      {/* Total fee highlight */}
      <div className="surface-elevated border border-border rounded-lg p-4 flex items-center justify-between">
        <span className="text-sm text-text-secondary">Total Fee (execution + blob)</span>
        <span className="font-semibold text-text-primary">{weiToEth(totalFeeWei)}</span>
      </div>

      {/* Blob hashes */}
      <Card>
        <CardHeader className="pb-2">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-text-secondary">
            Blob Commitments ({tx.num_blobs})
          </h2>
        </CardHeader>
        <CardContent className="space-y-1.5">
          {tx.blob_hashes.map((h, i) => (
            <div key={i} className="flex items-start gap-3">
              <span className="text-xs text-text-secondary/50 w-6 shrink-0 pt-0.5">{i}</span>
              <p className="font-mono text-xs text-text-secondary break-all">{h}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </main>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap gap-2 border-b border-border pb-3 last:border-0 last:pb-0">
      <span className="text-sm text-text-secondary w-36 shrink-0">{label}</span>
      <span className="text-sm text-text-primary flex-1">{children}</span>
    </div>
  );
}
