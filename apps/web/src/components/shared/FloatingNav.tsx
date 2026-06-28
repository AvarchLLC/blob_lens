'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { cn } from '@/lib/utils';
import { MenuToggleIcon } from '@/components/ui/menu-toggle-icon';
import { useScroll } from '@/lib/use-scroll';

const NAV = [
    { href: '/',            label: 'Overview'    },
    { href: '/live',        label: 'Live'        },
    { href: '/leaderboard', label: 'Leaderboard' },
    { href: '/market',      label: 'Market'      },
    { href: '/research',    label: 'Research'    },
] as const;

export function FloatingNav() {
    const [open, setOpen] = React.useState(false);
    const scrolled = useScroll(10);
    const pathname = usePathname();
    const { theme, setTheme } = useTheme();
    const [mounted, setMounted] = React.useState(false);
    React.useEffect(() => {
        const handle = requestAnimationFrame(() => setMounted(true));
        return () => cancelAnimationFrame(handle);
    }, []);

    // Lock body scroll when mobile menu is open
    React.useEffect(() => {
        document.body.style.overflow = open ? 'hidden' : '';
        return () => { document.body.style.overflow = ''; };
    }, [open]);

    // Close mobile menu on route change
    React.useEffect(() => {
        const handle = requestAnimationFrame(() => setOpen(false));
        return () => cancelAnimationFrame(handle);
    }, [pathname]);

    const isDark = theme !== 'light';

    return (
        <header
            className={cn(
                // Base — full-width bar (sticky owned by layout wrapper)
                'relative z-50 w-full border-b border-transparent',
                // Rounded floating pill on scroll (md+)
                'md:mx-auto md:rounded-2xl md:border md:transition-all md:duration-300 md:ease-out',
                scrolled && !open
                    ? [
                        // Scrolled: shrink, float, blur
                        'bg-[#09090b]/90 supports-[backdrop-filter]:bg-[#09090b]/70 backdrop-blur-xl',
                        'border-[#2e2e33]',
                        'md:mt-4 md:max-w-4xl md:mb-4',
                        'md:shadow-[0_0_0_1px_rgba(139,92,246,0.08),0_8px_32px_rgba(0,0,0,0.6)]',
                    ]
                    : [
                        // At top: transparent full bar with bottom separator
                        open ? 'bg-[#09090b]/95' : 'bg-[#09090b]/80 supports-[backdrop-filter]:bg-[#09090b]/60 backdrop-blur-md',
                        'border-b border-[#27272a]',
                        'md:max-w-full md:rounded-none md:border-x-0 md:border-t-0',
                    ],
            )}
        >
            {/* ── Main bar ── */}
            <nav
                className={cn(
                    'flex h-14 w-full items-center justify-between px-4 md:h-12 md:transition-all md:duration-300 md:ease-out',
                    scrolled && 'md:px-3',
                )}
            >
                {/* Logo */}
                <Link href="/" className="flex items-center gap-2.5 shrink-0">
                    <Image
                        src="/brand/bloblens-logo.svg"
                        alt="BlobLens"
                        width={28}
                        height={28}
                        priority
                        className="drop-shadow-[0_0_8px_rgba(139,92,246,0.45)]"
                    />
                    <span className="wordmark text-[1.05rem] leading-none">
                        BlobLens
                    </span>
                </Link>
 
                {/* Desktop nav */}
                <div className="hidden items-center gap-1 md:flex">
                    {NAV.map(({ href, label }) => {
                        const active = href === '/' ? pathname === '/' : pathname.startsWith(href);
                        return (
                            <Link
                                key={href}
                                href={href}
                                className={cn(
                                    'floating-nav-link',
                                    active && 'floating-nav-link-active',
                                )}
                            >
                                {label}
                            </Link>
                        );
                    })}
                </div>
 
                {/* Right — LIVE + theme toggle */}
                <div className="hidden items-center gap-2 md:flex">
                    <div className="px-2 py-0.5 bg-primary/10 border border-primary/20 rounded-md text-[10px] font-bold text-primary flex items-center gap-1">
                        <span className="pulse-dot" />
                        LIVE
                    </div>
                    {mounted && (
                        <button
                            onClick={() => setTheme(isDark ? 'light' : 'dark')}
                            aria-label="Toggle theme"
                            className="flex items-center justify-center w-8 h-8 rounded-full text-[#71717a] hover:text-[#fafafa] hover:bg-white/8 transition-all duration-200"
                        >
                            {isDark ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
                        </button>
                    )}
                </div>
 
                {/* Mobile hamburger */}
                <button
                    onClick={() => setOpen(!open)}
                    aria-label={open ? 'Close menu' : 'Open menu'}
                    className="flex items-center justify-center w-9 h-9 rounded-lg border border-[#2e2e33] text-[#a1a1aa] hover:text-[#fafafa] hover:border-[#3f3f46] transition-all duration-200 md:hidden"
                >
                    <MenuToggleIcon open={open} className="size-5" duration={300} />
                </button>
            </nav>
 
            {/* ── Mobile overlay ── */}
            <div
                className={cn(
                    'fixed inset-x-0 top-14 bottom-0 z-50 flex flex-col bg-[#09090b]/98 backdrop-blur-xl border-t border-[#27272a] md:hidden',
                    open ? 'flex' : 'hidden',
                )}
            >
                <div
                    data-slot={open ? 'open' : 'closed'}
                    className={cn(
                        'data-[slot=open]:animate-in data-[slot=open]:fade-in-0 data-[slot=open]:zoom-in-95',
                        'data-[slot=closed]:animate-out data-[slot=closed]:fade-out-0 data-[slot=closed]:zoom-out-95',
                        'ease-out duration-200',
                        'flex h-full w-full flex-col justify-between gap-y-2 p-5',
                    )}
                >
                    {/* Nav links */}
                    <div className="grid gap-y-1">
                        {NAV.map(({ href, label }) => {
                            const active = href === '/' ? pathname === '/' : pathname.startsWith(href);
                            return (
                                <Link
                                    key={href}
                                    href={href}
                                    className={cn(
                                        'flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-colors',
                                        active
                                            ? 'bg-primary/10 text-primary border border-primary/20'
                                            : 'text-[#a1a1aa] hover:bg-[#18181b] hover:text-[#fafafa] border border-transparent',
                                    )}
                                >
                                    {active && <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />}
                                    {label}
                                </Link>
                            );
                        })}
                    </div>
 
                    {/* Bottom strip — LIVE + theme */}
                    <div className="flex items-center justify-between border-t border-[#27272a] pt-4">
                        <div className="px-2 py-0.5 bg-primary/10 border border-primary/20 rounded-md text-[10px] font-bold text-primary flex items-center gap-1">
                            <span className="pulse-dot" />
                            LIVE · mainnet
                        </div>
                        {mounted && (
                            <button
                                onClick={() => setTheme(isDark ? 'light' : 'dark')}
                                aria-label="Toggle theme"
                                className="flex items-center gap-2 rounded-lg border border-[#2e2e33] px-3 py-2 text-xs text-[#71717a] hover:text-[#fafafa] hover:border-[#3f3f46] transition-all duration-200"
                            >
                                {isDark ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
                                {isDark ? 'Light mode' : 'Dark mode'}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </header>
    );
}
