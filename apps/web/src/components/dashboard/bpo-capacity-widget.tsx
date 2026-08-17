"use client";

import React from "react";
import { Cpu, Zap, Layers, ArrowUpRight } from "lucide-react";

export function BPOCapacityWidget() {
  return (
    <div className="flex flex-col gap-4 font-mono">
      {/* Active Baseline Status Header */}
      <div className="flex items-center justify-between p-3 bg-[var(--primary-bg)] border border-[var(--primary-border)] rounded-[6px]">
        <div className="flex items-center gap-2">
          <Cpu className="w-4 h-4 text-[var(--primary-text)]" />
          <div className="flex flex-col">
            <span className="text-[10px] uppercase font-bold text-[var(--primary-text)] tracking-wider">
              PROTOCOL PARADIGM
            </span>
            <span className="text-xs font-bold text-[var(--text-primary)] uppercase">
              PECTRA ACTIVATED (EIP-7691)
            </span>
          </div>
        </div>
        <span className="px-2 py-0.5 text-[10px] font-bold bg-[var(--primary)] text-[var(--primary-fg)] uppercase rounded-[4px]">
          2× Throughput
        </span>
      </div>

      {/* Target vs Max Capacity Progress Bar */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between text-xs text-[var(--text-secondary)]">
          <span>Target Throughput (6 Blobs / Block)</span>
          <span className="text-[var(--text-primary)] font-bold tabular-nums">3.84 / 6.0 Blobs (64.0%)</span>
        </div>

        {/* Progress Bar Container */}
        <div className="h-2.5 w-full bg-[var(--surface-sunken)] border border-[var(--border)] rounded-full overflow-hidden flex relative">
          {/* Active Target Portion (3.84 out of 6.0 blobs -> 64% of target, which is 42.6% of max 9 blobs) */}
          <div
            className="h-full bg-[var(--primary)] transition-all"
            style={{ width: "42.6%" }}
            title="3.84 Blobs (Active Avg)"
          />
          {/* Target Marker at 6.0 Blobs (66.6% of max 9 blobs) */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-[var(--warning)] z-10"
            style={{ left: "66.6%" }}
            title="Target Threshold (6 Blobs)"
          />
        </div>

        <div className="flex justify-between text-[10px] text-[var(--text-muted)]">
          <span>0 Blobs</span>
          <span className="text-[var(--warning)] font-bold">Target: 6 (768 KB)</span>
          <span className="font-bold">Max: 9 (1152 KB)</span>
        </div>
      </div>

      {/* Comparison Grid */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="p-2.5 bg-[var(--surface-sunken)] border border-[var(--border)] rounded-[6px] flex flex-col gap-1">
          <span className="text-[10px] text-[var(--text-muted)] uppercase">Current Capacity</span>
          <span className="text-sm font-bold text-[var(--text-primary)] tabular-nums">1,152 KB / block</span>
          <span className="text-[10px] text-[var(--success)]">EIP-7691 Baseline</span>
        </div>

        <div className="p-2.5 bg-[var(--surface-sunken)] border border-[var(--border)] rounded-[6px] flex flex-col gap-1">
          <span className="text-[10px] text-[var(--text-muted)] uppercase">Next Epoch (Fusaka)</span>
          <span className="text-sm font-bold text-[var(--primary-text)] tabular-nums">2,304 KB / block</span>
          <span className="text-[10px] text-[var(--primary-text)]">BPO2 Target: 12 / Max: 18</span>
        </div>
      </div>
    </div>
  );
}
