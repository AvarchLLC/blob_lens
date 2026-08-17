import { Suspense } from "react";
import { RollupClient } from "./rollup-client";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const name = decodeURIComponent(id).replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  return {
    title: `${name} — Rollup Profile | BlobLens`,
    description: `DA efficiency, blob volume, fee benchmarking and timing analysis for ${name} on Ethereum.`,
  };
}

export default async function RollupDetailPage({ params }: Props) {
  const { id } = await params;
  return (
    <main className="px-4 sm:px-6 pb-16">
      <Suspense fallback={
        <div className="flex items-center justify-center h-48 font-mono text-xs text-[var(--text-muted)] animate-pulse tracking-widest">
          [ LOADING ROLLUP DATA... ]
        </div>
      }>
        <RollupClient id={id} />
      </Suspense>
    </main>
  );
}
