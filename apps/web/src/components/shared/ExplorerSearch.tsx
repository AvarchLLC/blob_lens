"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Search, ArrowRight, Loader2 } from "lucide-react";

function detectTarget(q: string): string | null {
  const t = q.trim();
  if (/^0x[0-9a-f]{64}$/i.test(t)) return `/tx/${t}`;
  if (/^0x[0-9a-f]{40}$/i.test(t)) return `/address/${t}`;
  if (/^\d+$/.test(t) && parseInt(t, 10) > 0) return `/block/${t}`;
  return null;
}

interface Props {
  placeholder?: string;
  className?: string;
}

export function ExplorerSearch({ placeholder = "Tx hash, address, or block number…", className = "" }: Props) {
  const [value, setValue] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const target = detectTarget(value);
    if (!target) {
      setError("Enter a 66-char tx hash, 42-char address, or block number");
      return;
    }
    setError("");
    startTransition(() => router.push(target));
  }

  return (
    <form onSubmit={handleSubmit} className={`flex flex-col gap-2 ${className}`}>
      <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all duration-200 bg-surface ${
        error ? "border-status-critical/50" : "border-border hover:border-primary/40 focus-within:border-primary focus-within:shadow-[0_0_0_3px_rgba(0,167,181,0.08)]"
      }`}>
        <Search className="h-4 w-4 text-text-secondary/50 shrink-0" />
        <input
          type="text"
          value={value}
          onChange={(e) => { setValue(e.target.value); setError(""); }}
          placeholder={placeholder}
          disabled={pending}
          className="flex-1 bg-transparent text-sm text-text-primary placeholder:text-text-secondary/40 focus:outline-none disabled:opacity-50 font-mono"
        />
        <button
          type="submit"
          disabled={pending || !value.trim()}
          className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-primary hover:bg-primary-hover text-white text-xs font-bold uppercase tracking-wider disabled:opacity-40 disabled:cursor-not-allowed transition-all shrink-0"
        >
          {pending
            ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Searching</>
            : <><ArrowRight className="h-3.5 w-3.5" /> Go</>
          }
        </button>
      </div>
      {error && (
        <p className="text-xs text-status-critical pl-1">{error}</p>
      )}
    </form>
  );
}
