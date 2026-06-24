import Link from "next/link";
import { rollupColor, rollupIcon } from "@/lib/utils";

interface Props {
  rollup: string;
  linkable?: boolean;
}

export function RollupBadge({ rollup, linkable = false }: Props) {
  const isUnknown = rollup === "UNKNOWN";
  const icon = rollupIcon(rollup);
  const color = rollupColor(rollup);
  const cls =
    "inline-flex items-center gap-1.5 rounded-sm border border-border bg-surface-elevated px-2 py-0.5 text-xs font-medium text-text-secondary transition-colors hover:border-primary/20";

  const indicator = isUnknown ? (
    <span className="inline-block text-text-secondary/60 text-[0.65rem] leading-none shrink-0 font-medium">?</span>
  ) : icon ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={icon}
      alt={rollup}
      width={14}
      height={14}
      className="inline-block shrink-0 rounded-sm object-contain"
      style={{ imageRendering: "auto" }}
    />
  ) : (
    <span
      className="inline-block h-1.5 w-1.5 rounded-full shrink-0"
      style={{ backgroundColor: color }}
    />
  );

  const label = isUnknown ? (
    <em className="not-italic italic text-text-secondary/60">Unknown</em>
  ) : (
    <span>{rollup}</span>
  );

  if (linkable && !isUnknown) {
    return (
      <Link href={`/rollup/${encodeURIComponent(rollup)}`} className={cls}>
        {indicator}
        {label}
      </Link>
    );
  }

  return (
    <span className={cls}>
      {indicator}
      {label}
    </span>
  );
}
