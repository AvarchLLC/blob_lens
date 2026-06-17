"use client";
import * as d3 from "d3";
import type { RollupNetworkGraph as NetworkGraphType } from "@/lib/queries";
import { formatNumber } from "@/lib/utils";
import { useEffect, useRef, useState } from "react";
import { useTheme } from "next-themes";

// ── Logo map ───────────────────────────────────────────────────────────────
const LOGOS: Record<string, string> = {
  Base: "/l2/icons/base.png",
  Arbitrum: "/l2/icons/arbitrum.png",
  "Arbitrum One": "/l2/icons/arbitrum.png",
  "OP Mainnet": "/l2/icons/op-mainnet.png",
  Optimism: "/l2/icons/optimism.png",
  Blast: "/l2/icons/blast.png",
  "zkSync Era": "/l2/icons/zksync-era.png",
  "ZKsync Era": "/l2/icons/zksync-era.png",
  Scroll: "/l2/icons/scroll.png",
  Linea: "/l2/icons/linea.png",
  Starknet: "/l2/icons/starknet.png",
  StarkNet: "/l2/icons/starknet.png",
  Taiko: "/l2/icons/taiko.png",
  Mantle: "/l2/icons/mantle.png",
  Zora: "/l2/icons/zora.png",
  Mode: "/l2/icons/mode.png",
  "World Chain": "/l2/icons/world.png",
  World: "/l2/icons/world.png",
  Unichain: "/l2/icons/unichain.png",
  Soneium: "/l2/icons/soneium.png",
  dYdX: "/l2/icons/dydx.png",
  "Polygon zkEVM": "/l2/icons/polygonzkevm.png",
  Fraxtal: "/l2/icons/fraxtal.png",
  Kroma: "/l2/icons/kroma.png",
  Mint: "/l2/icons/mint.png",
  "Metal L2": "/l2/icons/metal.png",
  Metal: "/l2/icons/metal.png",
  Lisk: "/l2/icons/lisk.png",
  Celo: "/l2/icons/celo.png",
  Ink: "/l2/icons/ink.png",
  BOB: "/l2/icons/bob.png",
  Morph: "/l2/icons/morph.png",
  Cyber: "/l2/icons/cyber.png",
  Derive: "/l2/icons/derive.png",
  Redstone: "/l2/icons/redstone.png",
  Orderly: "/l2/icons/orderly.png",
  "Swell Chain": "/l2/icons/swell.png",
  Swell: "/l2/icons/swell.png",
  Hemi: "/l2/icons/hemi.png",
  Zircuit: "/l2/icons/zircuit.png",
  "Swan Chain": "/l2/icons/swan.png",
  Ethereum: "/l2/icons/ethereum.png",
};

// ── Brand colors ───────────────────────────────────────────────────────────
const BRAND: Record<string, string> = {
  Base: "#0052FF",
  Arbitrum: "#28A0F0",
  "Arbitrum One": "#28A0F0",
  "OP Mainnet": "#FF0420",
  Optimism: "#FF0420",
  Blast: "#FCFC03",
  "zkSync Era": "#5B8DB8",
  "ZKsync Era": "#5B8DB8",
  Scroll: "#EEB25E",
  Linea: "#61DFFF",
  Starknet: "#EC796B",
  StarkNet: "#EC796B",
  Taiko: "#E81899",
  Mantle: "#00C3A0",
  Zora: "#A855F7",
  Mode: "#DFFE00",
  "World Chain": "#d4d4d8",
  World: "#d4d4d8",
  Unichain: "#FF007A",
  Soneium: "#d4d4d8",
  dYdX: "#6966FF",
  "Polygon zkEVM": "#7B3FE4",
  Fraxtal: "#00B2E8",
  Kroma: "#17B89E",
  Ink: "#A0B0FF",
  BOB: "#E45C19",
  Morph: "#38E8C0",
  Zircuit: "#61DFFF",
  Hemi: "#F26522",
  Ethereum: "#627EEA",
};

function effColor(e: number): string {
  if (e >= 75) return "#00df81";
  if (e >= 60) return "#fbbf24";
  if (e >= 45) return "#f97316";
  return "#ef4444";
}

