"use client";
import ECharts from "echarts-for-react";
import type { RollupNetworkGraph as NetworkGraphType } from "@/lib/queries";
import { formatNumber } from "@/lib/utils";
import { watermarkGraphic } from "@/lib/chartTheme";
import { useTheme } from "next-themes";
import { useEffect, useRef, useState } from "react";

// ── Logo map: rollup name → public asset path ──────────────────────────────
const LOGOS: Record<string, string> = {
  Base:             "/l2/icons/base.png",
  Arbitrum:         "/l2/icons/arbitrum.png",
  "OP Mainnet":     "/l2/icons/op-mainnet.png",
  Optimism:         "/l2/icons/optimism.png",
  Blast:            "/l2/icons/blast.png",
  StarkNet:         "/l2/icons/starknet.png",
  Starknet:         "/l2/icons/starknet.png",
  Scroll:           "/l2/icons/scroll.png",
  "zkSync Era":     "/l2/icons/zksync-era.png",
  "ZKsync Era":     "/l2/icons/zksync-era.png",
  Linea:            "/l2/icons/linea.png",
  Taiko:            "/l2/icons/taiko.png",
  Zora:             "/l2/icons/zora.png",
  Mantle:           "/l2/icons/mantle.png",
  Mode:             "/l2/icons/mode.png",
  "World Chain":    "/l2/icons/world.png",
  World:            "/l2/icons/world.png",
  Unichain:         "/l2/icons/unichain.png",
  Soneium:          "/l2/icons/soneium.png",
  dYdX:             "/l2/icons/dydx.png",
  "Polygon zkEVM":  "/l2/icons/polygonzkevm.png",
  Fraxtal:          "/l2/icons/fraxtal.png",
  Kroma:            "/l2/icons/kroma.png",
  Mint:             "/l2/icons/mint.png",
  Metal:            "/l2/icons/metal.png",
  Lisk:             "/l2/icons/lisk.png",
  Celo:             "/l2/icons/celo.png",
  Ink:              "/l2/icons/ink.png",
  BOB:              "/l2/icons/bob.png",
  Morph:            "/l2/icons/morph.png",
  Cyber:            "/l2/icons/cyber.png",
  Derive:           "/l2/icons/derive.png",
  Redstone:         "/l2/icons/redstone.png",
  Orderly:          "/l2/icons/orderly.png",
  Swell:            "/l2/icons/swell.png",
  Superseed:        "/l2/icons/superseed.png",
  Polynomial:       "/l2/icons/polynomial.png",
  Ethereum:         "/l2/icons/ethereum.png",
};

// ── Brand colors for labels + edge tinting ─────────────────────────────────
const BRAND: Record<string, string> = {
  Base:             "#0052FF",
  Arbitrum:         "#28A0F0",
  "OP Mainnet":     "#FF0420",
  Optimism:         "#FF0420",
  Blast:            "#FCFC03",
  StarkNet:         "#EC796B",
  Starknet:         "#EC796B",
  Scroll:           "#EEB25E",
  "zkSync Era":     "#5B8DB8",
  "ZKsync Era":     "#5B8DB8",
  Linea:            "#61DFFF",
  Taiko:            "#E81899",
  Zora:             "#A855F7",
  Mantle:           "#00C3A0",
  Mode:             "#DFFE00",
  "World Chain":    "#d4d4d8",
  World:            "#d4d4d8",
  Unichain:         "#FF007A",
  Soneium:          "#d4d4d8",
  dYdX:             "#6966FF",
  "Polygon zkEVM":  "#7B3FE4",
  Fraxtal:          "#00B2E8",
  Kroma:            "#17B89E",
  Ink:              "#A0B0FF",
  Ethereum:         "#627EEA",
};

function effColor(e: number): string {
  if (e >= 75) return "#00df81";
  if (e >= 60) return "#fbbf24";
  if (e >= 45) return "#f97316";
  return "#ef4444";
}

function brandFor(name: string): string {
  return BRAND[name] ?? "#a1a1aa";
}

interface Props { data: NetworkGraphType }

