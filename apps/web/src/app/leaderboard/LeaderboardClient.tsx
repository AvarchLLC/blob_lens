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
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {rows.length} rollups tracked
        </p>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Period:</span>
          <Select value={hours} onValueChange={setHours}>
            <SelectTrigger className="w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TIME_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {isLoading && rows.length === 0 ? (
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : (
        <BlobLeaderboardTable rows={rows} sparklines={sparklines} />
      )}
    </div>
  );
}
