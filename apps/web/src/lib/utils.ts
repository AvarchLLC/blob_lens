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
    undersaturated: "border-[#3D4F6B]/50 bg-[#3D4F6B]/15 text-[#4B5563]",
    healthy:        "border-[#10B981]/40 bg-[#10B981]/10 text-[#10B981]",
    congested:      "border-[#F59E0B]/40 bg-[#F59E0B]/10 text-[#F59E0B]",
    spike:          "border-[#EF4444]/40 bg-[#EF4444]/10 text-[#EF4444]",
  };
  return map[regime];
}

export const ROLLUP_COLORS: Record<string, string> = {
  Base:                   "#2563EB",
  "Arbitrum One":         "#1D4ED8",
  "Arbitrum Nova":        "#1E40AF",
  "OP Mainnet":           "#DC2626",
  Blast:                  "#CA8A04",
  "zkSync Era":           "#7C3AED",
  Scroll:                 "#D97706",
  Linea:                  "#0D9488",
  Starknet:               "#BE185D",
  Mantle:                 "#0E7490",
  Taiko:                  "#EA580C",
  WorldChain:             "#4F46E5",
  "World Chain":          "#4F46E5",
  Mode:                   "#15803D",
  Zora:                   "#9333EA",
  Unichain:               "#0891B2",
  Soneium:                "#1E40AF",
  Ink:                    "#6D28D9",
  "Metal L2":             "#92400E",
  Hemi:                   "#3730A3",
  Fraxtal:                "#065F46",
  Lisk:                   "#1E3A5F",
  Cyber:                  "#155E75",
  Derive:                 "#1C1917",
  Zircuit:                "#4338CA",
  "Swell Chain":          "#0369A1",
  SwellChain:             "#0369A1",
  "Swan Chain":           "#7E22CE",
  SwanChain:              "#7E22CE",
  SuperSeed:              "#0F766E",
  Superlumio:             "#6D28D9",
  "Zero Network":         "#1F2937",
  ZeroNetwork:            "#1F2937",
  "The Binary Holdings":  "#92400E",
  "Polygon zkEVM":        "#7B3FE4",
  "Polygon ZkEVM":        "#7B3FE4",
  UNKNOWN:                "#374151",
};

// Maps display name → icon filename in /public/l2/icons/
export const ROLLUP_ICONS: Record<string, string> = {
  Base:                   "base.png",
  "Arbitrum One":         "arbitrum.png",
  "Arbitrum Nova":        "nova.png",
  "OP Mainnet":           "op-mainnet.png",
  Blast:                  "blast.png",
  "zkSync Era":           "zksync-era.png",
  Scroll:                 "scroll.png",
  Linea:                  "linea.png",
  Starknet:               "starknet.png",
  Mantle:                 "mantle.png",
  Taiko:                  "taiko.png",
  WorldChain:             "world.png",
  "World Chain":          "world.png",
  Mode:                   "mode.png",
  Zora:                   "zora.png",
  Unichain:               "unichain.png",
  Soneium:                "soneium.png",
  Ink:                    "ink.png",
  "Metal L2":             "metal.png",
  Hemi:                   "hemi.png",
  Fraxtal:                "fraxtal.png",
  Lisk:                   "lisk.png",
  Cyber:                  "cyber.png",
  Derive:                 "derive.png",
  Zircuit:                "zircuit.png",
  "Swell Chain":          "swell.png",
  SwellChain:             "swell.png",
  "Swan Chain":           "swan.png",
  SwanChain:              "swan.png",
  SuperSeed:              "superseed.png",
  Superlumio:             "superlumio.png",
  "Zero Network":         "zeronetwork.png",
  ZeroNetwork:            "zeronetwork.png",
  "The Binary Holdings":  "thebinaryholdings.png",
  "Polygon zkEVM":        "polygonzkevm.png",
  "Polygon ZkEVM":        "polygonzkevm.png",
};

export function rollupColor(rollup: string): string {
  return ROLLUP_COLORS[rollup] ?? "#6B7280";
}

export function rollupIcon(rollup: string): string | null {
  const file = ROLLUP_ICONS[rollup];
  return file ? `/l2/icons/${file}` : null;
}

export function formatFee(weiValue: string | number): string {
  const gwei = Number(weiValue) / 1e9;
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
