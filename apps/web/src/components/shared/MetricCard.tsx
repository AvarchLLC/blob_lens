'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface MetricCardProps {
  label: string;
  value: string | number;
  delta?: {
    value: string | number;
    isPositive: boolean;
  };
  note?: string;
  className?: string;
}

export function MetricCard({ label, value, delta, note, className }: MetricCardProps) {
  return (
    <div className={cn("surface-elevated p-6 flex flex-col justify-between h-full", className)}>
      <div>
        <span className="caption text-[11px] uppercase tracking-wider mb-2 block">
          {label}
        </span>
        <div className="flex items-baseline gap-3">
          <span className="metric-display text-text-primary">
            {value}
          </span>
          {delta && (
            <div className={cn(
              "flex items-center gap-1 text-[13px] font-bold",
              delta.isPositive ? "text-status-healthy" : "text-status-critical"
            )}>
              {delta.isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              {delta.value}
            </div>
          )}
        </div>
      </div>
      
      {note && (
        <p className="text-[11px] text-text-secondary mt-4 opacity-70">
          {note}
        </p>
      )}
    </div>
  );
}
