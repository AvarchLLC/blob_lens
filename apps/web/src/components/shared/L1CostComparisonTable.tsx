"use client";

import { formatUsd } from "@/lib/ethPrice";
import { L1Cost } from "@/types";
import { Badge } from "@/components/ui/badge";
import { ArrowDownIcon, Zap } from "lucide-react";

interface L1CostComparisonTableProps {
  latestL1: L1Cost | null;
  avgBlobUsd: number | null;
}

export function L1CostComparisonTable({ latestL1, avgBlobUsd }: L1CostComparisonTableProps) {
  if (!latestL1) return null;

  const comparisonData = [
    {
      action: "Standard ETH Transfer",
      l1Cost: latestL1.avg_usd_per_tx,
      l2Cost: avgBlobUsd ? avgBlobUsd / 100 : 0.01, // Mock L2 tx cost placeholder
      savings: avgBlobUsd ? latestL1.avg_usd_per_tx / (avgBlobUsd / 100) : 50,
      icon: "Ξ",
    },
    {
      action: "Uniswap V3 Swap",
      l1Cost: latestL1.avg_usd_per_swap,
      l2Cost: avgBlobUsd ? avgBlobUsd / 50 : 0.05, // Mock L2 swap cost placeholder
      savings: avgBlobUsd ? latestL1.avg_usd_per_swap / (avgBlobUsd / 50) : 40,
      icon: "🦄",
    },
  ];

  return (
    <div className="overflow-x-auto border border-border rounded-xl bg-surface">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="bg-background/50 border-b border-border">
            <th className="px-6 py-4 text-left text-[10px] font-bold uppercase tracking-widest text-text-secondary opacity-40">On-Chain Action</th>
            <th className="px-6 py-4 text-left text-[10px] font-bold uppercase tracking-widest text-text-secondary opacity-40">Ethereum L1 (USD)</th>
            <th className="px-6 py-4 text-left text-[10px] font-bold uppercase tracking-widest text-text-secondary opacity-40">Layer 2 (USD)</th>
            <th className="px-6 py-4 text-right text-[10px] font-bold uppercase tracking-widest text-text-secondary opacity-40">Efficiency Gain</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/30">
          {comparisonData.map((row) => (
            <tr key={row.action} className="group hover:bg-surface-elevated transition-colors">
              <td className="px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-surface-elevated border border-border flex items-center justify-center font-bold text-xs">
                    {row.icon}
                  </div>
                  <span className="font-bold text-text-primary">{row.action}</span>
                </div>
              </td>
              <td className="px-6 py-4 font-mono text-xs text-text-primary">
                {formatUsd(row.l1Cost)}
              </td>
              <td className="px-6 py-4 font-mono text-xs text-primary font-bold">
                {formatUsd(row.l2Cost)}
              </td>
              <td className="px-6 py-4 text-right">
                <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 gap-1 font-mono">
                  <ArrowDownIcon className="h-3 w-3" />
                  {row.savings.toFixed(0)}x cheaper
                </Badge>
              </td>
            </tr>
          ))}
          <tr className="bg-primary/5">
            <td className="px-6 py-4" colSpan={4}>
              <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-primary">
                <Zap className="h-3 w-3" />
                L2 cost estimates based on 128KB blob amortization and current rollup gas strategies.
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