function effGlowId(e: number): string {
  if (e >= 75) return "glow-excellent";
  if (e >= 60) return "glow-good";
  if (e >= 45) return "glow-fair";
  return "glow-poor";
}

function brandFor(name: string): string {
  return BRAND[name] ?? "#a1a1aa";
}

function darken(hex: string, factor = 0.38): string {
  const h = hex.replace("#", "");
  if (h.length !== 6) return "#111827";
  const r = Math.round(parseInt(h.slice(0, 2), 16) * factor);
  const g = Math.round(parseInt(h.slice(2, 4), 16) * factor);
  const b = Math.round(parseInt(h.slice(4, 6), 16) * factor);
  return `rgb(${r},${g},${b})`;
}

function nodeR(value: number, maxVal: number, isEth: boolean): number {
  if (isEth) return 52;
  const logN = maxVal > 0 ? Math.log(1 + value) / Math.log(1 + maxVal) : 0;
  return Math.max(10, Math.min(22, 10 + logN * 12));
}

// ── Types ──────────────────────────────────────────────────────────────────
interface GNode extends d3.SimulationNodeDatum {
  id: string;
  name: string;
  value: number;
  efficiency: number;
  avgFeeGwei: number;
  txCount: number;
  costEth: number;
  isEthereum?: boolean;
}

interface GLink extends d3.SimulationLinkDatum<GNode> {
  weight: number;
  isHub?: boolean;
}

