"use client";

import { useState } from "react";
import { Link2, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface CopySectionLinkProps {
  sectionId: string;
  tab: string;
  className?: string;
}

export function CopySectionLink({ sectionId, tab, className }: CopySectionLinkProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      const url = new URL(window.location.href);
      url.searchParams.set("tab", tab);
      url.hash = sectionId;

      await navigator.clipboard.writeText(url.toString());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy link:", err);
    }
  };

  return (
    <button
      onClick={handleCopy}
      className={cn(
        "inline-flex items-center justify-center p-1 border border-dashed border-transparent hover:border-primary/40 hover:bg-primary/5 text-text-tertiary hover:text-primary transition-all duration-150 rounded-none focus-visible:outline-none cursor-pointer",
        className
      )}
      title="Copy link to this section"
    >
      {copied ? (
        <Check className="h-3.5 w-3.5 text-status-healthy" />
      ) : (
        <Link2 className="h-3.5 w-3.5" />
      )}
    </button>
  );
}
