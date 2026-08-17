import type { Metadata } from "next";
import { EipsClient } from "./eips-client";

export const metadata: Metadata = {
  title: "EIP Explorer — BlobLens",
  description: "Browse Ethereum Improvement Proposals tracked by BlobLens — from EIP-4844 blobs to EIP-7904 Glamsterdam gas repricing.",
};

export default function EipsPage() {
  return <EipsClient />;
}
