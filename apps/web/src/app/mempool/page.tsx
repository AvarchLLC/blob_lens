import { Metadata } from "next";
import { MempoolClient } from "./mempool-client";

export const metadata: Metadata = {
  title: "Encrypted Mempool & MEV Observability | BlobLens",
  description:
    "Ethereum mempool & EIP-8184 (Lucid) encrypted mempool observatory — tracking the MEV surface encryption erases, public vs private order flow, builder concentration, and decryptor committee health.",
};

export default function MempoolPage() {
  return <MempoolClient />;
}
