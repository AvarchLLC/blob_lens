'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { 
  TrendingUp, 
  TrendingDown, 
  Database, 
  Zap, 
  Cpu, 
  Clock, 
  Coins, 
  Gauge, 
  ArrowUpRight 
} from 'lucide-react';

const ICON_MAP: Record<string, React.ComponentType<any>> = {
  database: Database,
  zap: Zap,
  cpu: Cpu,
  clock: Clock,
  coins: Coins,
  "trending-up": TrendingUp,
  gauge: Gauge,
  "arrow-up-right": ArrowUpRight,
};

interface MetricCardProps {
  label: string;
  value: string | number;
  delta?: {
    value: string | number;
    isPositive: boolean;
  };
  note?: string;
  className?: string;
  icon?: string;
  accentColor?: string;
  glowColor?: string;
}

export function MetricCard({
  label,
  value,
  delta,
  note,
  className,
  icon,
  accentColor = "#00A7B5",
  glowColor = "rgba(0, 167, 181, 0.12)",
}: MetricCardProps) {
  const Icon = icon ? ICON_MAP[icon] : null;

  return (
    <div
      className={cn(
        "group relative overflow-hidden p-5 flex flex-col justify-between h-full rounded-none border border-dashed border-border bg-surface/20 transition-all duration-300 hover:-translate-y-1 hover:border-solid hover:bg-surface/30",
        className
      )}
    >
      {/* Radial glow background */}
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
        style={{
          background: `radial-gradient(circle 120px at 80% 20%, ${glowColor}, transparent 70%)`,
        }}
      />

      {/* Top neon glow bar */}
      <div
        className="absolute top-0 left-0 right-0 h-[2px] bg-border group-hover:h-[3px] transition-all duration-300"
        style={{
          backgroundColor: accentColor,
          boxShadow: `0 0 8px ${accentColor}`,
        }}
      />

      {/* Card header */}
      <div className="flex items-start justify-between gap-4 mb-3">
        <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-text-secondary opacity-70 font-mono group-hover:text-text-primary group-hover:opacity-100 transition-all">
          {label}
        </span>
        {Icon && (
          <div
            className="h-7 w-7 rounded-none border border-dashed border-border flex items-center justify-center bg-surface-elevated/50 group-hover:border-solid transition-all duration-300"
            style={{
              borderColor: accentColor,
              color: accentColor,
              boxShadow: `0 0 6px ${glowColor}`,
            }}
          >
            <Icon className="h-3.5 w-3.5" />
          </div>
        )}
      </div>

      {/* Numeric value & trend */}
      <div className="space-y-1.5 z-10 flex-1 flex flex-col justify-end">
        <div className="flex items-baseline gap-3 flex-wrap">
          <span className="font-mono font-bold text-text-primary text-2xl leading-none tracking-tight group-hover:scale-[1.01] origin-left transition-transform duration-300">
            {value}
          </span>
          {delta && (
            <div
              className={cn(
                "flex items-center gap-0.5 text-[11px] font-bold font-mono",
                delta.isPositive ? "text-status-healthy" : "text-status-critical"
              )}
            >
              {delta.isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              {delta.value}
            </div>
          )}
        </div>

        {note && (
          <p className="text-[10px] text-text-secondary opacity-60 group-hover:opacity-85 transition-opacity font-mono leading-relaxed mt-2">
            {note}
          </p>
        )}
      </div>

      {/* Corner tech ticks */}
      <div
        className="absolute bottom-1 right-1 h-1.5 w-1.5 border-r border-b border-border/20 group-hover:border-solid transition-all"
        style={{ borderColor: accentColor }}
      />
    </div>
  );
}
