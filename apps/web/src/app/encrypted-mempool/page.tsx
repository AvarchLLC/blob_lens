import { Metadata } from "next";
import { EncryptedMempoolClient } from "./encrypted-mempool-client";

export const metadata: Metadata = {
  title: "Encrypted Mempool Observatory (EIP-8184 Lucid) | BlobLens",
  description:
    "Observability layer for Ethereum's transition to encrypted mempools (EIP-8184 Lucid). Auditing sealed transaction capacity, decryptor committee health, key withholding, and early leakage anomalies.",
};

export default function EncryptedMempoolPage() {
  return <EncryptedMempoolClient />;
}
