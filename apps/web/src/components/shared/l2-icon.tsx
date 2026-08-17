"use client";

import React, { useState } from "react";
import Image from "next/image";
import { getL2IconPath } from "@/lib/l2-icons";
import { cn } from "@/lib/utils";

export interface L2IconProps {
  name: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl" | number;
  className?: string;
  showName?: boolean;
  nameClassName?: string;
}

const SIZE_MAP = {
  xs: 14,
  sm: 18,
  md: 22,
  lg: 28,
  xl: 36,
};

export function L2Icon({
  name,
  size = "md",
  className,
  showName = false,
  nameClassName,
}: L2IconProps) {
  const [hasError, setHasError] = useState(false);
  const iconPath = getL2IconPath(name);

  const dim = typeof size === "number" ? size : SIZE_MAP[size] || 22;

  const initialLetter = name ? name.charAt(0).toUpperCase() : "?";

  return (
    <div className="inline-flex items-center gap-2 select-none">
      <div
        className={cn(
          "relative flex items-center justify-center rounded-full overflow-hidden shrink-0 border border-[var(--border)] bg-[var(--surface-sunken)] shadow-xs transition-transform hover:scale-105",
          className
        )}
        style={{ width: `${dim}px`, height: `${dim}px` }}
        title={name}
      >
        {iconPath && !hasError ? (
          <Image
            src={iconPath}
            alt={`${name} icon`}
            width={dim}
            height={dim}
            className="w-full h-full object-cover rounded-full"
            onError={() => setHasError(true)}
            unoptimized
          />
        ) : (
          <span
            className="font-mono font-bold text-[var(--primary-text)] uppercase leading-none"
            style={{ fontSize: `${Math.max(9, Math.floor(dim * 0.45))}px` }}
          >
            {initialLetter}
          </span>
        )}
      </div>

      {showName && (
        <span
          className={cn(
            "font-mono font-semibold text-[var(--text-primary)] text-xs tracking-tight",
            nameClassName
          )}
        >
          {name}
        </span>
      )}
    </div>
  );
}
