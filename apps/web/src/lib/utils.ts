import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { MarketRegime } from "@/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function classifyRegime(maxBlobsInBlock: number): MarketRegime {
  if (maxBlobsInBlock <= 2) return "undersaturated";
  if (maxBlobsInBlock === 3) return "healthy";
  if (maxBlobsInBlock <= 5) return "congested";
  return "spike";
}

export function regimeColor(regime: MarketRegime): string {
  const map: Record<MarketRegime, string> = {
    undersaturated: "bg-slate-700/50 text-slate-300 border-slate-600",
    healthy: "bg-emerald-900/50 text-emerald-300 border-emerald-700",
    congested: "bg-amber-900/50 text-amber-300 border-amber-700",
    spike: "bg-red-900/50 text-red-300 border-red-700",
  };
  return map[regime];
}

export function formatFee(weiString: string): string {
  const gwei = Number(weiString) / 1e9;
  if (gwei < 0.0001) return "< 0.0001 gwei";
  return `${gwei.toFixed(4)} gwei`;
}

export function formatNumber(n: number): string {
  return new Intl.NumberFormat().format(n);
}

export function timeAgo(dateString: string): string {
  const seconds = Math.floor(
    (Date.now() - new Date(dateString).getTime()) / 1000
  );
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

export function shortHash(hash: string): string {
  return `${hash.slice(0, 8)}…${hash.slice(-6)}`;
}
