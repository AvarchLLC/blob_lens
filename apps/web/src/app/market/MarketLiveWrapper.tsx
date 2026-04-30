"use client";

import { BlobFeeLineChart } from "@/components/charts/BlobFeeLineChart";
import { BlobsPerBlockChart } from "@/components/charts/BlobsPerBlockChart";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import type { MarketHour } from "@/types";
import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((r) => r.json());
const REFRESH_MS = Number(process.env.NEXT_PUBLIC_MARKET_REFRESH_MS ?? 12000);

interface Props {
  initialData: MarketHour[];
}

export function MarketLiveWrapper({ initialData }: Props) {
  const { data } = useSWR<{ data: MarketHour[] }>(
    "/api/market?hours=24",
    fetcher,
    { refreshInterval: REFRESH_MS, fallbackData: { data: initialData } }
  );

  const market = data?.data ?? initialData;

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <p className="text-sm font-semibold text-foreground">Live Fee Trend</p>
        </CardHeader>
        <CardContent>
          <BlobFeeLineChart data={market} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <p className="text-sm font-semibold text-foreground">Live Blobs/Block</p>
        </CardHeader>
        <CardContent>
          <BlobsPerBlockChart data={market} />
        </CardContent>
      </Card>
    </div>
  );
}
