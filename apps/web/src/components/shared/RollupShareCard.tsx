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
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-[#9D93B8]">
            <PieChart className="h-4 w-4" />
            <h2 className="section-title">Rollup Share</h2>
          </div>
          <Select value={hours} onValueChange={setHours}>
            <SelectTrigger className="h-7 w-20 text-xs">
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
      </CardHeader>
      <CardContent>
        {isLoading && rows.length === 0 ? (
          <div className="flex h-[280px] items-center justify-center">
            <Skeleton className="h-48 w-48 rounded-full" />
          </div>
        ) : (
          <RollupShareDonut data={rows} />
        )}
      </CardContent>
    </Card>
  );
}
