'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { motion } from 'motion/react';
import { Sun, Moon, ChevronLeft } from 'lucide-react';
import { useTheme } from 'next-themes';
import {
    IconLayoutDashboard,
    IconRadar,
    IconTrophy,
    IconChartBar,
    IconFlask,
} from '@tabler/icons-react';
import { Sidebar, SidebarBody, useSidebar } from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';

const NAV = [
    { href: '/',            label: 'Overview',    icon: IconLayoutDashboard },
    { href: '/live',        label: 'Live',        icon: IconRadar            },
    { href: '/leaderboard', label: 'Leaderboard', icon: IconTrophy           },
    { href: '/market',      label: 'Market',      icon: IconChartBar         },
    { href: '/research',    label: 'Research',    icon: IconFlask            },
] as const;

function NavLink({
    href,
    label,
    icon: Icon,
}: {
    href: string;
    label: string;
    icon: React.ElementType;
}) {
    const pathname = usePathname();
    const active = href === '/' ? pathname === '/' : pathname.startsWith(href);
    const { open, animate } = useSidebar();

    return (
        <Link
            href={href}
            className={cn(
                'relative flex items-center gap-3 rounded-xl py-3 transition-all duration-200 group/link overflow-hidden border',
                open ? 'px-3' : 'px-0 justify-center',
                active
                    ? 'bg-[#00df81]/10 text-[#00df81] border-[#00df81]/20'
                    : 'text-[#a1a1aa] hover:bg-white/[0.04] hover:text-[#fafafa] border-transparent hover:border-white/[0.06]',
            )}
        >
            {/* Active left accent bar */}
            {active && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 h-[55%] w-[3px] rounded-r-full bg-gradient-to-b from-[#00df81] to-[#27a98d] shadow-[0_0_8px_rgba(0,223,129,0.5)]" />
            )}
            <Icon
                className={cn(
                    'h-5 w-5 shrink-0 transition-colors duration-200',
                    active
                        ? 'text-[#00df81]'
                        : 'text-[#a1a1aa] group-hover/link:text-[#fafafa]',
                )}
            />
            <motion.span
                animate={{
                    display: animate ? (open ? 'inline-block' : 'none') : 'inline-block',
                    opacity: animate ? (open ? 1 : 0) : 1,
                }}
                transition={{ duration: 0.15, ease: 'easeOut' }}
                className="text-sm font-medium whitespace-pre !p-0 !m-0"
            >
                {label}
            </motion.span>
        </Link>
    );
}

export function AppSidebar() {
    const [open, setOpen] = useState(true);
    const { theme, setTheme } = useTheme();
    const [mounted, setMounted] = useState(false);
    React.useEffect(() => setMounted(true), []);
    const isDark = theme !== 'light';

    return (
        <Sidebar open={open} setOpen={setOpen}>
            <SidebarBody className="sidebar-glass justify-between gap-10">
                {/* ── Top: logo + toggle + nav ── */}
                <div className="flex flex-1 flex-col overflow-x-hidden overflow-y-auto">
                    {/* Logo */}
                    <Link
                        href="/"
                        className={cn(
                            'flex items-center shrink-0 transition-all duration-200 py-3 px-0.5',
                            open ? 'gap-3' : 'justify-center',
                        )}
                    >
                        <Image
                            src="/brand/bloblogo.png"
                            alt="BlobLens"
                            width={32}
                            height={32}
                            priority
                            className="shrink-0 drop-shadow-[0_0_8px_rgba(0,223,129,0.5)]"
                        />
                        <motion.span
                            animate={{
                                display: open ? 'inline-block' : 'none',
                                opacity: open ? 1 : 0,
                            }}
                            transition={{ duration: 0.15, ease: 'easeOut' }}
                            className="wordmark text-[1.2rem] leading-none whitespace-pre"
                        >
                            BlobLens
                        </motion.span>
                    </Link>

                    {/* Collapse / expand toggle */}
                    <button
                        onClick={() => setOpen(!open)}
                        aria-label={open ? 'Collapse sidebar' : 'Expand sidebar'}
                        className={cn(
                            'flex items-center rounded-xl py-3 mt-4 w-full border border-transparent transition-all duration-200',
                            'text-[#71717a] hover:text-[#fafafa] hover:bg-white/[0.04] hover:border-white/[0.06]',
                            open ? 'px-3 gap-3' : 'px-0 justify-center',
                        )}
                    >
                        <ChevronLeft
                            className={cn(
                                'h-5 w-5 shrink-0 transition-transform duration-300',
                                !open && 'rotate-180',
                            )}
                        />
                        <motion.span
                            animate={{
                                display: open ? 'inline-block' : 'none',
                                opacity: open ? 1 : 0,
                            }}
                            transition={{ duration: 0.15, ease: 'easeOut' }}
                            className="text-sm font-medium whitespace-pre"
                        >
                            Collapse
                        </motion.span>
                    </button>

                    {/* Nav links */}
                    <div className="mt-6 flex flex-col gap-2.5">
                        {NAV.map(({ href, label, icon }) => (
                            <NavLink key={href} href={href} label={label} icon={icon} />
                        ))}
                    </div>
                </div>

                {/* ── Bottom: LIVE badge + theme toggle ── */}
                <div className="flex flex-col gap-3 pb-4">
                    <div className="green-badge w-fit">
                        <span className="pulse-dot" />
                        <motion.span
                            animate={{
                                display: open ? 'inline' : 'none',
                                opacity: open ? 1 : 0,
                            }}
                            transition={{ duration: 0.15, ease: 'easeOut' }}
                        >
                            LIVE · mainnet
                        </motion.span>
                    </div>

                    {mounted && (
                        <button
                            onClick={() => setTheme(isDark ? 'light' : 'dark')}
                            aria-label="Toggle theme"
                            className={cn(
                                'flex items-center gap-2 rounded-lg border border-[#2e2e33] py-2.5 text-xs text-[#71717a] hover:text-[#fafafa] hover:border-[#3f3f46] transition-all duration-200',
                                open ? 'px-3' : 'justify-center px-2',
                            )}
                        >
                            {isDark
                                ? <Sun className="h-3.5 w-3.5 shrink-0" />
                                : <Moon className="h-3.5 w-3.5 shrink-0" />}
                            <motion.span
                                animate={{
                                    display: open ? 'inline-block' : 'none',
                                    opacity: open ? 1 : 0,
                                }}
                                transition={{ duration: 0.15, ease: 'easeOut' }}
                                className="whitespace-pre"
                            >
                                {isDark ? 'Light mode' : 'Dark mode'}
                            </motion.span>
                        </button>
                    )}
                </div>
            </SidebarBody>
        </Sidebar>
    );
}
