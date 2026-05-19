"use client";

import { BlobLeaderboardTable } from "@/components/tables/BlobLeaderboardTable";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import type { LeaderboardRow, SparklinePoint } from "@/types";
import * as React from "react";
import useSWR from "swr";

const fetcher = (url: string) =>
  fetch(url).then((r) => r.json()) as Promise<{ data: LeaderboardRow[] }>;

const REFRESH_MS = Number(
  process.env.NEXT_PUBLIC_LEADERBOARD_REFRESH_MS ?? 30000
);

const TIME_OPTIONS = [
  { value: "1", label: "1h" },
  { value: "6", label: "6h" },
  { value: "24", label: "24h" },
  { value: "168", label: "7d" },
];

interface Props {
  initialLeaderboard: LeaderboardRow[];
  sparklines: SparklinePoint[];
}

export function LeaderboardClient({ initialLeaderboard, sparklines }: Props) {
  const [hours, setHours] = React.useState("24");

  const { data, isLoading } = useSWR(
    `/api/leaderboard?hours=${hours}`,
    fetcher,
    {
      refreshInterval: REFRESH_MS,
      fallbackData: hours === "24" ? { data: initialLeaderboard } : undefined,
    }
  );

  const rows = data?.data ?? [];

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-6 px-6 pt-2">
        <div className="flex items-center gap-2">
           <span className="text-[10px] font-bold uppercase tracking-widest text-text-secondary opacity-60">Window:</span>
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
        <p className="text-[10px] font-bold uppercase tracking-widest text-text-secondary opacity-40">
          {rows.length} rollups tracked
        </p>
      </div>

      {isLoading && rows.length === 0 ? (
        <div className="px-6 space-y-4">
          {Array.from({ length: 10 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full bg-surface-elevated" />
          ))}
        </div>
      ) : (
        <div className="border-t border-border">
          <BlobLeaderboardTable rows={rows} sparklines={sparklines} />
        </div>
      )}
    </div>
  );
}