export function RollupNetworkGraph({ data }: Props) {
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const echartsRef = useRef<any>(null);

  useEffect(() => { setMounted(true); }, []);

  // Organic movement: gently perturb force params every 6s
  useEffect(() => {
    if (!mounted || !data.nodes.length) return;
    const id = setInterval(() => {
      if (!echartsRef.current) return;
      try {
        const inst = echartsRef.current.getEchartsInstance?.();
        if (!inst) return;
        // Subtle random offsets for organic breathing effect
        const repulsionVariance = 350 + (Math.random() - 0.5) * 120;
        const gravityVariance = 0.015 + (Math.random() - 0.5) * 0.008;
        inst.setOption(
          {
            series: [
              {
                force: {
                  repulsion: repulsionVariance,
                  gravity: gravityVariance,
                },
              },
            ],
          },
          false
        ); // merge only
      } catch (e) {
        // Silent fail if instance not ready
      }
    }, 6000);
    return () => clearInterval(id);
  }, [mounted, data.nodes.length]);

  if (!mounted) {
    return <div className="h-[560px] rounded-xl bg-muted/30 animate-pulse" />;
  }

  const maxValue = Math.max(...data.nodes.map((n) => n.value), 1);

  // ── Nodes ─────────────────────────────────────────────────────────────────
  const nodes = [
    // Ethereum hub — fixed at center
    {
      name: "Ethereum",
      value: 0,
      fixed: true,
      x: 0,
      y: 0,
      symbolSize: 74,
      symbol: "image:///l2/icons/ethereum.png",
      itemStyle: {
        color: "transparent",
        borderColor: "#627EEA",
        borderWidth: 3,
        shadowBlur: 48,
        shadowColor: "rgba(98,126,234,0.75)",
        opacity: 1,
      },
      label: {
        show: true,
        position: "bottom",
        distance: 14,
        fontSize: 12,
        fontWeight: "bold",
        color: "#627EEA",
        textShadowColor: "rgba(98,126,234,0.55)",
        textShadowBlur: 8,
      },
    },
    // Rollup nodes
    ...data.nodes.map((r) => {
      const logo  = LOGOS[r.name];
      const brand = brandFor(r.name);
      const ec    = effColor(r.efficiency);
      // Log-scaled size: large rollups ≈ 78px, tiny ones ≈ 34px
      const logN  = Math.log(1 + r.value) / Math.log(1 + maxValue);
      const size  = Math.max(34, Math.min(78, 34 + logN * 44));
      // Glow intensity proportional to efficiency
      const blur  = 12 + (r.efficiency / 100) * 32;

      return {
        name: r.name,
        value: r.value,
        efficiency: r.efficiency,
        avgFeeGwei: r.avgFeeGwei,
        txCount: r.txCount,
        costEth: r.costEth,
        symbolSize: size,
        symbol: logo ? `image://${logo}` : "circle",
        itemStyle: {
          color: logo ? "transparent" : ec,
          borderColor: ec,
          borderWidth: 2.5,
          shadowBlur: blur,
          shadowColor: ec + "cc",
          opacity: 1,
        },
        label: {
          show: true,
          position: "bottom",
          distance: 8,
          fontSize: 10,
          fontWeight: "600",
          color: brand,
          textShadowColor: brand + "44",
          textShadowBlur: 6,
        },
      };
    }),
  ];

  // ── Edges ─────────────────────────────────────────────────────────────────
  const links = [
    // Hub spokes: Ethereum → each rollup
    ...data.nodes.map((r) => ({
      source: "Ethereum",
      target: r.name,
      lineStyle: {
        width:     1.2,
        color:     brandFor(r.name),
        opacity:   0.22,
        type:      "dashed" as const,
        curveness: 0.08,
      },
    })),
    // Inter-rollup co-occurrence edges
    ...data.edges.map((e) => ({
      source: e.source,
      target: e.target,
      edgeSymbol: ["none", "arrow"] as [string, string],
      edgeSymbolSize: [4, 8],
      lineStyle: {
        width:     Math.max(1.5, (e.weight / 100) * 5.5),
        color:     brandFor(e.source),
        opacity:   0.28 + (e.weight / 100) * 0.45,
        curveness: 0.22,
      },
    })),
  ];

  // ── ECharts option ────────────────────────────────────────────────────────
  const option = {
    backgroundColor: "transparent",
    textStyle: { fontFamily: "'Space Grotesk', sans-serif" },
    graphic: watermarkGraphic,
    series: [
      {
        type: "graph",
        layout: "force",
        roam: true,
        draggable: true,
        legendHoverLink: false,
        force: {
          repulsion:       450,
          gravity:         0.01,
          edgeLength:      [160, 280],
          layoutAnimation: true,
          friction:        0.45,
        },
        data: nodes,
        links,
        animationDuration:       1600,
        animationEasing:         "cubicOut",
        animationDurationUpdate: 900,
        animationEasingUpdate:   "cubicInOut",
        label: { show: true, formatter: "{b}" },
        emphasis: {
          focus: "adjacency",
          blurScope: "global",
          itemStyle: {
            shadowBlur:  60,
            shadowColor: "rgba(255,255,255,0.7)",
            borderWidth: 3.5,
          },
          lineStyle: { width: 4, opacity: 0.95 },
          label: { fontSize: 12, fontWeight: "bold" },
        },
      },
    ],
    tooltip: {
      confine: true,
      backgroundColor: "#0a0a0e",
      borderColor: "rgba(255,255,255,0.10)",
      borderWidth: 1,
      borderRadius: 10,
      padding: [12, 14],
      textStyle: { color: "#fafafa", fontFamily: "'Space Grotesk', sans-serif" },
      formatter: (params: any) => {
        const d = params.data;
        if (!d) return "";
        if (d.name === "Ethereum") {
          return [
            `<div style="font-size:13px;font-weight:700;color:#627EEA;margin-bottom:6px;">⟠ Ethereum</div>`,
            `<div style="font-size:11px;color:#a1a1aa;">Data Availability settlement layer</div>`,
            `<div style="font-size:11px;color:#a1a1aa;margin-top:3px;">EIP-4844 blob market hub</div>`,
          ].join("");
        }
        const brand = brandFor(d.name);
        const ec    = effColor(d.efficiency ?? 0);
        const logo  = LOGOS[d.name];
        const imgEl = logo
          ? `<img src="${logo}" style="width:22px;height:22px;border-radius:5px;object-fit:contain;flex-shrink:0;" />`
          : "";
        return [
          `<div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;">`,
            imgEl,
            `<span style="font-size:13px;font-weight:700;color:${brand};">${d.name}</span>`,
          `</div>`,
          `<div style="display:grid;grid-template-columns:auto 1fr;gap:4px 14px;font-size:11px;line-height:1.6;">`,
            `<span style="color:#71717a;">Blobs (24h)</span>`,
            `<span style="color:#00df81;font-family:monospace;font-weight:600;">${formatNumber(d.value ?? 0)}</span>`,
            `<span style="color:#71717a;">Efficiency</span>`,
            `<span style="color:${ec};font-family:monospace;font-weight:600;">${(d.efficiency ?? 0).toFixed(1)}</span>`,
            `<span style="color:#71717a;">Avg fee</span>`,
            `<span style="color:#fbbf24;font-family:monospace;">${(d.avgFeeGwei ?? 0).toFixed(5)} gwei</span>`,
            `<span style="color:#71717a;">Transactions</span>`,
            `<span style="color:#a1a1aa;font-family:monospace;">${d.txCount ?? 0}</span>`,
            `<span style="color:#71717a;">DA cost</span>`,
            `<span style="color:#627EEA;font-family:monospace;">${(d.costEth ?? 0).toFixed(4)} ETH</span>`,
          `</div>`,
        ].join("");
      },
    },
  };

  return (
    <div className="relative rounded-xl overflow-hidden">
      {/* Efficiency halo legend */}
      <div className="absolute top-3 right-3 z-10 flex flex-col gap-1.5 rounded-lg border border-white/8 bg-black/50 px-3 py-2.5 backdrop-blur-sm">
        <p className="text-[9px] uppercase tracking-[0.12em] text-muted-foreground/50 mb-0.5">
          Efficiency halo
        </p>
        {[
          { color: "#00df81", label: "≥ 75  Excellent" },
          { color: "#fbbf24", label: "60–75  Good" },
          { color: "#f97316", label: "45–60  Fair" },
          { color: "#ef4444", label: "< 45   Poor" },
        ].map(({ color, label }) => (
          <div key={label} className="flex items-center gap-2">
            <span
              className="h-2 w-2 rounded-full shrink-0"
              style={{ backgroundColor: color, boxShadow: `0 0 6px ${color}` }}
            />
            <span className="font-mono text-[9px] text-muted-foreground/70">{label}</span>
          </div>
        ))}
      </div>

      {/* Edge legend */}
      <div className="absolute bottom-8 right-3 z-10 flex flex-col gap-1 rounded-lg border border-white/8 bg-black/50 px-3 py-2 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <div className="h-px w-6 border-t border-dashed border-white/30" />
          <span className="font-mono text-[9px] text-muted-foreground/60">→ ETH spoke</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-0.5 w-6 rounded" style={{ background: "linear-gradient(90deg, #0052FF, #FF0420)" }} />
          <span className="font-mono text-[9px] text-muted-foreground/60">co-occurrence</span>
        </div>
      </div>

      {/* Interaction hint */}
      <p className="absolute bottom-3 left-3 z-10 text-[9px] text-muted-foreground/35">
        Drag · Scroll to zoom · Hover for details
      </p>

      <div className="h-[560px] w-full">
        <ECharts
          ref={echartsRef}
          option={option}
          style={{ height: "100%", width: "100%" }}
          theme={theme !== "light" ? "dark" : "light"}
          notMerge
          lazyUpdate={false}
        />
      </div>
    </div>
  );
}
