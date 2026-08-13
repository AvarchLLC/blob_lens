import MevClient from "./MevClient";

export const dynamic = "force-dynamic";
export const revalidate = 30;

export const metadata = {
  title: "Mempool · BlobLens",
  description:
    "Ethereum mempool observability — the MEV that public mempools expose, and how encrypted mempools (EIP-8184 / Lucid) eliminate it. Live sandwich detection since Dencun.",
};

export default function MevPage() {
  return <MevClient />;
}
