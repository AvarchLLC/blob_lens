"use client";

import type { MarketHour } from "@/types";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

function shortHour(iso: string) {
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}h`;
}

interface Props {
  data: MarketHour[];
}

export function BlobFeeLineChart({ data }: Props) {
  if (!data.length)
    return <p className="py-8 text-center text-sm text-muted-foreground">No data</p>;

  const chartData = data.map((d) => ({
    ts: shortHour(d.hour),
    avgFee: parseFloat((Number(d.avg_fee) / 1e9).toFixed(6)),
  }));

  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart data={chartData} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis dataKey="ts" tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
        <YAxis tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} axisLine={false} tickLine={false} />
        <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} formatter={(v: number) => [`${v} gwei`, "Avg fee"]} />
        <Line type="monotone" dataKey="avgFee" stroke="var(--primary)" strokeWidth={2} dot={false} name="Avg fee" />
      </LineChart>
    </ResponsiveContainer>
  );
}
