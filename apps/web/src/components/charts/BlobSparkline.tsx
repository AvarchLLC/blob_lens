"use client";

import type { SparklinePoint } from "@/types";
import { Line, LineChart, ResponsiveContainer } from "recharts";

interface Props {
  points: SparklinePoint[];
}

export function BlobSparkline({ points }: Props) {
  if (!points.length) return <span className="text-xs text-muted-foreground">—</span>;

  const data = points.map((p) => ({ v: Number(p.blobs) }));
  return (
    <ResponsiveContainer width={80} height={32}>
      <LineChart data={data}>
        <Line
          type="monotone"
          dataKey="v"
          stroke="var(--primary)"
          strokeWidth={1.5}
          dot={false}
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
