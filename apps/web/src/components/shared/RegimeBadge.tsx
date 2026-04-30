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

export function RegimeBadge({ maxBlobsInBlock, size = "sm" }: Props) {
  const regime = classifyRegime(maxBlobsInBlock);
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border font-medium",
        regimeColor(regime),
        size === "lg"
          ? "px-4 py-1.5 text-sm"
          : "px-3 py-1 text-[0.72rem] uppercase tracking-[0.08em]"
      )}
    >
      {labels[regime]}
    </span>
  );
}
