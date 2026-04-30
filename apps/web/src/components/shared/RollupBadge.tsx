import Link from "next/link";

const ROLLUP_COLORS: Record<string, string> = {
  Base: "bg-blue-900/40 text-blue-300",
  "OP Mainnet": "bg-red-900/40 text-red-300",
  "Arbitrum One": "bg-sky-900/40 text-sky-300",
  "Arbitrum Nova": "bg-sky-900/50 text-sky-200",
  Starknet: "bg-violet-900/40 text-violet-300",
  "zkSync Era": "bg-purple-900/40 text-purple-300",
  Scroll: "bg-amber-900/40 text-amber-300",
  Linea: "bg-indigo-900/40 text-indigo-300",
  Taiko: "bg-pink-900/40 text-pink-300",
  Mantle: "bg-teal-900/40 text-teal-300",
  UNKNOWN: "bg-muted text-muted-foreground",
};

interface Props {
  rollup: string;
  linkable?: boolean;
}

export function RollupBadge({ rollup, linkable = false }: Props) {
  const cls = `inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
    ROLLUP_COLORS[rollup] ?? "bg-secondary text-secondary-foreground"
  }`;

  if (linkable) {
    return (
      <Link href={`/rollup/${encodeURIComponent(rollup)}`} className={cls}>
        {rollup}
      </Link>
    );
  }
  return <span className={cls}>{rollup}</span>;
}
