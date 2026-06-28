'use client';

import React, { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  Search, BookOpen, Sun, Moon,
  LayoutDashboard, Activity, Trophy, BarChart3,
  FlaskConical, Landmark, Wallet, ShieldAlert, ShieldCheck,
  Brain, HelpCircle, Layers,
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { cn } from '@/lib/utils';

const PAGE_META: { match: string; title: string; icon: React.ElementType }[] = [
  { match: '/dashboard',             title: 'Overview',        icon: LayoutDashboard },
  { match: '/live',                  title: 'Live Stream',     icon: Activity },
  { match: '/leaderboard',           title: 'Leaderboard',     icon: Trophy },
  { match: '/market',                title: 'Market Intel',    icon: BarChart3 },
  { match: '/da-insights',           title: 'DA Insights',     icon: BarChart3 },
  { match: '/research/security',     title: 'Security',        icon: ShieldCheck },
  { match: '/research/ai-insights',  title: 'AI Insights',     icon: Brain },
  { match: '/research',             title: 'Deep Research',   icon: FlaskConical },
  { match: '/rollup',               title: 'Rollup',          icon: Layers },
  { match: '/whale-watch',          title: 'Whale Watch',     icon: Activity },
  { match: '/compliance/ofac',      title: 'OFAC List',       icon: ShieldAlert },
  { match: '/rwa',                  title: 'RWA Valuation',   icon: Landmark },
  { match: '/eth-liquidity',        title: 'ETH Liquidity',   icon: Wallet },
  { match: '/unknown',              title: 'Unknown Senders', icon: HelpCircle },
];

function getPageMeta(pathname: string) {
  const sorted = [...PAGE_META].sort((a, b) => b.match.length - a.match.length);
  return sorted.find(p => pathname.startsWith(p.match)) ?? { title: 'Home', icon: LayoutDashboard };
}

export function AppNavbar() {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);

  useEffect(() => setMounted(true), []);

  const isDark = theme !== 'light';
  const pageMeta = getPageMeta(pathname);
  const PageIcon = pageMeta.icon;
  const segments = pathname.split('/').filter(Boolean);

  return (
    <header className="sticky top-0 z-40 shrink-0">
      <nav className="h-14 bg-[#F8F7FF]/95 dark:bg-[#090D16]/95 backdrop-blur-xl border-b border-black/5 dark:border-white/5 flex items-center px-6 gap-4">

        {/* ── Left: breadcrumb + page identity ── */}
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {/* Page icon badge */}
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary/10 to-accent/5 border border-primary/15 flex items-center justify-center shrink-0 shadow-sm">
            <PageIcon className="h-4 w-4 text-primary" />
          </div>

          {/* Breadcrumb */}
          <nav className="flex items-center gap-1.5 text-xs font-mono min-w-0" aria-label="Breadcrumb">
            {segments.length === 0 ? (
              <span className="font-bold text-text-primary">Home</span>
            ) : (
              <>
                <Link href="/" className="text-text-secondary/40 hover:text-text-secondary transition-colors">
                  BlobLens
                </Link>
                {segments.map((seg, i) => (
                  <React.Fragment key={seg}>
                    <span className="text-text-secondary/20">/</span>
                    {i === segments.length - 1 ? (
                      <span className="font-bold text-text-primary capitalize truncate">
                        {seg.replace(/-/g, ' ')}
                      </span>
                    ) : (
                      <Link
                        href={'/' + segments.slice(0, i + 1).join('/')}
                        className="text-text-secondary/50 hover:text-text-primary transition-colors capitalize truncate"
                      >
                        {seg.replace(/-/g, ' ')}
                      </Link>
                    )}
                  </React.Fragment>
                ))}
              </>
            )}
          </nav>

          {/* Live pulse */}
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/5 border border-emerald-500/10 shrink-0">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
            </span>
            <span className="text-[9px] font-mono font-bold uppercase tracking-[0.18em] text-emerald-400 leading-none">Live</span>
          </div>
        </div>

        {/* ── Center: Search ── */}
        <div className="hidden md:flex flex-1 max-w-xs lg:max-w-sm">
          <div className={cn(
            'relative w-full flex items-center gap-2.5 px-3.5 py-1.5 rounded-lg border transition-all duration-200',
            searchFocused
              ? 'bg-black/3 dark:bg-white/5 border-primary/30 shadow-[0_0_12px_rgba(139,92,246,0.05)]'
              : 'bg-black/2 dark:bg-white/2 border-black/5 dark:border-white/5 hover:border-black/10 dark:hover:border-white/10 hover:bg-black/3 dark:hover:bg-white/3'
          )}>
            <Search className={cn(
              'h-3.5 w-3.5 shrink-0 transition-colors duration-200',
              searchFocused ? 'text-primary' : 'text-text-secondary/40'
            )} />
            <input
              type="text"
              placeholder="Search telemetry..."
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              className="flex-1 bg-transparent text-xs font-mono text-text-primary placeholder:text-text-secondary/30 focus:outline-none min-w-0"
            />
            <kbd className={cn(
              'hidden lg:flex items-center gap-0.5 px-1.5 py-0.5 rounded border text-[9px] font-mono shrink-0 transition-colors',
              searchFocused
                ? 'border-primary/25 text-primary bg-primary/5'
                : 'border-black/5 dark:border-white/5 text-text-secondary/30 bg-black/2 dark:bg-white/2'
            )}>
              ⌘K
            </kbd>
          </div>
        </div>

        {/* ── Right: Actions ── */}
        <div className="flex items-center gap-1 shrink-0">
          {/* Theme toggle */}
          {mounted && (
            <button
              onClick={() => setTheme(isDark ? 'light' : 'dark')}
              title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              className="p-2 rounded-lg text-text-secondary/50 hover:text-text-primary hover:bg-black/3 dark:hover:bg-white/3 transition-all cursor-pointer"
            >
              {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
          )}

          {/* Docs pill */}
          <a
            href="https://docs.bloblens.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-mono uppercase tracking-wider text-text-secondary/60 hover:text-text-primary bg-black/2 dark:bg-white/2 border border-black/5 dark:border-white/5 hover:border-black/10 dark:hover:border-white/10 hover:bg-black/4 dark:hover:bg-white/4 rounded-sm transition-all"
          >
            <BookOpen className="h-3.5 w-3.5" />
            Docs
          </a>

          {/* GitHub */}
          <a
            href="https://github.com/dhanushlnaik/blob_lens"
            target="_blank"
            rel="noopener noreferrer"
            title="GitHub"
            className="p-2 rounded-lg text-text-secondary/50 hover:text-text-primary hover:bg-black/3 dark:hover:bg-white/3 transition-all cursor-pointer"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
            </svg>
          </a>
        </div>
      </nav>

      {/* Thin tech accent line */}
      <div className="h-[1px] bg-black/5 dark:bg-white/5 w-full" />
    </header>
  );
}
