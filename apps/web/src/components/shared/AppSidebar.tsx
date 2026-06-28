'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ChevronLeft,
    ChevronRight,
    LayoutDashboard,
    Activity,
    Trophy,
    BarChart3,
    FlaskConical,
    Info,
    Menu,
    X,
    ExternalLink,
    BookOpen,
    Wallet,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSectionObserver } from '@/lib/useSectionObserver';

/* ────────────────────────────────────────────────────────────
   Navigation structure
   ──────────────────────────────────────────────────────────── */

interface NavChild {
    label: string;
    sectionId: string;
}

interface NavItem {
    href: string;
    label: string;
    icon: React.ElementType;
    children?: NavChild[];
}

interface NavGroup {
    label: string;
    items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
    {
        label: 'Intelligence',
        items: [
            {
                href: '/',
                label: 'Home',
                icon: Info,
            },
            {
                href: '/dashboard',
                label: 'Overview',
                icon: LayoutDashboard,
                children: [
                    { label: 'Market Pulse', sectionId: 'market-pulse' },
                    { label: '24h Snapshot', sectionId: '24h-snapshot' },
                    { label: 'Ecosystem Map', sectionId: 'ecosystem-map' },
                    { label: 'Market Structure', sectionId: 'market-structure' },
                    { label: '30d Trends', sectionId: '30d-trends' },
                    { label: 'Efficiency', sectionId: 'efficiency-intelligence' },
                    { label: 'Insights', sectionId: 'network-insights' },
                    { label: 'Live Feed', sectionId: 'live-feed' },
                ],
            },
            {
                href: '/da-insights',
                label: 'DA Insights',
                icon: BarChart3,
                children: [
                    { label: 'Network Share', sectionId: 'network-share-efficiency' },
                    { label: 'Fee Dynamics', sectionId: 'fee-dynamics' },
                    { label: 'Capacity & Congestion', sectionId: 'congestion-capacity' },
                    { label: 'Efficiency Leaderboard', sectionId: 'da-cost-efficiency' },
                    { label: 'Rollup Telemetry', sectionId: 'rollup-activity' },
                    { label: 'Historical Trends', sectionId: 'long-term-volume' },
                ],
            },
            {
                href: '/live',
                label: 'Live Stream',
                icon: Activity,
                children: [
                    { label: 'Activity Stream', sectionId: 'blob-activity-stream' },
                ],
            },
            {
                href: '/leaderboard',
                label: 'Leaderboard',
                icon: Trophy,
                children: [
                    { label: 'Rollup Rankings', sectionId: 'rollup-leaderboard' },
                ],
            },
        ],
    },
    {
        label: 'Market Intelligence',
        items: [
            {
                href: '/eth-liquidity',
                label: 'ETH Liquidity',
                icon: Wallet,
            },
            {
                href: '/whale-watch',
                label: 'Whale Watch',
                icon: Activity,
            },
            {
                href: '/market',
                label: 'Market Intel',
                icon: BarChart3,
                children: [
                    { label: 'Market State', sectionId: 'market-state-classification' },
                    { label: 'Cost Benchmarking', sectionId: 'historical-cost-benchmarking' },
                    { label: 'Throughput', sectionId: 'throughput-slot-analysis' },
                    { label: 'Ecosystem Behavior', sectionId: 'ecosystem-behavior' },
                    { label: 'Congestion Forecast', sectionId: 'congestion-forecast' },
                    { label: 'Network Graph', sectionId: 'ecosystem-relationships' },
                ],
            },
        ],
    },
    {
        label: 'Research',
        items: [
            {
                href: '/research',
                label: 'Deep Research',
                icon: FlaskConical,
                children: [
                    { label: 'Submission Velocity', sectionId: 'submission-velocity' },
                    { label: 'Market Structure', sectionId: 'ecosystem-distribution' },
                    { label: 'Packing Analysis', sectionId: 'data-packing-analysis' },
                    { label: 'Regime Timeline', sectionId: 'regime-timeline' },
                    { label: 'Fee Projection', sectionId: 'fee-projection' },
                ],
            },
        ],
    },
];

