'use client';

import { RegimeBadge } from '@/components/shared/RegimeBadge';
import { formatNumber } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface Props {
  latestFeeWei: number;
  avgFeeWei24h: number;
  latestMaxBlobs: number;
  totalBlobs24h: number;
  activeRollups: number;
  avgUtil24h: string;
  ethUsd: number | null;
}

export function MarketPulsePanel({
  latestFeeWei,
  avgFeeWei24h,
  latestMaxBlobs,
  totalBlobs24h,
  activeRollups,
  avgUtil24h,
  ethUsd,
}: Props) {
  const feeGwei = latestFeeWei / 1e9;
  const avgGwei = avgFeeWei24h / 1e9;
  const changePct = avgGwei > 0 ? ((feeGwei - avgGwei) / avgGwei) * 100 : 0;
  const isUp = changePct > 5;
  const isDown = changePct < -5;

  const feeUsd = ethUsd != null && latestFeeWei > 0
    ? (latestFeeWei * 131_072) / 1e18 * ethUsd
    : null;

  return (
    <div className="h-full flex flex-col justify-between">
      {/* Regime + Status */}
      <div className="flex items-center justify-between mb-6">
        <RegimeBadge maxBlobsInBlock={latestMaxBlobs} size="lg" />
        <div className="flex items-center gap-2 px-3 py-1.5 surface border border-border rounded-md">
          <span className="pulse-dot" />
          <span className="text-[10px] font-bold uppercase tracking-wider text-status-healthy">Live</span>
        </div>
      </div>

      {/* Primary: Current Fee */}
      <div className="space-y-1 mb-8">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-text-secondary opacity-60">
          Current Blob Base Fee
        </p>
        <div className="flex items-baseline gap-3">
          <span className="font-mono text-4xl font-bold text-text-primary tracking-tight">
            {latestFeeWei > 0 ? feeGwei.toFixed(4) : '1 wei'}
          </span>
          {latestFeeWei > 0 && (
            <span className="text-sm font-mono text-text-secondary">Gwei</span>
          )}
        </div>
        {feeUsd != null && (
          <p className="text-xs font-mono text-text-secondary">
            ≈ {feeUsd < 0.01 ? `$${feeUsd.toFixed(6)}` : `$${feeUsd.toFixed(4)}`} / blob
          </p>
        )}
      </div>

      {/* 24h Change */}
      <div className="flex items-center gap-3 mb-8 p-3 rounded-lg bg-surface-elevated/50 border border-border/50">
        <div className={`flex items-center justify-center h-8 w-8 rounded-lg ${
          isUp ? 'bg-status-critical/10' : isDown ? 'bg-status-healthy/10' : 'bg-status-neutral/10'
        }`}>
          {isUp ? (
            <TrendingUp className="h-4 w-4 text-status-critical" />
          ) : isDown ? (
            <TrendingDown className="h-4 w-4 text-status-healthy" />
          ) : (
            <Minus className="h-4 w-4 text-status-neutral" />
          )}
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-text-secondary opacity-60">
            24h Change
          </p>
          <p className={`font-mono text-sm font-bold ${
            isUp ? 'text-status-critical' : isDown ? 'text-status-healthy' : 'text-text-primary'
          }`}>
            {changePct > 0 ? '+' : ''}{changePct.toFixed(1)}%
          </p>
        </div>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-text-secondary opacity-50">Blobs (24h)</p>
          <p className="font-mono text-lg font-bold text-text-primary">{formatNumber(totalBlobs24h)}</p>
        </div>
        <div className="space-y-1">
          <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-text-secondary opacity-50">Utilization</p>
          <p className="font-mono text-lg font-bold text-text-primary">{avgUtil24h}%</p>
        </div>
        <div className="space-y-1">
          <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-text-secondary opacity-50">Active Rollups</p>
          <p className="font-mono text-lg font-bold text-text-primary">{activeRollups}</p>
        </div>
        {ethUsd && (
          <div className="space-y-1">
            <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-text-secondary opacity-50">ETH / USD</p>
            <p className="font-mono text-lg font-bold text-text-primary">${ethUsd.toLocaleString()}</p>
          </div>
        )}
      </div>
    </div>
  );
}
