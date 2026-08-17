"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface BlobLensLogoProps {
  className?: string;
  showIcon?: boolean;
  showText?: boolean;
  textSize?: "sm" | "md" | "lg" | "xl";
  iconSize?: number;
}

export function BlobLensLogo({
  className,
  showIcon = true,
  showText = true,
  textSize = "md",
  iconSize,
}: BlobLensLogoProps) {
  // Determine precise responsive dimensions based on textSize preset
  const defaultIconSize =
    iconSize ??
    (textSize === "sm" ? 24 : textSize === "md" ? 34 : textSize === "lg" ? 42 : 52);

  return (
    <div className={cn("inline-flex items-center gap-2 select-none group cursor-pointer", className)}>
      {/* ── Main Brand Icon (/brand/logomain.svg rendered in exact brand color) ── */}
      {showIcon && (
        <div
          className="relative flex items-center justify-center shrink-0 transition-transform group-hover:scale-105"
          style={{ width: defaultIconSize, height: defaultIconSize }}
        >
          <div
            className="w-full h-full bg-[var(--primary)] transition-colors group-hover:bg-[var(--primary-hover)] drop-shadow-xs"
            style={{
              maskImage: "url('/brand/logomain.svg')",
              WebkitMaskImage: "url('/brand/logomain.svg')",
              maskSize: "contain",
              WebkitMaskSize: "contain",
              maskRepeat: "no-repeat",
              WebkitMaskRepeat: "no-repeat",
              maskPosition: "center",
              WebkitMaskPosition: "center",
            }}
            aria-label="BlobLens Brand Mark"
          />
        </div>
      )}

      {/* ── Compact Scaled Display Text Logo: BLOB L ≡ NS ── */}
      {showText && (
        <div className="flex items-center font-sans uppercase font-black tracking-wider text-[var(--text-primary)]">
          {/* BLOB L */}
          <span
            className={cn(
              "font-sans font-black tracking-wider text-[var(--text-primary)] transition-colors",
              textSize === "sm" && "text-[11px]",
              textSize === "md" && "text-xs sm:text-sm",
              textSize === "lg" && "text-sm sm:text-base",
              textSize === "xl" && "text-lg sm:text-xl"
            )}
          >
            BLOB L
          </span>

          {/* Scaled 3-line "E" telemetry bars */}
          <span
            className={cn(
              "inline-flex flex-col justify-between items-center mx-[2.5px] shrink-0 my-auto",
              textSize === "sm" && "h-[9px] w-[7px]",
              textSize === "md" && "h-[11px] w-[8.5px]",
              textSize === "lg" && "h-[13px] w-[10px]",
              textSize === "xl" && "h-[16px] w-[13px]"
            )}
            aria-label="E"
          >
            <span className="w-full h-[2px] rounded-[0.5px] bg-[var(--primary)] transition-all group-hover:bg-[var(--primary-hover)] group-hover:scale-x-110" />
            <span className="w-full h-[2px] rounded-[0.5px] bg-[var(--primary)] transition-all group-hover:bg-[var(--primary-hover)] group-hover:scale-x-90" />
            <span className="w-full h-[2px] rounded-[0.5px] bg-[var(--primary)] transition-all group-hover:bg-[var(--primary-hover)] group-hover:scale-x-110" />
          </span>

          {/* NS */}
          <span
            className={cn(
              "font-sans font-black tracking-wider text-[var(--text-primary)] transition-colors",
              textSize === "sm" && "text-[11px]",
              textSize === "md" && "text-xs sm:text-sm",
              textSize === "lg" && "text-sm sm:text-base",
              textSize === "xl" && "text-lg sm:text-xl"
            )}
          >
            NS
          </span>
        </div>
      )}
    </div>
  );
}
