"use client";

import useSWR from "swr";

const fetcher = (url: string) =>
  fetch(url).then((r) => r.json()) as Promise<{ usd: number | null }>;

export function useEthPrice(): number | null {
  const { data } = useSWR("/api/eth-price", fetcher, {
    refreshInterval: 300_000,
    dedupingInterval: 300_000,
  });
  return data?.usd ?? null;
}
