"use client";

import type { LeaderboardRow } from "@/types";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const PALETTE = [
  "#627eea", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6",
  "#06b6d4", "#ec4899", "#84cc16", "#f97316", "#6366f1",
];

interface Props {
  data: LeaderboardRow[];
}

export function RollupVolumeAreaChart({ data }: Props) {
  if (!data.length)
    return <p className="py-8 text-center text-sm text-muted-foreground">No data</p>;

  const top10 = data.slice(0, 10);
  const chartData = top10.map((d) => ({
    rollup: d.rollup.length > 12 ? d.rollup.slice(0, 12) + "…" : d.rollup,
    blobs: Number(d.total_blobs),
  }));

  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={chartData} layout="vertical" margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
        <XAxis type="number" tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} axisLine={false} tickLine={false} />
        <YAxis type="category" dataKey="rollup" tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} axisLine={false} tickLine={false} width={90} />
        <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} cursor={{ fill: "var(--accent)" }} formatter={(v: number) => [v.toLocaleString(), "blobs"]} />
        <Bar dataKey="blobs" radius={[0, 3, 3, 0]} name="Blobs">
          {chartData.map((_, i) => (
            <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
