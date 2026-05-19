'use client';

import { classifyRegime } from '@/lib/utils';
import type { LeaderboardRow, MarketHour } from '@/types';
import { TrendingUp, TrendingDown, AlertTriangle, BarChart3, Shield, Zap } from 'lucide-react';

interface Props {
  market24h: MarketHour[];
  leaderboard: LeaderboardRow[];
}

interface Insight {
  icon: React.ElementType;
  title: string;
  body: string;
  severity: 'info' | 'success' | 'warning' | 'critical';
}

const SEVERITY_STYLES = {
  info: {
    border: 'border-primary/20',
    bg: 'bg-primary/5',
    iconColor: 'text-primary',
    dotColor: 'bg-primary',
  },
  success: {
    border: 'border-status-healthy/20',
    bg: 'bg-status-healthy/5',
    iconColor: 'text-status-healthy',
    dotColor: 'bg-status-healthy',
  },
  warning: {
    border: 'border-status-warning/20',
    bg: 'bg-status-warning/5',
    iconColor: 'text-status-warning',
    dotColor: 'bg-status-warning',
  },
  critical: {
    border: 'border-status-critical/20',
    bg: 'bg-status-critical/5',
    iconColor: 'text-status-critical',
    dotColor: 'bg-status-critical',
  },
};

function generateInsights(market24h: MarketHour[], leaderboard: LeaderboardRow[]): Insight[] {
  const insights: Insight[] = [];

  // 1. Demand insight
  if (market24h.length >= 2) {
    const firstHalf = market24h.slice(0, Math.floor(market24h.length / 2));
    const secondHalf = market24h.slice(Math.floor(market24h.length / 2));
    const avgFirst = firstHalf.reduce((s, m) => s + Number(m.blob_count), 0) / firstHalf.length;
    const avgSecond = secondHalf.reduce((s, m) => s + Number(m.blob_count), 0) / secondHalf.length;
    const changePct = avgFirst > 0 ? ((avgSecond - avgFirst) / avgFirst) * 100 : 0;

    if (Math.abs(changePct) > 10) {
      const rising = changePct > 0;
      insights.push({
        icon: rising ? TrendingUp : TrendingDown,
        title: rising ? 'Blob Demand Rising' : 'Blob Demand Cooling',
        body: `Blob production has ${rising ? 'increased' : 'decreased'} by ${Math.abs(changePct).toFixed(0)}% in the latter half of the 24h window. ${rising ? 'Expect fee pressure to build.' : 'Fee conditions are favorable for submissions.'}`,
        severity: rising ? 'warning' : 'success',
      });
    }
  }

  // 2. Dominance insight
  const known = leaderboard.filter((r) => r.rollup !== 'UNKNOWN');
  if (known.length > 0) {
    const topRollup = known[0];
    const share = Number(topRollup.network_share_pct);
    if (share > 20) {
      insights.push({
        icon: BarChart3,
        title: `${topRollup.rollup} Dominance`,
        body: `${topRollup.rollup} accounts for ${share.toFixed(1)}% of total blob volume. ${share > 40 ? 'Single-entity dominance above 40% poses concentration risk.' : 'Market share remains within healthy distribution bounds.'}`,
        severity: share > 40 ? 'warning' : 'info',
      });
    }
  }

  // 3. Congestion insight
  const regimeCounts = market24h.reduce((acc, m) => {
    const r = classifyRegime(m.max_blobs_in_block);
    acc[r] = (acc[r] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const congestedHours = (regimeCounts['congested'] ?? 0) + (regimeCounts['spike'] ?? 0);
  if (congestedHours > 0) {
    const pct = (congestedHours / market24h.length) * 100;
    insights.push({
      icon: pct > 30 ? AlertTriangle : Zap,
      title: pct > 30 ? 'Elevated Congestion' : 'Congestion Detected',
      body: `${congestedHours}h of congested or spike regime detected in the last 24h (${pct.toFixed(0)}% of the window). ${pct > 50 ? 'Sustained pressure on the fee market.' : 'Intermittent spikes suggest periodic batch coordination.'}`,
      severity: pct > 50 ? 'critical' : pct > 30 ? 'warning' : 'info',
    });
  } else {
    insights.push({
      icon: Shield,
      title: 'Market Stable',
      body: 'No congested or spike regimes detected in the last 24 hours. Fee conditions are optimal for data availability submissions.',
      severity: 'success',
    });
  }

  // 4. Efficiency insight
  if (known.length >= 3) {
    const avgEff = known.reduce((s, r) => s + Number(r.efficiency_score), 0) / known.length;
    const label = avgEff >= 70 ? 'high' : avgEff >= 45 ? 'moderate' : 'low';
    insights.push({
      icon: BarChart3,
      title: 'Ecosystem Efficiency',
      body: `Average rollup efficiency score is ${avgEff.toFixed(0)}/100 (${label}). ${avgEff < 50 ? 'Most rollups could improve packing and timing strategies.' : 'The ecosystem is making efficient use of available blob space.'}`,
      severity: avgEff >= 60 ? 'success' : avgEff >= 40 ? 'warning' : 'critical',
    });
  }

  return insights;
}

export function NetworkInsightCards({ market24h, leaderboard }: Props) {
  const insights = generateInsights(market24h, leaderboard);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {insights.map((insight, idx) => {
        const s = SEVERITY_STYLES[insight.severity];
        const Icon = insight.icon;

        return (
          <div
            key={idx}
            className={`p-5 rounded-xl border ${s.border} ${s.bg} space-y-3 transition-all duration-200 hover:scale-[1.01]`}
          >
            <div className="flex items-center gap-3">
              <div className={`flex items-center justify-center h-8 w-8 rounded-lg bg-background/50 ${s.iconColor}`}>
                <Icon className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-bold text-text-primary truncate">{insight.title}</h4>
              </div>
              <span className={`h-2 w-2 rounded-full ${s.dotColor} animate-pulse`} />
            </div>
            <p className="text-xs text-text-secondary leading-relaxed">{insight.body}</p>
          </div>
        );
      })}
    </div>
  );
}