export function AppSidebar() {
    const pathname = usePathname();
    const [expanded, setExpanded] = useState(true);
    const [mobileOpen, setMobileOpen] = useState(false);

    // Dynamic section detection based on route
    const currentPageSections = useMemo(() => {
        const allItems = NAV_GROUPS.flatMap(g => g.items);
        const current = allItems.find(item =>
            item.href === '/' ? pathname === '/' : pathname.startsWith(item.href)
        );
        return current?.children?.map(c => c.sectionId) ?? [];
    }, [pathname]);

    const activeSectionId = useSectionObserver(currentPageSections);

    const sidebarContent = (
        <div className="flex flex-col h-full bg-sidebar/95 backdrop-blur-xl border-r border-border/30">
            {/* ── Brand Header (Aligned to h-14) ── */}
            <div className={cn(
                "h-14 flex items-center shrink-0 border-b border-border/30 relative overflow-hidden",
                expanded ? "px-4" : "justify-center px-0"
            )}>
                {expanded && (
                    <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-transparent pointer-events-none" />
                )}
                <Link href="/" className={cn("relative flex items-center group", expanded ? "w-full min-w-0 gap-3" : "justify-center w-auto")}>
                    <div className={cn(
                        "flex items-center justify-center rounded-lg shrink-0 transition-all duration-300",
                        "h-8 w-8",
                        "bg-gradient-to-br from-primary/10 to-accent/5 border border-primary/15",
                        "group-hover:border-primary/35 group-hover:from-primary/15"
                    )}>
                        <Image
                            src="/brand/bloblens-logo.svg"
                            alt="BlobLens"
                            width={18}
                            height={18}
                            priority
                        />
                    </div>
                    {expanded && (
                        <motion.div
                            initial={{ opacity: 0, x: -6 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -6 }}
                            className="min-w-0"
                        >
                            <p className="text-[13px] font-mono font-bold tracking-tight text-text-primary leading-none">
                                Blob<span className="text-primary">Lens</span>
                            </p>
                            <p className="text-[8px] font-mono font-bold uppercase tracking-[0.2em] text-text-secondary/40 mt-1 leading-none">
                                DA Telemetry
                            </p>
                        </motion.div>
                    )}
                </Link>
            </div>

            {/* ── Navigation ── */}
            <nav className="flex-1 overflow-y-auto sidebar-scrollbar py-3 space-y-4">
                {NAV_GROUPS.map((group) => (
                    <div key={group.label} className="px-2">
                        {expanded && (
                            <h3 className="text-[9px] font-mono font-bold uppercase tracking-[0.25em] text-text-tertiary px-3 mb-1.5 opacity-80">
                                {group.label}
                            </h3>
                        )}
                        <div className="flex flex-col gap-0.5">
                            {group.items.map((item) => (
                                <NavItemRow
                                    key={item.href}
                                    item={item}
                                    expanded={expanded}
                                    pathname={pathname}
                                    activeSectionId={activeSectionId}
                                    onMobileClose={() => setMobileOpen(false)}
                                />
                            ))}
                        </div>
                    </div>
                ))}
            </nav>

            {/* ── Bottom Utilities ── */}
            <div className="border-t border-border/30 p-2 space-y-0.5">
                <a
                    href="https://github.com/dhanushlnaik/blob_lens"
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn(
                        "flex items-center gap-3 py-1.5 rounded-sm text-text-secondary/60 hover:text-text-primary hover:bg-surface-elevated/60 transition-all duration-200",
                        expanded ? "px-3 text-xs font-mono" : "justify-center px-0"
                    )}
                >
                    <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                    {expanded && <span>GitHub</span>}
                </a>
                <a
                    href="https://docs.bloblens.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn(
                        "flex items-center gap-3 py-1.5 rounded-sm text-text-secondary/60 hover:text-text-primary hover:bg-surface-elevated/60 transition-all duration-200",
                        expanded ? "px-3 text-xs font-mono" : "justify-center px-0"
                    )}
                >
                    <BookOpen className="h-3.5 w-3.5 shrink-0" />
                    {expanded && <span>Docs</span>}
                </a>

                <div className="h-px border-t border-border/30 my-1" />

                <button
                    onClick={() => setExpanded(!expanded)}
                    className={cn(
                        "hidden md:flex items-center gap-3 py-1.5 rounded-sm text-text-secondary/60 hover:text-text-primary hover:bg-surface-elevated/60 transition-all duration-200 w-full",
                        expanded ? "px-3 text-xs font-mono" : "justify-center px-0"
                    )}
                >
                    {expanded ? (
                        <>
                            <ChevronLeft className="h-3.5 w-3.5 shrink-0" />
                            <span>Collapse</span>
                        </>
                    ) : (
                        <ChevronRight className="h-3.5 w-3.5 shrink-0" />
                    )}
                </button>
            </div>
        </div>
    );

    return (
        <>
            {/* ── Desktop Sidebar ── */}
            <motion.aside
                className="hidden md:flex flex-col h-screen shrink-0 overflow-hidden z-30 animate-fade-in"
                animate={{ width: expanded ? 240 : 56 }}
                transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
            >
                {sidebarContent}
            </motion.aside>

            {/* ── Mobile Toggle ── */}
            <button
                onClick={() => setMobileOpen(!mobileOpen)}
                className="md:hidden fixed top-2.5 left-2.5 z-50 p-2 rounded-lg bg-sidebar/90 backdrop-blur-md border border-border/30 text-text-secondary hover:text-text-primary transition-colors"
                aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            >
                {mobileOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>

            {/* ── Mobile Overlay ── */}
            <AnimatePresence>
                {mobileOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
                            onClick={() => setMobileOpen(false)}
                        />
                        <motion.aside
                            initial={{ x: '-100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '-100%' }}
                            transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
                            className="fixed left-0 top-0 h-screen w-64 z-50 flex flex-col md:hidden overflow-hidden"
                        >
                            {sidebarContent}
                        </motion.aside>
                    </>
                )}
            </AnimatePresence>

            {/* ── Mobile spacer ── */}
            <div className="h-14 md:hidden" />
        </>
    );
}

/* ────────────────────────────────────────────────────────────
   NavItemRow — parent link with collapsible children
   ──────────────────────────────────────────────────────────── */

function NavItemRow({
    item,
    expanded,
    pathname,
    activeSectionId,
    onMobileClose,
}: {
    item: NavItem;
    expanded: boolean;
    pathname: string;
    activeSectionId: string | null;
    onMobileClose: () => void;
}) {
    const Icon = item.icon;
    const isActive = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
    const hasChildren = item.children && item.children.length > 0;
    const [childrenOpen, setChildrenOpen] = useState(isActive);

    useEffect(() => {
        if (isActive) setChildrenOpen(true);
        else setChildrenOpen(false);
    }, [isActive]);

    return (
        <div className="relative">
            {/* Active Highlight Line */}
            {isActive && (
                <motion.div 
                    layoutId="active-sidebar-line"
                    className="absolute left-0 top-1.5 bottom-1.5 w-[3px] bg-primary rounded-r-full z-10"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
            )}

            {/* Parent link */}
            <Link
                href={item.href}
                onClick={onMobileClose}
                className={cn(
                    "group relative flex items-center gap-3 py-2 px-3 rounded-sm transition-all duration-150",
                    isActive 
                        ? "text-text-primary bg-gradient-to-r from-primary/8 via-primary/3 to-transparent font-medium" 
                        : "text-text-secondary/70 hover:text-text-primary hover:bg-surface-elevated/60",
                    !expanded && "justify-center px-0"
                )}
            >
                <Icon className={cn(
                    "h-4 w-4 shrink-0 transition-colors duration-150",
                    isActive ? "text-primary" : "text-text-secondary/60 group-hover:text-text-primary"
                )} />

                {expanded && (
                    <span className="text-xs font-mono tracking-wide whitespace-nowrap overflow-hidden text-ellipsis">
                        {item.label}
                    </span>
                )}

                {expanded && hasChildren && isActive && (
                    <button
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setChildrenOpen(!childrenOpen);
                        }}
                        className="ml-auto p-0.5 rounded text-text-secondary/40 hover:text-text-primary transition-colors"
                        aria-label="Toggle sections"
                    >
                        <motion.div
                            animate={{ rotate: childrenOpen ? 90 : 0 }}
                            transition={{ duration: 0.15 }}
                        >
                            <ChevronRight className="h-3 w-3" />
                        </motion.div>
                    </button>
                )}
            </Link>

            {/* Children / sub-sections */}
            <AnimatePresence initial={false}>
                {expanded && hasChildren && isActive && childrenOpen && (
                    <motion.ul
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
                        className="overflow-hidden relative"
                    >
                        {/* Tree line connector */}
                        <div className="absolute left-5 top-1 bottom-2 w-px bg-border/20" />

                        <div className="ml-5 mr-1 my-1 pl-3 space-y-0.5">
                            {item.children!.map((child) => {
                                const isChildActive = activeSectionId === child.sectionId;
                                return (
                                    <li key={child.sectionId}>
                                        <a
                                            href={`#${child.sectionId}`}
                                            onClick={(e) => {
                                                e.preventDefault();
                                                const el = document.getElementById(child.sectionId);
                                                if (el) {
                                                    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                                    history.replaceState(null, '', `#${child.sectionId}`);
                                                }
                                                onMobileClose();
                                            }}
                                            className={cn(
                                                "relative block py-1.5 px-2.5 rounded-sm transition-all duration-150 text-[11px] font-mono tracking-wide",
                                                isChildActive
                                                    ? "text-primary font-semibold bg-primary/5"
                                                    : "text-text-secondary/65 hover:text-text-primary hover:bg-surface-elevated/50"
                                            )}
                                        >
                                            <span className="flex items-center gap-2">
                                                {isChildActive && (
                                                    <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0 shadow-[0_0_8px_var(--primary)]" />
                                                )}
                                                {child.label}
                                            </span>
                                        </a>
                                    </li>
                                );
                            })}
                        </div>
                    </motion.ul>
                )}
            </AnimatePresence>
        </div>
    );
}
