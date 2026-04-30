"use client";

import { classifyRegime } from "@/lib/utils";
import type { MarketHour } from "@/types";
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

const REGIME_FILL: Record<string, string> = {
  undersaturated: "#64748b",
  healthy: "#10b981",
  congested: "#f59e0b",
  spike: "#ef4444",
};

function shortHour(iso: string) {
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}h`;
}

interface Props {
  data: MarketHour[];
}

export function BlobsPerBlockChart({ data }: Props) {
  if (!data.length)
    return <p className="py-8 text-center text-sm text-muted-foreground">No data</p>;

  const chartData = data.map((d) => ({
    ts: shortHour(d.hour),
    blobs: d.blob_count,
    regime: classifyRegime(d.max_blobs_in_block),
  }));

  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={chartData} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis dataKey="ts" tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
        <YAxis tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} axisLine={false} tickLine={false} />
        <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} cursor={{ fill: "var(--accent)" }} />
        <Bar dataKey="blobs" radius={[3, 3, 0, 0]} name="Blobs">
          {chartData.map((d, i) => (
            <Cell key={i} fill={REGIME_FILL[d.regime]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
