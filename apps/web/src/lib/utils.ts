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
    undersaturated: "border-[#3D3D4E]/50 bg-[#3D3D4E]/15 text-[#5C5575]",
    healthy: "border-[#1A8C6A]/40 bg-[#1A8C6A]/12 text-[#1A8C6A]",
    congested: "border-[#C4822A]/40 bg-[#C4822A]/12 text-[#C4822A]",
    spike: "border-[#C0394A]/40 bg-[#C0394A]/15 text-[#C0394A]",
  };
  return map[regime];
}

export const ROLLUP_COLORS: Record<string, string> = {
  Base: "#3D5AFE",
  "Arbitrum One": "#1A2B6D",
  "Arbitrum Nova": "#2B4CA0",
  "OP Mainnet": "#E8445A",
  Blast: "#F5A623",
  "zkSync Era": "#8A4FD8",
  Scroll: "#A87AE8",
  Linea: "#6B3FA0",
  Starknet: "#5D56E0",
  Mantle: "#00C48C",
  Taiko: "#E879F9",
  "World Chain": "#7C6BE9",
  Mode: "#7C3AED",
  Unichain: "#6366F1",
  Soneium: "#60A5FA",
  Ink: "#22D3EE",
  "Metal L2": "#F59E0B",
  UNKNOWN: "#3D3D4E",
};

export function rollupColor(rollup: string): string {
  return ROLLUP_COLORS[rollup] ?? "#6B7280";
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
  return `${hash.slice(0, 8)}...${hash.slice(-4)}`;
}
