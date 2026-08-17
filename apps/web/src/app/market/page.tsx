import { Suspense } from "react";
import { MarketClient } from "./market-client";

export const metadata = {
  title: "Blob Fee Market | BlobLens",
  description:
    "Real-time EIP-4844 blob fee market analysis — regime classification, historical cost benchmarking, slot utilization, congestion forecasting, and per-rollup activity.",
};

export default function MarketPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-48 font-mono text-xs text-[var(--text-muted)] animate-pulse tracking-widest">
          [ LOADING MARKET DATA... ]
        </div>
      }
    >
      <MarketClient />
    </Suspense>
  );
}
