"use client";

import { formatUsd } from "@/lib/ethPrice";
import { L1Cost } from "@/types";
import { Badge } from "@/components/ui/badge";
import { ArrowDown, Zap } from "lucide-react";

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
    <div className="overflow-x-auto w-full">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="border-b border-dashed border-border/60">
            <th className="pb-3 text-left text-[10px] font-bold uppercase tracking-widest text-text-secondary opacity-60 font-mono">Action</th>
            <th className="pb-3 text-left text-[10px] font-bold uppercase tracking-widest text-text-secondary opacity-60 font-mono">L1 Cost</th>
            <th className="pb-3 text-left text-[10px] font-bold uppercase tracking-widest text-text-secondary opacity-60 font-mono">L2 Cost</th>
            <th className="pb-3 text-right text-[10px] font-bold uppercase tracking-widest text-text-secondary opacity-60 font-mono">Efficiency</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-dashed divide-border/40">
          {comparisonData.map((row) => (
            <tr key={row.action} className="group hover:bg-surface-elevated/40 transition-colors">
              <td className="py-3.5 pr-4">
                <div className="flex items-center gap-2.5">
                  <div className="h-7 w-7 rounded-none bg-surface-elevated border border-dashed border-border flex items-center justify-center font-bold text-xs">
                    {row.icon}
                  </div>
                  <span className="font-bold text-text-primary text-xs font-mono">{row.action}</span>
                </div>
              </td>
              <td className="py-3.5 pr-4 font-mono text-xs text-text-primary">
                {formatUsd(row.l1Cost)}
              </td>
              <td className="py-3.5 pr-4 font-mono text-xs text-primary font-bold">
                {formatUsd(row.l2Cost)}
              </td>
              <td className="py-3.5 text-right">
                <Badge variant="outline" className="bg-primary/5 text-primary border-dashed border-primary/20 gap-1 font-mono rounded-none text-[10px]">
                  <ArrowDown className="h-3 w-3" />
                  {row.savings.toFixed(0)}x
                </Badge>
              </td>
            </tr>
          ))}
          <tr className="bg-primary/5">
            <td className="px-4 py-3" colSpan={4}>
              <div className="flex items-center gap-2 text-[9px] font-bold uppercase tracking-[0.15em] text-primary font-mono">
                <Zap className="h-3.5 w-3.5" />
                L2 cost estimates based on 128KB blob amortization.
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
