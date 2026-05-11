"use client";

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn, classifyRegime, regimeColor } from "@/lib/utils";

interface Props {
  maxBlobsInBlock: number;
  size?: "sm" | "lg";
}

const labels: Record<string, string> = {
  undersaturated: "Undersaturated",
  healthy: "Healthy",
  congested: "Congested",
  spike: "Spike",
};

const dotColors: Record<string, string> = {
  undersaturated: "#3f3f46",
  healthy:        "#00df81",
  congested:      "#fcbb00",
  spike:          "#fb2c36",
};

const REGIME_TOOLTIP: Record<string, { util: string; blobs: string; desc: string }> = {
  undersaturated: {
    util: "< 20% utilization",
    blobs: "< 2 blobs / block",
    desc: "Market is idle. Fees are at the protocol floor — cheapest window to submit blobs.",
  },
  healthy: {
    util: "20 – 80% utilization",
    blobs: "2 – 7 blobs / block",
    desc: "Demand is within EIP-4844's equilibrium target. Fees are stable.",
  },
  congested: {
    util: "80 – 95% utilization",
    blobs: "7 – 8 blobs / block",
    desc: "Near capacity. The exponential fee mechanism is pushing prices up — expect rising costs soon.",
  },
  spike: {
    util: "> 95% utilization",
    blobs: "9 blobs / block (full)",
    desc: "Blocks are full. Fees are spiking as rollups compete for limited blob space. Consider delaying non-urgent submissions.",
  },
};

export function RegimeBadge({ maxBlobsInBlock, size = "sm" }: Props) {
  const regime = classifyRegime(maxBlobsInBlock);
  const dot = dotColors[regime];
  const tip = REGIME_TOOLTIP[regime];

  const badge = (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full border font-medium cursor-default",
        regimeColor(regime),
        size === "lg"
          ? "px-4 py-1.5 text-sm"
          : "px-3 py-1 text-[0.72rem] uppercase tracking-[0.08em]"
      )}
    >
      <span
        className="inline-block shrink-0 rounded-full"
        style={{
          width: "6px",
          height: "6px",
          backgroundColor: dot,
          boxShadow: `0 0 0 0 ${dot}99`,
          animation: regime === "spike" || regime === "healthy" ? "pulse-live 1.8s infinite" : "none",
        }}
      />
      {labels[regime]}
    </span>
  );

  return (
    <TooltipProvider delayDuration={120}>
      <Tooltip>
        <TooltipTrigger asChild>{badge}</TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-[240px] space-y-1 px-3 py-2">
          <p className="font-semibold text-xs" style={{ color: dot }}>{labels[regime]}</p>
          <p className="font-mono text-[10px] text-muted-foreground">{tip.util} · {tip.blobs}</p>
          <p className="text-[11px] leading-relaxed text-foreground/80">{tip.desc}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
