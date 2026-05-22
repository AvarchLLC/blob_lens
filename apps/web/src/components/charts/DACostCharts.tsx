"use client";

import { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LineChart,
  Line,
} from "recharts";
import { LeaderboardRow } from "@/types";
import { formatUsd } from "@/lib/ethPrice";

interface DACostChartsProps {
  leaderboard: LeaderboardRow[];
  ethUsd: number | null;
}

export function DACostCharts({ leaderboard, ethUsd }: DACostChartsProps) {
  // Filter and sort data for Cost per Byte (USD)
  const costPerByteData = useMemo(() => {
    return leaderboard
      .filter((r) => r.rollup !== "UNKNOWN" && Number(r.total_blobs) > 0)
      .map((r) => {
        // Prefer beacon-sourced cost_per_byte_eth if available,
        // otherwise estimate from da_cost_eth / (total_blobs * 128KB)
        const costPerMbUsd = r.cost_per_byte_eth != null && ethUsd
          ? r.cost_per_byte_eth * 1024 * ethUsd
          : ethUsd
            ? (r.da_cost_eth / (Number(r.total_blobs) * 0.128)) * ethUsd
            : 0;
        return { name: r.rollup, value: costPerMbUsd };
      })
      .filter((r) => r.value > 0)
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, [leaderboard, ethUsd]);

  // Sort data for Blobfulness Ratio
  const blobfulnessData = useMemo(() => {
    return leaderboard
      .filter((r) => r.rollup !== "UNKNOWN" && Number(r.total_blobs) > 0)
      .map((r) => ({
        name: r.rollup,
        // Prefer beacon fullness_pct, fall back to packing_score
        value: r.avg_fullness_pct != null ? r.avg_fullness_pct : (r.packing_score || 0),
      }))
      .filter((r) => r.value > 0)
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, [leaderboard]);

  // Sort data for Avg Cost per Blob (USD)
  const avgCostPerBlobData = useMemo(() => {
    return leaderboard
      .filter((r) => r.rollup !== "UNKNOWN" && r.total_blobs > 0)
      .map((r) => ({
        name: r.rollup,
        value: ethUsd ? (r.da_cost_eth / r.total_blobs) * ethUsd : 0,
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, [leaderboard, ethUsd]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Cost per MB (USD) */}
      <div className="bg-surface border border-border rounded-xl p-6 flex flex-col h-[400px]">
        <div className="mb-4">
          <h3 className="text-[10px] font-bold uppercase tracking-widest text-text-secondary opacity-60">
            Cost Efficiency
          </h3>
          <h4 className="text-sm font-bold text-text-primary">USD per MB Actually Used</h4>
        </div>
        <div className="flex-1 min-h-0">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={costPerByteData} layout="vertical" margin={{ left: 20, right: 30 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border)" opacity={0.3} />
              <XAxis 
                type="number" 
                tick={{ fontSize: 9 }} 
                stroke="var(--text-secondary)" 
                opacity={0.5}
                tickFormatter={(v) => `$${v.toFixed(2)}`}
              />
              <YAxis 
                dataKey="name" 
                type="category" 
                tick={{ fontSize: 9 }} 
                stroke="var(--text-secondary)" 
                opacity={0.8}
                width={70}
              />
              <Tooltip 
                contentStyle={{ backgroundColor: 'var(--surface-elevated)', borderColor: 'var(--border)', borderRadius: '8px', fontSize: '11px' }}
                formatter={(value: number) => [formatUsd(value), "Cost/MB"]}
              />
              <Bar dataKey="value" fill="var(--primary)" radius={[0, 4, 4, 0]}>
                {costPerByteData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fillOpacity={1 - index * 0.05} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Blobfulness Ratio */}
      <div className="bg-surface border border-border rounded-xl p-6 flex flex-col h-[400px]">
        <div className="mb-4">
          <h3 className="text-[10px] font-bold uppercase tracking-widest text-text-secondary opacity-60">
            Utilization
          </h3>
          <h4 className="text-sm font-bold text-text-primary">Blob Fullness Ratio (%)</h4>
        </div>
        <div className="flex-1 min-h-0">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={blobfulnessData} layout="vertical" margin={{ left: 20, right: 30 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border)" opacity={0.3} />
              <XAxis 
                type="number" 
                domain={[0, 100]}
                tick={{ fontSize: 9 }} 
                stroke="var(--text-secondary)" 
                opacity={0.5}
                tickFormatter={(v) => `${v}%`}
              />
              <YAxis 
                dataKey="name" 
                type="category" 
                tick={{ fontSize: 9 }} 
                stroke="var(--text-secondary)" 
                opacity={0.8}
                width={70}
              />
              <Tooltip 
                contentStyle={{ backgroundColor: 'var(--surface-elevated)', borderColor: 'var(--border)', borderRadius: '8px', fontSize: '11px' }}
                formatter={(value: number) => [`${value.toFixed(1)}%`, "Fullness"]}
              />
              <Bar dataKey="value" fill="#00df81" radius={[0, 4, 4, 0]}>
                 {blobfulnessData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fillOpacity={1 - index * 0.05} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Avg Cost per Blob (USD) */}
      <div className="bg-surface border border-border rounded-xl p-6 flex flex-col h-[400px]">
        <div className="mb-4">
          <h3 className="text-[10px] font-bold uppercase tracking-widest text-text-secondary opacity-60">
            Unit Economics
          </h3>
          <h4 className="text-sm font-bold text-text-primary">Avg Cost per Blob (USD)</h4>
        </div>
        <div className="flex-1 min-h-0">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={avgCostPerBlobData} layout="vertical" margin={{ left: 20, right: 30 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border)" opacity={0.3} />
              <XAxis 
                type="number" 
                tick={{ fontSize: 9 }} 
                stroke="var(--text-secondary)" 
                opacity={0.5}
                tickFormatter={(v) => `$${v.toFixed(3)}`}
              />
              <YAxis 
                dataKey="name" 
                type="category" 
                tick={{ fontSize: 9 }} 
                stroke="var(--text-secondary)" 
                opacity={0.8}
                width={70}
              />
              <Tooltip 
                contentStyle={{ backgroundColor: 'var(--surface-elevated)', borderColor: 'var(--border)', borderRadius: '8px', fontSize: '11px' }}
                formatter={(value: number) => [`$${value.toFixed(4)}`, "Cost/Blob"]}
              />
              <Bar dataKey="value" fill="#ff7c43" radius={[0, 4, 4, 0]}>
                 {avgCostPerBlobData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fillOpacity={1 - index * 0.05} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
