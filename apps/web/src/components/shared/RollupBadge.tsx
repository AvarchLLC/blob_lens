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
    "inline-flex items-center gap-1.5 rounded-full border border-[#1E2D45] bg-[#1A2235] px-2 py-0.5 text-xs font-medium text-[#9CA3AF] transition-colors hover:border-[rgba(16,185,129,0.2)]";

  const indicator = isUnknown ? (
    <span className="inline-block text-[#4B5563] text-[0.65rem] leading-none shrink-0 font-medium">?</span>
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
    <em className="not-italic italic text-[#4B5563]">Unknown</em>
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
