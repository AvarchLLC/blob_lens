"use client";

import { RollupShareDonut } from "@/components/charts/RollupShareDonut";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import type { LeaderboardRow } from "@/types";
import { PieChart } from "lucide-react";
import * as React from "react";
import useSWR from "swr";

const fetcher = (url: string) =>
  fetch(url).then((r) => r.json()) as Promise<{ data: LeaderboardRow[] }>;

const TIME_OPTIONS = [
  { value: "1",   label: "1h" },
  { value: "6",   label: "6h" },
  { value: "24",  label: "24h" },
  { value: "168", label: "7d" },
];

interface Props {
  initialData: LeaderboardRow[];
}

export function RollupShareCard({ initialData }: Props) {
  const [hours, setHours] = React.useState("24");

  const { data, isLoading } = useSWR(
    `/api/leaderboard?hours=${hours}`,
    fetcher,
    {
      fallbackData: hours === "24" ? { data: initialData } : undefined,
      refreshInterval: 30_000,
    }
  );

  const rows = data?.data ?? [];

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <PieChart className="h-4 w-4 text-primary" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-text-secondary opacity-60">Market Share</span>
        </div>
        <Select value={hours} onValueChange={setHours}>
          <SelectTrigger className="h-7 w-20 text-[10px] font-bold uppercase tracking-wider bg-surface-elevated border-border">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-surface border-border">
            {TIME_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value} className="text-[10px] font-bold uppercase tracking-wider">
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex-1 flex items-center justify-center min-h-[300px]">
        {isLoading && rows.length === 0 ? (
          <Skeleton className="h-56 w-56 rounded-full bg-surface-elevated" />
        ) : (
          <RollupShareDonut data={rows} />
        )}
      </div>
    </div>
  );
}
