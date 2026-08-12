import EtmClient from "./EtmClient";

export const dynamic = "force-dynamic";
export const revalidate = 30;

export const metadata = {
  title: "Encrypted Mempool Console · BlobLens",
  description:
    "EIP-8184 (Lucid) encrypted-mempool telemetry — the sandwich-MEV surface encryption eliminates, the sealed block space it reserves, and the protocol metrics to verify it once live.",
};

export default function EtmPage() {
  return <EtmClient />;
}
