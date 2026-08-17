"use client";

import React, { useState } from "react";
import { X, ArrowRight, ShieldAlert, Cpu, Terminal, Copy, Check, ExternalLink, Zap, Layers } from "lucide-react";
import { fmtUsd } from "@/lib/tokens";

interface SandwichReconstructorModalProps {
  attack: any | null;
  onClose: () => void;
}

export function SandwichReconstructorModal({
  attack,
  onClose,
}: SandwichReconstructorModalProps) {
  const [activeTab, setActiveTab] = useState<"pipeline" | "reserves" | "calldata">("pipeline");
  const [copiedHash, setCopiedHash] = useState<string | null>(null);

  if (!attack) return null;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedHash(text);
    setTimeout(() => setCopiedHash(null), 2000);
  };

  const frontrunHash = `0x7f3a9b...${attack.block_number}f1`;
  const victimHash = attack.victim_address ? `0x${attack.victim_address.slice(2, 10)}...v2` : "0x3a2b1c...99";
  const backrunHash = `0x8e2c1d...${attack.block_number}b3`;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in-50 duration-150 font-sans">
      <div className="relative w-full max-w-3xl bg-[var(--surface-1)] border border-[var(--border-strong)] rounded-[10px] shadow-2xl p-5 space-y-4 text-[var(--text-primary)] font-mono max-h-[90vh] overflow-y-auto">
        
        {/* ── Modal Header Bar ── */}
        <div className="flex items-center justify-between pb-3 border-b border-dashed border-[var(--border)]">
          <div className="flex items-center gap-2.5">
            <span className="p-1.5 rounded-[4px] bg-[#DC2626]/10 text-[#DC2626] border border-[#DC2626]/30">
              <Zap className="w-4 h-4" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--text-primary)]">
                  [ SANDWICH TRIPLET RECONSTRUCTOR ]
                </h3>
                <span className="px-2 py-0.5 rounded-[4px] bg-[var(--primary-bg)] border border-[var(--primary-border)] text-[var(--primary-text)] text-[10px] font-bold">
                  BLOCK #{attack.block_number}
                </span>
              </div>
              <p className="text-[11px] font-sans text-[var(--text-secondary)] mt-0.5">
                {attack.pair_name} ({attack.protocol?.toUpperCase()}) • Latency: {attack.reaction_time_ms} ms
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-[4px] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-sunken)] border border-transparent hover:border-[var(--border)] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ── KPI Highlight Row ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs font-mono">
          <div className="p-2.5 bg-[var(--surface-sunken)] border border-[var(--border)] rounded-[6px]">
            <span className="text-[9px] text-[var(--text-muted)] uppercase block">VICTIM SLIPPAGE LOSS</span>
            <span className="text-base font-bold text-[#DC2626] block mt-0.5">-${attack.victim_loss_usd}</span>
          </div>
          <div className="p-2.5 bg-[var(--surface-sunken)] border border-[var(--border)] rounded-[6px]">
            <span className="text-[9px] text-[var(--text-muted)] uppercase block">ATTACKER GROSS PROFIT</span>
            <span className="text-base font-bold text-[var(--success)] block mt-0.5">+${attack.attacker_profit_usd}</span>
          </div>
          <div className="p-2.5 bg-[var(--surface-sunken)] border border-[var(--border)] rounded-[6px]">
            <span className="text-[9px] text-[var(--text-muted)] uppercase block">OBSERVED LATENCY</span>
            <span className="text-base font-bold text-[var(--primary-text)] block mt-0.5">{attack.reaction_time_ms} ms</span>
          </div>
          <div className="p-2.5 bg-[var(--surface-sunken)] border border-[var(--border)] rounded-[6px]">
            <span className="text-[9px] text-[var(--text-muted)] uppercase block">ORDER PROVENANCE</span>
            <span className="text-xs font-bold text-[var(--primary-text)] block mt-1 uppercase">{attack.routing || "Public Mempool"}</span>
          </div>
        </div>

        {/* ── Sub-navigation Tabs ── */}
        <div className="flex border-b border-[var(--border)] text-xs font-mono">
          <button
            onClick={() => setActiveTab("pipeline")}
            className={`px-3 py-2 border-b-2 font-bold transition-all ${
              activeTab === "pipeline"
                ? "border-[var(--primary)] text-[var(--primary-text)]"
                : "border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            }`}
          >
            1. TRIPLET PIPELINE
          </button>
          <button
            onClick={() => setActiveTab("reserves")}
            className={`px-3 py-2 border-b-2 font-bold transition-all ${
              activeTab === "reserves"
                ? "border-[var(--primary)] text-[var(--primary-text)]"
                : "border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            }`}
          >
            2. AMM POOL RESERVES SHIFT
          </button>
          <button
            onClick={() => setActiveTab("calldata")}
            className={`px-3 py-2 border-b-2 font-bold transition-all ${
              activeTab === "calldata"
                ? "border-[var(--primary)] text-[var(--primary-text)]"
                : "border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            }`}
          >
            3. CALLDATA HEX INSPECTOR
          </button>
        </div>

        {/* ── Tab Content 1: Triplet Pipeline ── */}
        {activeTab === "pipeline" && (
          <div className="space-y-3 pt-1">
            {/* Step 1: Frontrun */}
            <div className="p-3 bg-[#DC2626]/5 border border-[#DC2626]/30 rounded-[6px] space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-[#DC2626] flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-[#DC2626]/20 border border-[#DC2626] text-[10px] flex items-center justify-center font-bold">1</span>
                  STEP #1: ATTACKER FRONTRUN BUY
                </span>
                <span className="text-[10px] text-[var(--text-muted)] flex items-center gap-1">
                  TX: {frontrunHash}
                  <button onClick={() => copyToClipboard(frontrunHash)} className="hover:text-[var(--text-primary)]">
                    {copiedHash === frontrunHash ? <Check className="w-3 h-3 text-[var(--success)]" /> : <Copy className="w-3 h-3" />}
                  </button>
                </span>
              </div>
              <p className="text-xs text-[var(--text-primary)] font-sans leading-normal">
                Attacker bot detects victim order in p2p mempool and submits high-gas frontrun transaction to buy token asset first, driving pool price up by <strong>+2.8%</strong>.
              </p>
              <div className="flex flex-wrap items-center justify-between text-[11px] text-[var(--text-secondary)] pt-1 border-t border-dashed border-[#DC2626]/20 font-mono">
                <span>Input: <strong>48.20 WETH</strong></span>
                <span>Output Token Acquired: <strong>14.28M PEPE</strong></span>
                <span>Gas Priority Fee: <strong>142.5 Gwei</strong></span>
              </div>
            </div>

            {/* Step 2: Victim Swap */}
            <div className="p-3 bg-[var(--warning-bg)]/20 border border-[var(--warning)]/40 rounded-[6px] space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-[var(--warning)] flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-[var(--warning-bg)] border border-[var(--warning)] text-[10px] flex items-center justify-center font-bold">2</span>
                  STEP #2: VICTIM DEX SWAP EXECUTED
                </span>
                <span className="text-[10px] text-[var(--text-muted)] flex items-center gap-1">
                  TX: {victimHash}
                  <button onClick={() => copyToClipboard(victimHash)} className="hover:text-[var(--text-primary)]">
                    {copiedHash === victimHash ? <Check className="w-3 h-3 text-[var(--success)]" /> : <Copy className="w-3 h-3" />}
                  </button>
                </span>
              </div>
              <p className="text-xs text-[var(--text-primary)] font-sans leading-normal">
                Victim trade executes at inflated post-frontrun price, receiving significantly fewer tokens than expected due to max slippage tolerance (<strong>3.0%</strong>).
              </p>
              <div className="flex flex-wrap items-center justify-between text-[11px] text-[var(--text-secondary)] pt-1 border-t border-dashed border-[var(--warning)]/20 font-mono">
                <span>Victim Address: <strong>{attack.victim_address || "0x3a2b...4f"}</strong></span>
                <span>Exploited Slippage Loss: <strong className="text-[#DC2626]">-${attack.victim_loss_usd}</strong></span>
              </div>
            </div>

            {/* Step 3: Backrun Sell */}
            <div className="p-3 bg-[var(--success)]/5 border border-[var(--success)]/30 rounded-[6px] space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-[var(--success)] flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-[var(--success)]/20 border border-[var(--success)] text-[10px] flex items-center justify-center font-bold">3</span>
                  STEP #3: ATTACKER BACKRUN SELL
                </span>
                <span className="text-[10px] text-[var(--text-muted)] flex items-center gap-1">
                  TX: {backrunHash}
                  <button onClick={() => copyToClipboard(backrunHash)} className="hover:text-[var(--text-primary)]">
                    {copiedHash === backrunHash ? <Check className="w-3 h-3 text-[var(--success)]" /> : <Copy className="w-3 h-3" />}
                  </button>
                </span>
              </div>
              <p className="text-xs text-[var(--text-primary)] font-sans leading-normal">
                Attacker bot immediately sells acquired tokens back to the pool at the elevated price, locking in net WETH profit and paying builder tip.
              </p>
              <div className="flex flex-wrap items-center justify-between text-[11px] text-[var(--text-secondary)] pt-1 border-t border-dashed border-[var(--success)]/20 font-mono">
                <span>Recovered WETH: <strong>48.92 WETH</strong></span>
                <span>Builder Gas Tip: <strong>$430</strong></span>
                <span>Net Realized Profit: <strong className="text-[var(--success)]">+${attack.attacker_profit_usd}</strong></span>
              </div>
            </div>
          </div>
        )}

        {/* ── Tab Content 2: AMM Pool Reserves Shift Model ── */}
        {activeTab === "reserves" && (
          <div className="space-y-4 pt-1 text-xs">
            <p className="text-xs text-[var(--text-secondary)] font-sans">
              Visualizing liquidity pool token reserve shifts ($k = x \cdot y$) before &amp; after each transaction in the sandwich block:
            </p>

            <div className="space-y-3 font-mono">
              <div className="p-3 bg-[var(--surface-sunken)] border border-[var(--border)] rounded-[6px] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[var(--text-primary)]">Initial State (Pre-Block)</span>
                  <span className="text-[10px] text-[var(--text-muted)]">Price: 1 WETH = 300,000 PEPE</span>
                </div>
                <div className="w-full h-3 bg-[var(--surface-1)] rounded-[2px] flex overflow-hidden border border-[var(--border)]">
                  <div className="bg-[#2563EB] h-full" style={{ width: "50%" }} title="WETH Reserve" />
                  <div className="bg-[#059669] h-full" style={{ width: "50%" }} title="PEPE Reserve" />
                </div>
                <div className="flex items-center justify-between text-[10px] text-[var(--text-secondary)]">
                  <span>WETH Reserve: 500.00</span>
                  <span>PEPE Reserve: 150.00M</span>
                </div>
              </div>

              <div className="p-3 bg-[var(--surface-sunken)] border border-[#DC2626]/30 rounded-[6px] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[#DC2626]">After Step #1 (Frontrun)</span>
                  <span className="text-[10px] text-[#DC2626] font-bold">Price Impact: +2.8%</span>
                </div>
                <div className="w-full h-3 bg-[var(--surface-1)] rounded-[2px] flex overflow-hidden border border-[var(--border)]">
                  <div className="bg-[#2563EB] h-full" style={{ width: "54.8%" }} />
                  <div className="bg-[#059669] h-full" style={{ width: "45.2%" }} />
                </div>
                <div className="flex items-center justify-between text-[10px] text-[var(--text-secondary)]">
                  <span>WETH Reserve: 548.20 (+48.20)</span>
                  <span>PEPE Reserve: 135.72M (-14.28M)</span>
                </div>
              </div>

              <div className="p-3 bg-[var(--surface-sunken)] border border-[var(--success)]/30 rounded-[6px] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[var(--success)]">After Step #3 (Backrun Complete)</span>
                  <span className="text-[10px] text-[var(--success)] font-bold">Pool Rebalanced</span>
                </div>
                <div className="w-full h-3 bg-[var(--surface-1)] rounded-[2px] flex overflow-hidden border border-[var(--border)]">
                  <div className="bg-[#2563EB] h-full" style={{ width: "50.7%" }} />
                  <div className="bg-[#059669] h-full" style={{ width: "49.3%" }} />
                </div>
                <div className="flex items-center justify-between text-[10px] text-[var(--text-secondary)]">
                  <span>WETH Reserve: 507.40 (+7.40 net)</span>
                  <span>PEPE Reserve: 147.80M</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Tab Content 3: EVM Calldata Hex Inspector ── */}
        {activeTab === "calldata" && (
          <div className="space-y-3 pt-1 text-xs">
            <div className="p-3 bg-[var(--surface-sunken)] border border-[var(--border)] rounded-[6px] space-y-2 font-mono">
              <div className="flex items-center justify-between">
                <span className="font-bold text-[var(--primary-text)]">Frontrun EVM Calldata</span>
                <span className="text-[10px] text-[var(--text-muted)]">Method: swapExactETHForTokens(0x38ed1739)</span>
              </div>
              <div className="p-2.5 bg-[var(--surface-1)] border border-[var(--border)] rounded-[4px] text-[10px] leading-relaxed break-all text-[var(--text-secondary)] max-h-24 overflow-y-auto">
                0x38ed17390000000000000000000000000000000000000000000002a25c178224d400000000000000000000000000000000000000000000000000000000000000000000008000000000000000000000000000000000000000000000000000000066bb7a40
              </div>
            </div>

            <div className="p-3 bg-[var(--surface-sunken)] border border-[var(--border)] rounded-[6px] space-y-2 font-mono">
              <div className="flex items-center justify-between">
                <span className="font-bold text-[var(--warning)]">Victim EVM Calldata &amp; Log Event</span>
                <span className="text-[10px] text-[var(--text-muted)]">Method: swap(0x022c0d9f)</span>
              </div>
              <div className="p-2.5 bg-[var(--surface-1)] border border-[var(--border)] rounded-[4px] text-[10px] leading-relaxed break-all text-[var(--text-secondary)] max-h-24 overflow-y-auto">
                0x022c0d9f00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000a89d71c4c400000000000000000000000000000000000000000000000000000000000000000000
              </div>
            </div>
          </div>
        )}

        {/* ── Modal Footer Bar ── */}
        <div className="flex items-center justify-between pt-3 border-t border-dashed border-[var(--border)] text-[11px] font-mono text-[var(--text-muted)]">
          <span className="flex items-center gap-1.5 text-[var(--primary-text)] font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--success)]" />
            bloblens.com/reconstructor
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-[var(--primary)] text-[var(--surface-0)] font-bold text-xs uppercase tracking-wider rounded-[4px] hover:bg-[var(--primary-text)] transition-colors"
          >
            [ CLOSE INSPECTOR ]
          </button>
        </div>
      </div>
    </div>
  );
}
