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
    Landmark,
    Wallet,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSectionObserver } from '@/lib/useSectionObserver';

/* ────────────────────────────────────────────────────────────
   Navigation structure — pages → sections
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
                href: '/rwa',
                label: 'RWA Valuation',
                icon: Landmark,
            },
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
            {
                href: '/unknown',
                label: 'Unknown Senders',
                icon: Info,
            },
        ],
    },
];

/* ────────────────────────────────────────────────────────────
   Sidebar component
   ──────────────────────────────────────────────────────────── */

export function AppSidebar() {
    const [expanded, setExpanded] = useState(true);
    const [mobileOpen, setMobileOpen] = useState(false);
    const pathname = usePathname();

    // Close mobile menu on route change
    useEffect(() => { setMobileOpen(false); }, [pathname]);

    // Lock body scroll when mobile menu is open
    useEffect(() => {
        document.body.style.overflow = mobileOpen ? 'hidden' : '';
        return () => { document.body.style.overflow = ''; };
    }, [mobileOpen]);

    // Collect all section IDs for the current page
    const currentPageSections = useMemo(() => {
        const allItems = NAV_GROUPS.flatMap(g => g.items);
        const current = allItems.find(item =>
            item.href === '/' ? pathname === '/' : pathname.startsWith(item.href)
        );
        return current?.children?.map(c => c.sectionId) ?? [];
    }, [pathname]);

    const activeSectionId = useSectionObserver(currentPageSections);

    const sidebarContent = (
        <>
            {/* ── Brand Header ── */}
            <div className={cn(
                "h-16 flex items-center shrink-0 border-b border-border/50",
                expanded ? "px-5" : "justify-center px-0"
            )}>
                <Link href="/" className="flex items-center gap-3 group">
                    <div className={cn(
                        "flex items-center justify-center rounded-xl transition-all duration-300",
                        expanded ? "h-9 w-9" : "h-9 w-9",
                        "bg-primary/10 shadow-[0_0_0_1px_rgba(0,167,181,0.08),0_0_12px_rgba(0,167,181,0.1)]",
                        "group-hover:shadow-[0_0_0_1px_rgba(0,167,181,0.15),0_0_20px_rgba(0,167,181,0.18)]"
                    )}>
                        <Image
                            src="/brand/bloblogo.png"
                            alt="BlobLens"
                            width={24}
                            height={24}
                            priority
                            className="rounded-lg"
                        />
                    </div>
                    {expanded && (
                        <motion.span
                            initial={{ opacity: 0, x: -4 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -4 }}
                            className="font-display text-lg tracking-tight text-text-primary"
                        >
                            BlobLens
                        </motion.span>
                    )}
                </Link>
            </div>

            {/* ── Navigation ── */}
            <nav className="flex-1 overflow-y-auto sidebar-scrollbar py-4">
                {NAV_GROUPS.map((group) => (
                    <div key={group.label} className="mb-2">
                        {expanded && (
                            <h3 className="px-5 mb-2 text-[10px] font-bold uppercase tracking-[0.12em] text-text-secondary/50">
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
            <div className="border-t border-border/50 p-3 space-y-0.5">
                {/* External links */}
                <a
                    href="https://github.com/AvarchLLC/blob_lens"
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn(
                        "flex items-center gap-3 py-2 rounded-lg text-text-secondary/70 hover:text-text-primary hover:bg-surface-elevated/50 transition-all duration-200",
                        expanded ? "px-3" : "justify-center px-0"
                    )}
                >
                    <ExternalLink className="h-4 w-4 shrink-0" />
                    {expanded && <span className="text-xs font-medium">GitHub</span>}
                </a>
                <a
                    href="https://docs.bloblens.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn(
                        "flex items-center gap-3 py-2 rounded-lg text-text-secondary/70 hover:text-text-primary hover:bg-surface-elevated/50 transition-all duration-200",
                        expanded ? "px-3" : "justify-center px-0"
                    )}
                >
                    <BookOpen className="h-4 w-4 shrink-0" />
                    {expanded && <span className="text-xs font-medium">Docs</span>}
                </a>

                {/* Divider */}
                <div className="h-px bg-border/30 my-1" />

                {/* Collapse Toggle */}
                <button
                    onClick={() => setExpanded(!expanded)}
                    className={cn(
                        "hidden md:flex items-center gap-3 py-2 rounded-lg text-text-secondary/70 hover:text-text-primary hover:bg-surface-elevated/50 transition-all duration-200 w-full",
                        expanded ? "px-3" : "justify-center px-0"
                    )}
                >
                    {expanded
                        ? <><ChevronLeft className="h-4 w-4 shrink-0" /><span className="text-xs font-medium">Collapse</span></>
                        : <ChevronRight className="h-4 w-4 shrink-0" />
                    }
                </button>
            </div>
        </>
    );

    return (
        <>
            {/* ── Desktop Sidebar ── */}
            <motion.aside
                className="hidden md:flex flex-col h-screen bg-sidebar border-r border-border/50 shrink-0 overflow-hidden"
                animate={{ width: expanded ? 260 : 64 }}
                transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
            >
                {sidebarContent}
            </motion.aside>

            {/* ── Mobile Toggle ── */}
            <button
                onClick={() => setMobileOpen(!mobileOpen)}
                className="md:hidden fixed top-3 left-3 z-50 p-2 rounded-xl bg-sidebar/90 backdrop-blur-md border border-border/50 text-text-secondary hover:text-text-primary transition-colors"
                aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            >
                {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
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
                            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
                            className="fixed left-0 top-0 h-screen w-72 bg-sidebar border-r border-border/50 z-50 flex flex-col md:hidden overflow-hidden"
                        >
                            {sidebarContent}
                        </motion.aside>
                    </>
                )}
            </AnimatePresence>

            {/* ── Mobile spacer ── */}
            <div className="h-12 md:hidden" />
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
    const childActive = hasChildren && item.children!.some(c => c.sectionId === activeSectionId);

    // Auto-expand children when on the route
    const [childrenOpen, setChildrenOpen] = useState(isActive);
    useEffect(() => {
        if (isActive) setChildrenOpen(true);
        else setChildrenOpen(false);
    }, [isActive]);

    return (
        <div>
            {/* Parent link */}
            <Link
                href={item.href}
                onClick={onMobileClose}
                className={cn(
                    "group relative flex items-center gap-3 py-2 rounded-lg mx-2 transition-all duration-200",
                    expanded ? "px-3" : "justify-center px-0 mx-1",
                    isActive
                        ? "text-primary bg-primary/8"
                        : "text-text-secondary hover:text-text-primary hover:bg-surface-elevated/50"
                )}
            >
                {/* Active indicator bar */}
                {(isActive || childActive) && (
                    <motion.span
                        layoutId="sidebar-active-indicator"
                        className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 bg-primary rounded-r-full"
                        transition={{ duration: 0.2, ease: 'easeInOut' }}
                    />
                )}

                <Icon className={cn(
                    "h-[18px] w-[18px] shrink-0 transition-colors duration-200",
                    isActive ? "text-primary" : "text-text-secondary/70 group-hover:text-text-primary"
                )} />

                {expanded && (
                    <motion.span
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-sm font-medium whitespace-nowrap overflow-hidden text-ellipsis"
                    >
                        {item.label}
                    </motion.span>
                )}

                {/* Expand/collapse chevron for items with children */}
                {expanded && hasChildren && isActive && (
                    <button
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setChildrenOpen(!childrenOpen);
                        }}
                        className="ml-auto p-0.5 rounded text-text-secondary/50 hover:text-text-primary transition-colors"
                    >
                        <motion.div
                            animate={{ rotate: childrenOpen ? 90 : 0 }}
                            transition={{ duration: 0.2 }}
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
                        transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
                        className="overflow-hidden"
                    >
                        <div className="ml-7 mr-2 my-1 pl-3 border-l border-border/40">
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
                                                    // Update hash without scroll jump
                                                    history.replaceState(null, '', `#${child.sectionId}`);
                                                }
                                                onMobileClose();
                                            }}
                                            className={cn(
                                                "block py-1.5 px-2.5 rounded-md text-[13px] transition-all duration-200",
                                                isChildActive
                                                    ? "text-primary font-semibold bg-primary/5"
                                                    : "text-text-secondary/60 hover:text-text-primary hover:bg-surface-elevated/30"
                                            )}
                                        >
                                            <span className="flex items-center gap-2">
                                                {isChildActive && (
                                                    <motion.span
                                                        layoutId="section-dot"
                                                        className="h-1.5 w-1.5 rounded-full bg-primary shrink-0"
                                                        transition={{ duration: 0.2 }}
                                                    />
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
