/**
 * Shared retro-brutalist theme tokens for BlobLens analytics consoles.
 * Mirrors the inline `TC` registry used by the MEV tracker so pages that
 * live alongside it (ETM console, future telemetry pages) stay visually
 * consistent without redefining the palette.
 */
export interface TC {
  pageBg: string; pageText: string;
  card: string; cardBorder: string;
  text: string; muted: string; faint: string; veryFaint: string;
  tableRow: string; tableBorder: string; tableHead: string;
  tabBar: string; tabActive: string; tabInactive: string;
  kpiBg: string; kpiBorder: string;
  bannerBg: string; bannerBorder: string; bannerText: string; bannerSub: string; bannerBar: string; bannerBarBg: string;
  ttBg: string; ttBorder: string; ttColor: string;
  axis: string; grid: string;
}

export const DARK: TC = {
  pageBg: "bg-[#0c0c16]", pageText: "text-white",
  card: "bg-[#13131f]", cardBorder: "border-white/[0.08]",
  text: "text-white", muted: "text-white/50", faint: "text-white/30", veryFaint: "text-white/20",
  tableRow: "hover:bg-white/[0.03]", tableBorder: "border-white/[0.06]", tableHead: "text-white/35",
  tabBar: "border-white/10",
  tabActive: "text-white border-b-2 border-pink-400 bg-white/[0.06]",
  tabInactive: "text-white/40 hover:text-white/70",
  kpiBg: "bg-white/[0.04]", kpiBorder: "border-white/[0.08]",
  bannerBg: "bg-amber-500/10", bannerBorder: "border-amber-500/25",
  bannerText: "text-amber-300", bannerSub: "text-amber-400/60",
  bannerBar: "bg-amber-400", bannerBarBg: "bg-white/10",
  ttBg: "#11111a", ttBorder: "#ffffff15", ttColor: "#fff",
  axis: "#ffffff40", grid: "#ffffff08",
};

export const LIGHT: TC = {
  pageBg: "bg-slate-50", pageText: "text-gray-900",
  card: "bg-white", cardBorder: "border-slate-200",
  text: "text-gray-900", muted: "text-gray-500", faint: "text-gray-400", veryFaint: "text-gray-300",
  tableRow: "hover:bg-slate-50", tableBorder: "border-slate-100", tableHead: "text-gray-400",
  tabBar: "border-slate-200",
  tabActive: "text-gray-900 border-b-2 border-pink-500 bg-slate-100",
  tabInactive: "text-gray-400 hover:text-gray-700",
  kpiBg: "bg-white", kpiBorder: "border-slate-200",
  bannerBg: "bg-amber-50", bannerBorder: "border-amber-200",
  bannerText: "text-amber-700", bannerSub: "text-amber-500",
  bannerBar: "bg-amber-500", bannerBarBg: "bg-amber-100",
  ttBg: "#ffffff", ttBorder: "#e2e8f0", ttColor: "#111827",
  axis: "#9ca3af", grid: "#f1f5f9",
};
