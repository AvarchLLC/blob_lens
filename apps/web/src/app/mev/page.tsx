import MevClient from "./MevClient";

export const dynamic = "force-dynamic";
export const revalidate = 30;

export default function MevPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* header */}
        <div className="mb-8">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🥪</span>
            <div>
              <h1 className="text-2xl font-bold text-white">MEV Sandwich Tracker</h1>
              <p className="mt-0.5 text-sm text-white/50">
                Native on-chain detection — Uniswap v2/v3, SushiSwap, Curve, DODO.
                All sandwiches since Dencun (EIP-4844)
              </p>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2 text-xs text-white/40">
            <span className="rounded-full border border-white/10 px-3 py-1">
              Source: ethereum.logs + ethereum.transactions
            </span>
            <span className="rounded-full border border-white/10 px-3 py-1">
              Detection: same-pool same-block frontrun→victim→backrun pattern
            </span>
            <span className="rounded-full border border-white/10 px-3 py-1">
              Live updates every 30s
            </span>
          </div>
        </div>

        <MevClient />
      </div>
    </div>
  );
}
