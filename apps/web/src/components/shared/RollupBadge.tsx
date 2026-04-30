import Link from "next/link";
import { rollupColor } from "@/lib/utils";

interface Props {
  rollup: string;
  linkable?: boolean;
}

export function RollupBadge({ rollup, linkable = false }: Props) {
  const isUnknown = rollup === "UNKNOWN";
  const color = rollupColor(rollup);
  const cls =
    "inline-flex items-center gap-1.5 rounded-full border border-[#2a2439] bg-[#17151d] px-2.5 py-0.5 text-xs font-medium text-[#d6cfee]";

  const dot = (
    <span
      className="inline-block h-1.5 w-1.5 rounded-full shrink-0"
      style={{ backgroundColor: color }}
    />
  );

  const label = isUnknown ? (
    <em className="not-italic italic text-[#5C5575]">? Unknown</em>
  ) : (
    <span>{rollup}</span>
  );

  if (linkable && !isUnknown) {
    return (
      <Link href={`/rollup/${encodeURIComponent(rollup)}`} className={cls}>
        {dot}
        {label}
      </Link>
    );
  }

  return (
    <span className={cls}>
      {dot}
      {label}
    </span>
  );
}
