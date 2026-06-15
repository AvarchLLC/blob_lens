"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

const OPTIONS = [
  { label: "24 h",  hours: 24 },
  { label: "7 d",   hours: 168 },
  { label: "30 d",  hours: 720 },
  { label: "90 d",  hours: 2160 },
] as const;

interface Props {
  basePath: string;
  current: number;
}

export function TimeRangePicker({ basePath, current }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function navigate(hours: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("hours", String(hours));
    router.push(`${basePath}?${params.toString()}`);
  }

  return (
    <div className="flex items-center gap-1 p-1 rounded-lg surface-elevated border border-border">
      {OPTIONS.map((o) => (
        <button
          key={o.hours}
          onClick={() => navigate(o.hours)}
          className={cn(
            "px-3 py-1.5 rounded-md text-xs font-semibold transition-colors",
            current === o.hours
              ? "bg-primary text-white"
              : "text-text-secondary hover:text-text-primary hover:bg-white/5"
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
