import React, { type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface DottedCardProps {
  children: ReactNode;
  className?: string;
  active?: boolean;
  title?: string;
  subtitle?: string;
  badge?: string;
  badgeType?: "default" | "iris" | "live" | "warning" | "danger";
  telemetryMeta?: string;
  techBracket?: boolean;
  scanline?: boolean;
}

export function DottedCard({
  children,
  className,
  active = false,
  title,
  subtitle,
  badge,
  badgeType = "default",
  telemetryMeta,
  techBracket = false,
  scanline = false,
}: DottedCardProps) {
  return (
    <div
      className={cn(
        "dotted-card p-3.5 sm:p-4 flex flex-col justify-between relative group",
        techBracket && "tech-bracket",
        scanline && "scanline-effect",
        active && "dotted-card-active",
        className
      )}
    >
      {/* Top Header Bar */}
      {(title || subtitle || badge || telemetryMeta) && (
        <div className="flex items-center justify-between gap-2 pb-2 mb-2 border-b border-dashed border-[var(--border)] shrink-0">
          <div className="flex flex-col min-w-0">
            {title && (
              <h3 className="text-xs font-mono font-semibold uppercase tracking-wider text-[var(--text-primary)] break-words flex items-center gap-2">
                {title}
              </h3>
            )}
            {subtitle && (
              <span className="text-[11px] font-sans text-[var(--text-secondary)] break-words mt-0.5">
                {subtitle}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {telemetryMeta && (
              <span className="text-[10px] font-mono text-[var(--text-muted)] tabular-nums hidden sm:inline-block">
                {telemetryMeta}
              </span>
            )}

            {badge && (
              <span
                className={cn(
                  "px-2 py-0.5 text-[10px] font-mono font-semibold tracking-wider uppercase rounded-[4px] border",
                  badgeType === "default" && "bg-[var(--surface-sunken)] text-[var(--text-primary)] border-[var(--border)]",
                  badgeType === "iris" && "bg-[var(--primary-bg)] text-[var(--primary-text)] border-[var(--primary-border)]",
                  badgeType === "live" && "badge-live border-none",
                  badgeType === "warning" && "bg-[var(--warning-bg)] text-[var(--warning)] border-[var(--warning)]/30",
                  badgeType === "danger" && "bg-[var(--danger-bg)] text-[var(--danger)] border-[var(--danger)]/30"
                )}
              >
                {badge}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 relative z-0">{children}</div>
    </div>
  );
}
