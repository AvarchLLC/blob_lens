import { Suspense } from "react";
import { GasClient } from "./gas-client";

export const metadata = {
  title: "Gas Observatory | BlobLens",
  description:
    "Historical Ethereum gas tracking in ETH & USD, block utilization, transaction type distribution, and EIP-7904 Glamsterdam repricing impact.",
};

export default function GasPage() {
  return (
    <main className="px-4 sm:px-6 pb-16">
      <Suspense fallback={
        <div className="flex items-center justify-center h-48 font-mono text-xs text-[var(--text-muted)] animate-pulse tracking-widest">
          [ LOADING GAS DATA... ]
        </div>
      }>
        <GasClient />
      </Suspense>
    </main>
  );
}
