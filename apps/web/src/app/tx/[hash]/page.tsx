import { getTxDetail } from "@/lib/queries";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { shortHash, formatFee } from "@/lib/utils";
import { notFound } from "next/navigation";
import Link from "next/link";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ hash: string }>;
}

function weiToEth(wei: string): string {
  const n = BigInt(wei || "0");
  const eth = Number(n) / 1e18;
  if (eth === 0) return "0 ETH";
  if (eth < 0.0001) return `${(Number(n) / 1e9).toFixed(6)} Gwei`;
  return `${eth.toFixed(6)} ETH`;
}

function gasPriceGwei(wei: number): string {
  return `${(wei / 1e9).toFixed(3)} Gwei`;
}

const TX_TYPE_LABEL: Record<number, string> = {
  0: "Legacy",
  1: "EIP-2930",
  2: "EIP-1559",
  3: "EIP-4844 (Blob)",
};

export default async function TxDetailPage({ params }: Props) {
  const { hash } = await params;
  const tx = await getTxDetail(hash);
  if (tx === null) {
    return (
      <main className="max-w-5xl mx-auto px-4 py-8">
        <div className="surface border border-border rounded-lg p-8 text-center space-y-2">
          <p className="text-text-secondary text-sm">Transaction data temporarily unavailable — ClickHouse unreachable</p>
          <p className="font-mono text-xs text-text-secondary/60 break-all">{hash}</p>
        </div>
      </main>
    );
  }

  const statusColor = tx.status ? "text-green-400" : "text-red-400";
  const statusLabel = tx.status ? "Success" : "Failed";

  return (
    <main className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      <PageHeader
        title="Transaction"
        summary={hash}
      />

      {/* Status + Type row */}
      <div className="flex flex-wrap gap-3">
        <span className={`text-sm font-semibold px-3 py-1 rounded-full border ${tx.status ? "border-green-700 bg-green-950" : "border-red-700 bg-red-950"} ${statusColor}`}>
          {statusLabel}
        </span>
        <span className="text-sm px-3 py-1 rounded-full border border-border text-text-secondary">
          {TX_TYPE_LABEL[tx.tx_type] ?? `Type ${tx.tx_type}`}
        </span>
        {tx.rollup && (
          <span className="text-sm px-3 py-1 rounded-full border border-border text-text-secondary">
            {tx.rollup}
          </span>
        )}
        {tx.is_blob_tx && (
          <span className="text-sm px-3 py-1 rounded-full border border-blue-700 bg-blue-950 text-blue-300">
            {tx.num_blobs} blob{tx.num_blobs !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* Main details */}
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
          <Row label="Value">{weiToEth(tx.value)}</Row>
          <Row label="Gas Used">{tx.gas_used.toLocaleString()}</Row>
          <Row label="Gas Price">{gasPriceGwei(tx.effective_gas_price)}</Row>
          <Row label="Total Fee">{weiToEth(tx.total_fee_wei)}</Row>
        </CardContent>
      </Card>

      {/* Blob section */}
      {tx.is_blob_tx && (
        <Card>
          <CardHeader className="pb-2">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-text-secondary">Blob Data</h2>
          </CardHeader>
          <CardContent className="space-y-4">
            <Row label="Blob Count">{tx.num_blobs}</Row>
            {tx.blob_base_fee && (
              <Row label="Blob Base Fee">{formatFee(tx.blob_base_fee)}</Row>
            )}
            <div>
              <p className="text-xs text-text-secondary uppercase tracking-wider mb-2">Blob Hashes</p>
              <div className="space-y-1">
                {tx.blob_hashes.map((h, i) => (
                  <p key={i} className="font-mono text-xs text-text-secondary break-all">{h}</p>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Token transfers */}
      {tx.token_transfers.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-text-secondary">
              Token Transfers ({tx.token_transfers.length})
            </h2>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {tx.token_transfers.map((t, i) => (
                <div key={i} className="flex flex-wrap items-center gap-2 text-sm border-b border-border pb-2 last:border-0 last:pb-0">
                  <span className="font-mono text-xs text-text-secondary">{shortHash(t.token_address)}</span>
                  <span className="text-text-secondary">·</span>
                  <Link href={`/address/${t.from_address}`} className="font-mono text-blue-400 hover:underline text-xs">
                    {shortHash(t.from_address)}
                  </Link>
                  <span className="text-text-secondary">→</span>
                  <Link href={`/address/${t.to_address}`} className="font-mono text-blue-400 hover:underline text-xs">
                    {shortHash(t.to_address)}
                  </Link>
                  <span className="text-text-secondary ml-auto font-mono text-xs">{t.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </main>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap gap-2 border-b border-border pb-3 last:border-0 last:pb-0">
      <span className="text-sm text-text-secondary w-32 shrink-0">{label}</span>
      <span className="text-sm text-text-primary flex-1">{children}</span>
    </div>
  );
}
