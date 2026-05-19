'use client';

import React, { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Search, Bell, BookOpen, ExternalLink, Sun, Moon } from 'lucide-react';
import { useTheme } from 'next-themes';
import { cn } from '@/lib/utils';

export function AppNavbar() {
    const pathname = usePathname();
    const { theme, setTheme } = useTheme();
    const [mounted, setMounted] = useState(false);

    useEffect(() => setMounted(true), []);
    
    // Simple breadcrumb logic
    const pathParts = pathname.split('/').filter(Boolean);
    const pageTitle = pathParts.length > 0 
        ? pathParts[pathParts.length - 1].charAt(0).toUpperCase() + pathParts[pathParts.length - 1].slice(1)
        : 'Overview';

    const isDark = theme !== 'light';

    return (
        <nav className="navbar h-16 border-b border-border bg-background flex items-center justify-between px-6 sticky top-0 z-40">
            {/* Left: Breadcrumb / Title */}
            <div className="flex items-center gap-2">
                <span className="text-text-secondary text-sm">BlobLens</span>
                <span className="text-border">/</span>
                <span className="font-medium text-text-primary text-sm">{pageTitle}</span>
            </div>

            {/* Center: Search Shell */}
            <div className="hidden md:flex flex-1 max-w-md mx-8">
                <div className="relative w-full">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-secondary" />
                    <input 
                        type="text" 
                        placeholder="Search blobs, tx hashes, rollups..." 
                        className="w-full bg-surface border border-border rounded-md pl-10 pr-4 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all"
                    />
                </div>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-4">
                {/* Theme Toggle */}
                {mounted && (
                    <button
                        onClick={() => setTheme(isDark ? 'light' : 'dark')}
                        className="p-2 text-text-secondary hover:text-text-primary hover:bg-surface-elevated rounded-md transition-colors"
                        title={isDark ? "Switch to light mode" : "Switch to dark mode"}
                    >
                        {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
                    </button>
                )}

                <button className="p-2 text-text-secondary hover:text-text-primary hover:bg-surface-elevated rounded-md transition-colors">
                    <Bell className="h-5 w-5" />
                </button>
                <a 
                    href="https://docs.bloblens.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-text-secondary hover:text-text-primary hover:bg-surface-elevated border border-border rounded-md transition-colors"
                >
                    <BookOpen className="h-4 w-4" />
                    <span>Docs</span>
                </a>
            </div>
        </nav>
    );
}