// ── Component ──────────────────────────────────────────────────────────────
export function RollupNetworkGraphD3({ data }: { data: NetworkGraphType }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const animRef = useRef<number>(0);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; node: GNode } | null>(null);
  const { theme } = useTheme();
  const isDark = theme !== "light";

  useEffect(() => {
    if (!containerRef.current || !svgRef.current || !data.nodes.length) return;

    const W = containerRef.current.clientWidth || 800;
    const H = containerRef.current.clientHeight || 560;
    const maxVal = Math.max(...data.nodes.map((n) => n.value), 1);

    // Build nodes
    const nodes: GNode[] = [
      {
        id: "ethereum", name: "Ethereum", value: 0, efficiency: 100,
        avgFeeGwei: 0, txCount: 0, costEth: 0, isEthereum: true, x: W / 2, y: H / 2,
      },
      ...data.nodes.map((n) => ({
        id: n.name.toLowerCase().replace(/\s+/g, "-"),
        name: n.name, value: n.value ?? 0, efficiency: n.efficiency ?? 0,
        avgFeeGwei: n.avgFeeGwei ?? 0, txCount: n.txCount ?? 0,
        costEth: n.costEth ?? 0, isEthereum: false,
      })),
    ];

    const byId = new Map(nodes.map((n) => [n.id, n]));

    // Build links
    const links: GLink[] = [
      ...data.nodes.map((n) => ({
        source: byId.get("ethereum")! as GNode,
        target: byId.get(n.name.toLowerCase().replace(/\s+/g, "-"))! as GNode,
        weight: 30, isHub: true,
      })),
      ...data.edges.flatMap((e) => {
        const s = byId.get(e.source.toLowerCase().replace(/\s+/g, "-"));
        const t = byId.get(e.target.toLowerCase().replace(/\s+/g, "-"));
        if (!s || !t) return [];
        return [{ source: s as GNode, target: t as GNode, weight: e.weight, isHub: false }];
      }),
    ];

    // Adjacency set for hover highlight
    const adj = new Set<string>();
    links.forEach((l) => {
      const s = (l.source as GNode).id;
      const t = (l.target as GNode).id;
      adj.add(`${s}|${t}`); adj.add(`${t}|${s}`);
    });
    const isAdj = (a: string, b: string) => adj.has(`${a}|${b}`);

    // Force simulation
    const sim = d3.forceSimulation<GNode>(nodes)
      .force("link", d3.forceLink<GNode, GLink>(links)
        .id((d) => d.id)
        .distance((l) => (l.isHub ? 180 : 220))
        .strength((l) => (l.isHub ? 0.4 : 0.12)))
      .force("charge", d3.forceManyBody<GNode>().strength(-750))
      .force("center", d3.forceCenter(W / 2, H / 2).strength(0.07))
      .force("collision", d3.forceCollide<GNode>(
        (d) => nodeR(d.value, maxVal, !!d.isEthereum) + 16
      ).strength(0.85));

    // ── SVG setup ─────────────────────────────────────────────────────────
    const svg = d3.select(svgRef.current)
      .attr("viewBox", `0 0 ${W} ${H}`)
      .attr("width", W).attr("height", H);
    svg.selectAll("*").remove();

    const defs = svg.append("defs");

    // ── Glow filters (4 efficiency tiers + ETH) ───────────────────────────
    [
      { id: "glow-excellent", color: "#00df81", outer: 22, inner: 8 },
      { id: "glow-good",      color: "#fbbf24", outer: 17, inner: 6 },
      { id: "glow-fair",      color: "#f97316", outer: 13, inner: 5 },
      { id: "glow-poor",      color: "#ef4444", outer: 11, inner: 4 },
      { id: "glow-eth",       color: "#627EEA", outer: 28, inner: 10 },
    ].forEach(({ id, color, outer, inner }) => {
      const f = defs.append("filter").attr("id", id)
        .attr("x", "-70%").attr("y", "-70%").attr("width", "240%").attr("height", "240%");
      f.append("feGaussianBlur").attr("in", "SourceGraphic").attr("stdDeviation", outer).attr("result", "blur");
      f.append("feFlood").attr("flood-color", color).attr("flood-opacity", 0.7).attr("result", "color");
      f.append("feComposite").attr("in", "color").attr("in2", "blur").attr("operator", "in").attr("result", "glow");
      f.append("feGaussianBlur").attr("in", "SourceGraphic").attr("stdDeviation", inner).attr("result", "innerBlur");
      const m = f.append("feMerge");
      m.append("feMergeNode").attr("in", "glow");
      m.append("feMergeNode").attr("in", "innerBlur");
      m.append("feMergeNode").attr("in", "SourceGraphic");
    });

    // ── Text drop-shadow filter ────────────────────────────────────────────
    const tf = defs.append("filter").attr("id", "txt-shadow")
      .attr("x", "-20%").attr("y", "-20%").attr("width", "140%").attr("height", "140%");
    tf.append("feDropShadow").attr("dx", 0).attr("dy", 1)
      .attr("stdDeviation", isDark ? 2.5 : 1.5).attr("flood-color", isDark ? "#000" : "#fff").attr("flood-opacity", isDark ? 0.8 : 0.9);

    // ── Per-node: radial gradient + circular clip path ─────────────────────
    nodes.forEach((n) => {
      const r = nodeR(n.value, maxVal, !!n.isEthereum);
      const brand = n.isEthereum ? "#627EEA" : brandFor(n.name);

      const g = defs.append("radialGradient").attr("id", `grad-${n.id}`)
        .attr("cx", "35%").attr("cy", "30%").attr("r", "75%");
      g.append("stop").attr("offset", "0%")
        .attr("stop-color", brand).attr("stop-opacity", 0.85);
      g.append("stop").attr("offset", "100%")
        .attr("stop-color", darken(brand)).attr("stop-opacity", 0.97);

      defs.append("clipPath").attr("id", `clip-${n.id}`)
        .append("circle").attr("cx", 0).attr("cy", 0).attr("r", r);
    });

    // ── Zoom + pan ─────────────────────────────────────────────────────────
    const root = svg.append("g");
    svg.call(
      d3.zoom<SVGSVGElement, unknown>()
        .scaleExtent([0.25, 4])
        .on("zoom", (ev) => root.attr("transform", ev.transform))
    );

    // ── Hub spoke edges (static dashed) ───────────────────────────────────
    const hubEdges = root.append("g")
      .selectAll<SVGLineElement, GLink>("line")
      .data(links.filter((l) => l.isHub))
      .enter().append("line")
      .attr("stroke", (l) => brandFor((l.target as GNode).name))
      .attr("stroke-width", 1.1)
      .attr("stroke-opacity", 0.18)
      .attr("stroke-dasharray", "5 4");

    // ── Co-occurrence edges (animated flowing dashes) ──────────────────────
    const coEdges = root.append("g")
      .selectAll<SVGLineElement, GLink>("line")
      .data(links.filter((l) => !l.isHub))
      .enter().append("line")
      .attr("stroke", (l) => brandFor((l.source as GNode).name))
      .attr("stroke-width", (l) => Math.max(1.5, (l.weight / 100) * 5.5))
      .attr("stroke-opacity", (l) => 0.28 + (l.weight / 100) * 0.42)
      .attr("stroke-dasharray", (l) => `${7 + (l.weight / 100) * 11} 6`);

    // requestAnimationFrame loop: animate stroke-dashoffset for flowing effect
    let dashOff = 0;
    const animateDashes = () => {
      dashOff -= 0.55;
      coEdges.attr("stroke-dashoffset", dashOff);
      animRef.current = requestAnimationFrame(animateDashes);
    };
    animRef.current = requestAnimationFrame(animateDashes);

    // ── Node groups ────────────────────────────────────────────────────────
    const nodeOuter = root.append("g")
      .selectAll<SVGGElement, GNode>("g")
      .data(nodes)
      .enter().append("g")
      .style("cursor", "pointer")
      .call(
        d3.drag<SVGGElement, GNode>()
          .on("start", (ev, d) => {
            if (!ev.active) sim.alphaTarget(0.25).restart();
            d.fx = d.x; d.fy = d.y;
          })
          .on("drag", (ev, d) => { d.fx = ev.x; d.fy = ev.y; })
          .on("end", (ev, d) => {
            if (!ev.active) sim.alphaTarget(0);
            d.fx = null; d.fy = null;
          })
      );

    // Inner group: scaled independently on hover
    const nodeInner = nodeOuter.append("g").attr("class", "ni");

    // 1. Gradient-filled base circle + glow filter
    nodeInner.append("circle")
      .attr("r", (d) => nodeR(d.value, maxVal, !!d.isEthereum))
      .attr("fill", (d) => `url(#grad-${d.id})`)
      .attr("stroke", (d) => d.isEthereum ? "#627EEA" : effColor(d.efficiency))
      .attr("stroke-width", 2.5)
      .attr("filter", (d) => `url(#${d.isEthereum ? "glow-eth" : effGlowId(d.efficiency)})`);

    // 2. Letter avatar (always rendered, covered by logo if it loads)
    nodeInner.append("text")
      .attr("class", "letter")
      .attr("text-anchor", "middle")
      .attr("dominant-baseline", "central")
      .attr("font-size", (d) => `${Math.round(nodeR(d.value, maxVal, !!d.isEthereum) * 0.78)}px`)
      .attr("font-weight", "900")
      .attr("fill", "rgba(255,255,255,0.90)")
      .attr("font-family", "'Space Grotesk', sans-serif")
      .style("pointer-events", "none")
      .text((d) => d.isEthereum ? "⟠" : d.name.charAt(0).toUpperCase());

    // 3. Logo image — clipped to circle, removes itself on load failure
    nodeInner.filter((d) => !!LOGOS[d.name])
      .append("image")
      .attr("clip-path", (d) => `url(#clip-${d.id})`)
      .attr("href", (d) => LOGOS[d.name])
      .attr("x", (d) => -nodeR(d.value, maxVal, !!d.isEthereum))
      .attr("y", (d) => -nodeR(d.value, maxVal, !!d.isEthereum))
      .attr("width", (d) => nodeR(d.value, maxVal, !!d.isEthereum) * 2)
      .attr("height", (d) => nodeR(d.value, maxVal, !!d.isEthereum) * 2)
      .attr("preserveAspectRatio", "xMidYMid slice")
      .style("pointer-events", "none")
      .on("error", function () { d3.select(this as SVGImageElement).remove(); });

    // 4. Label below node with text-shadow
    nodeInner.append("text")
      .attr("y", (d) => nodeR(d.value, maxVal, !!d.isEthereum) + 14)
      .attr("text-anchor", "middle")
      .attr("font-size", (d) => d.isEthereum ? "11px" : "9px")
      .attr("font-weight", "600")
      .attr("fill", (d) => d.isEthereum ? "#627EEA" : brandFor(d.name))
      .attr("filter", "url(#txt-shadow)")
      .attr("font-family", "'Space Grotesk', sans-serif")
      .style("pointer-events", "none")
      .text((d) => d.name);

    // ── Hover interactions ─────────────────────────────────────────────────
    nodeOuter
      .on("mouseenter", function (ev: MouseEvent, d: GNode) {
        // Scale up this node's inner group
        d3.select(this).select(".ni")
          .transition().duration(180).ease(d3.easeBackOut.overshoot(1.6))
          .attr("transform", "scale(1.22)");

        // Emphasize adjacent edges, fade others
        coEdges.attr("stroke-opacity", (l: GLink) => {
          const s = (l.source as GNode).id, t = (l.target as GNode).id;
          return s === d.id || t === d.id ? 0.95 : 0.04;
        });
        hubEdges.attr("stroke-opacity", (l: GLink) =>
          (l.target as GNode).id === d.id ? 0.55 : 0.04
        );
        // Dim non-adjacent nodes
        nodeOuter.attr("opacity", (n: GNode) =>
          n.id === d.id || isAdj(d.id, n.id) ? 1 : 0.22
        );
        // Position tooltip at node's actual rendered screen position
        const nodeElement = d3.select(this).node() as SVGGElement;
        const nodeRect = nodeElement.getBoundingClientRect();
        const x = nodeRect.left + nodeRect.width / 2;
        const y = nodeRect.top + nodeRect.height / 2;
        setTooltip({ x, y, node: d });
      })
      .on("mousemove", function() {
        // Update tooltip to follow node's actual rendered position
        const nodeElement = d3.select(this).node() as SVGGElement;
        const nodeRect = nodeElement.getBoundingClientRect();
        const x = nodeRect.left + nodeRect.width / 2;
        const y = nodeRect.top + nodeRect.height / 2;
        setTooltip((p) => p ? { ...p, x, y } : null);
      })
      .on("mouseleave", function () {
        d3.select(this).select(".ni")
          .transition().duration(180)
          .attr("transform", "scale(1)");
        coEdges.attr("stroke-opacity", (l: GLink) => 0.28 + ((l.weight) / 100) * 0.42);
        hubEdges.attr("stroke-opacity", 0.18);
        nodeOuter.attr("opacity", 1);
        setTooltip(null);
      });

    // ── Entrance animation: nodes spring in with stagger ──────────────────
    nodeInner
      .attr("transform", "scale(0)")
      .transition()
      .delay((_: unknown, i: number) => i * 40)
      .duration(650)
      .ease(d3.easeBackOut.overshoot(1.3))
      .attr("transform", "scale(1)");

    // ── Simulation tick ────────────────────────────────────────────────────
    sim.on("tick", () => {
      const lineAttrs = (sel: d3.Selection<SVGLineElement, GLink, SVGGElement, unknown>) =>
        sel
          .attr("x1", (l) => (l.source as GNode).x ?? 0)
          .attr("y1", (l) => (l.source as GNode).y ?? 0)
          .attr("x2", (l) => (l.target as GNode).x ?? 0)
          .attr("y2", (l) => (l.target as GNode).y ?? 0);

      lineAttrs(hubEdges as any);
      lineAttrs(coEdges as any);
      nodeOuter.attr("transform", (d) => `translate(${d.x ?? 0},${d.y ?? 0})`);
    });

    return () => {
      sim.stop();
      cancelAnimationFrame(animRef.current);
    };
  }, [data]);

  return (
    <div className="relative rounded-xl overflow-hidden bg-surface-elevated">
      <div ref={containerRef} className="h-[560px] w-full">
        <svg ref={svgRef} className="w-full h-full" />
      </div>

      {/* Efficiency halo legend */}
      <div className={`absolute top-3 right-3 z-10 flex flex-col gap-1.5 rounded-lg border px-3 py-2.5 backdrop-blur-sm pointer-events-none ${
        isDark ? "border-white/8 bg-black/55" : "border-border bg-white/80"
      }`}>
        <p className="text-[9px] uppercase tracking-[0.13em] text-text-secondary/50 mb-0.5">
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
            <span className="font-mono text-[9px] text-text-secondary/70">{label}</span>
          </div>
        ))}
      </div>

      {/* Edge type legend */}
      <div className={`absolute bottom-8 right-3 z-10 flex flex-col gap-1.5 rounded-lg border px-3 py-2 backdrop-blur-sm pointer-events-none ${
        isDark ? "border-white/8 bg-black/55" : "border-border bg-white/80"
      }`}>
        <div className="flex items-center gap-2">
          <svg width="24" height="6"><line x1="0" y1="3" x2="24" y2="3" stroke={isDark ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.25)"} strokeWidth="1.2" strokeDasharray="4 3"/></svg>
          <span className="font-mono text-[9px] text-text-secondary/60">ETH spoke</span>
        </div>
        <div className="flex items-center gap-2">
          <svg width="24" height="6"><line x1="0" y1="3" x2="24" y2="3" stroke="#0052FF" strokeWidth="2" strokeDasharray="6 4"/></svg>
          <span className="font-mono text-[9px] text-text-secondary/60">co-occurrence ›</span>
        </div>
      </div>

      {/* Hint */}
      <p className="absolute bottom-3 left-3 z-10 text-[9px] text-text-secondary/30 pointer-events-none">
        Drag nodes · Scroll to zoom · Hover for details
      </p>

      {/* Tooltip */}
      {tooltip && !tooltip.node.isEthereum && (() => {
        const TW = 216, TH = 164;
        const containerRect = containerRef.current?.getBoundingClientRect();
        const vw = containerRect?.right ?? window.innerWidth;
        const vh = containerRect?.bottom ?? window.innerHeight;
        const cardLeft = containerRect?.left ?? 0;
        const cardTop = containerRect?.top ?? 0;
        const left = tooltip.x + TW + 5 > vw ? tooltip.x - TW - 5 : tooltip.x + 5;
        const top  = tooltip.y + TH + 5 > vh ? tooltip.y - TH - 5 : tooltip.y + 5;
        return (
        <div
          className={`fixed z-30 rounded-xl border px-4 py-3 backdrop-blur-md pointer-events-none shadow-xl ${
            isDark ? "border-white/10 bg-black/80" : "border-border bg-white/90"
          }`}
          style={{ left, top, minWidth: 200 }}
        >
          <div className="flex items-center gap-2.5 mb-3">
            {LOGOS[tooltip.node.name] && (
              <img
                src={LOGOS[tooltip.node.name]}
                alt={tooltip.node.name}
                className="w-6 h-6 rounded-md object-contain flex-shrink-0"
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
              />
            )}
            <span className="text-sm font-bold" style={{ color: brandFor(tooltip.node.name) }}>
              {tooltip.node.name}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-y-1.5 gap-x-4 text-[11px] font-mono">
            <span className="text-text-secondary">Blobs (24h)</span>
            <span className="text-[#00df81] font-semibold">{formatNumber(tooltip.node.value)}</span>
            <span className="text-text-secondary">Efficiency</span>
            <span style={{ color: effColor(tooltip.node.efficiency) }} className="font-semibold">
              {tooltip.node.efficiency.toFixed(1)}
            </span>
            <span className="text-text-secondary">Avg fee</span>
            <span className="text-amber-400">{tooltip.node.avgFeeGwei.toFixed(5)} gwei</span>
            <span className="text-text-secondary">Transactions</span>
            <span className="text-text-secondary">{tooltip.node.txCount}</span>
            <span className="text-text-secondary">DA cost</span>
            <span className="text-indigo-400">{tooltip.node.costEth.toFixed(4)} ETH</span>
          </div>
        </div>
        );
      })()}
    </div>
  );
}
