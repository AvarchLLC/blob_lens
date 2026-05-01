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
  undersaturated: "#3D4F6B",
  healthy: "#10B981",
  congested: "#F59E0B",
  spike: "#EF4444",
};

export function RegimeBadge({ maxBlobsInBlock, size = "sm" }: Props) {
  const regime = classifyRegime(maxBlobsInBlock);
  const dot = dotColors[regime];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full border font-medium",
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
}
