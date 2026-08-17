"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search, Menu, X, ChevronDown, Activity, Lock, Layers } from "lucide-react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "./theme-toggle";
import { BlobLensLogo } from "./blob-lens-logo";
import { SearchModal } from "./search-modal";

const NAV_LINKS = [
  { href: "/", label: "Overview" },
  { href: "/dashboard", label: "Console" },
  { href: "/market", label: "Fee Market" },
  { href: "/leaderboard", label: "Rollups" },
  { href: "/dainsights", label: "DA Insights" },
  { href: "/eips", label: "EIPs" },
];

const MEMPOOL_DROPDOWN = [
  {
    href: "/mempool",
    label: "Public Mempool",
    desc: "Baseline MEV extraction, gas pressure, reaction speed & live stream",
    icon: Activity,
    badge: "🟢 Live",
  },
  {
    href: "/encrypted-mempool",
    label: "Encrypted Mempool (Lucid)",
    desc: "EIP-8184 capacity simulation, committee health & privacy rating",
    icon: Lock,
    badge: "🟣 EIP-8184",
  },
  {
    href: "/sandwiches",
    label: "Sandwich Analytics",
    desc: "DEX volume ratios, bot rankings, token exposure & custom range",
    icon: Layers,
    badge: "⚡ DEX Data",
  },
];

export function AppNavbar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const isMempoolActive =
    pathname.startsWith("/mempool") ||
    pathname.startsWith("/encrypted-mempool") ||
    pathname.startsWith("/sandwiches");

  const handleMouseEnter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setDropdownOpen(true);
  };

  const handleMouseLeave = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      setDropdownOpen(false);
    }, 150);
  };

  const handleToggleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setDropdownOpen((prev) => !prev);
  };

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  // ⌘K / Ctrl+K global shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <header className="sticky top-0 z-50 w-full h-14 bg-[var(--surface-1)]/90 backdrop-blur-md border-b border-[var(--border)] shrink-0 transition-colors">
      <div className="max-w-[1440px] mx-auto h-full px-4 sm:px-6 flex items-center justify-between gap-4">
        
        {/* ── Left: Wordmark & Mobile Drawer Button ── */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden text-[var(--text-secondary)] hover:text-[var(--text-primary)] p-1 transition-colors"
            aria-label="Toggle Navigation Menu"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          <Link href="/" className="flex items-center gap-2.5 group">
            <BlobLensLogo textSize="lg" iconSize={44} />
            
            {/* Live Status Badge */}
            <span className="badge-live hidden sm:inline-flex items-center gap-1.5 uppercase font-mono tracking-wider text-[10px]">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] animate-pulse" />
              LIVE
            </span>
          </Link>
        </div>

        {/* ── Center: Console Nav Links & Dropdown ── */}
        <nav className="hidden md:flex items-center gap-1">
          {/* Overview & Console */}
          {NAV_LINKS.slice(0, 2).map((link) => {
            const isActive = link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "px-3 py-1.5 text-xs font-sans font-medium transition-all rounded-[6px]",
                  isActive
                    ? "nav-item-active font-semibold"
                    : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-sunken)]"
                )}
              >
                {link.label}
              </Link>
            );
          })}

          {/* ── MEMPOOL & MEV DROPDOWN MENU ── */}
          <div
            ref={dropdownRef}
            className="relative py-1"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
          >
            <button
              onClick={handleToggleClick}
              type="button"
              className={cn(
                "px-3 py-1.5 text-xs font-sans font-medium transition-all rounded-[6px] flex items-center gap-1.5 cursor-pointer select-none",
                isMempoolActive
                  ? "nav-item-active font-semibold text-[var(--primary-text)]"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-sunken)]"
              )}
            >
              <span>Mempool &amp; MEV</span>
              <ChevronDown className={cn("w-3.5 h-3.5 transition-transform duration-150", dropdownOpen && "rotate-180")} />
            </button>

            {dropdownOpen && (
              <div
                className="absolute top-full left-0 pt-1.5 w-80 z-50"
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
              >
                <div className="p-2 bg-[var(--surface-1)] border border-[var(--border-strong)] rounded-[8px] shadow-2xl space-y-1 font-mono text-xs animate-in fade-in-50 duration-100">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-[var(--primary-text)] px-2.5 py-1 border-b border-[var(--border)] mb-1">
                    OBSERVATORY PILLARS
                  </div>
                  {MEMPOOL_DROPDOWN.map((item) => {
                    const Icon = item.icon;
                    const isActive = pathname === item.href;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setDropdownOpen(false)}
                        className={cn(
                          "p-2.5 rounded-[6px] flex items-start gap-3 transition-colors group cursor-pointer",
                          isActive
                            ? "bg-[var(--primary-bg)] border border-[var(--primary-border)]"
                            : "hover:bg-[var(--surface-sunken)]"
                        )}
                      >
                        <Icon className={cn("w-4 h-4 mt-0.5 shrink-0", isActive ? "text-[var(--primary-text)]" : "text-[var(--text-muted)] group-hover:text-[var(--text-primary)]")} />
                        <div className="space-y-0.5 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <span className={cn("font-bold text-xs truncate", isActive ? "text-[var(--primary-text)]" : "text-[var(--text-primary)]")}>
                              {item.label}
                            </span>
                            <span className="px-1.5 py-0.5 rounded-[3px] bg-[var(--surface-sunken)] border border-[var(--border)] text-[9px] text-[var(--text-muted)] shrink-0">
                              {item.badge}
                            </span>
                          </div>
                          <p className="text-[10px] font-sans text-[var(--text-secondary)] leading-normal line-clamp-2">
                            {item.desc}
                          </p>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Remaining links (Fee Market, Rollups, DA Insights, Research) */}
          {NAV_LINKS.slice(2).map((link) => {
            const isActive = pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "px-3 py-1.5 text-xs font-sans font-medium transition-all rounded-[6px]",
                  isActive
                    ? "nav-item-active font-semibold"
                    : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-sunken)]"
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* ── Right: Search trigger & Theme Toggle ── */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSearchOpen(true)}
            className="hidden lg:flex items-center gap-2 w-44 xl:w-56 h-8 pl-2.5 pr-2 bg-[var(--surface-1)] border border-[var(--border)] rounded-[6px] text-xs font-mono text-[var(--text-muted)] hover:border-[var(--primary-border)] hover:text-[var(--text-primary)] transition-all shadow-xs"
          >
            <Search className="w-3.5 h-3.5 shrink-0" />
            <span className="flex-1 text-left truncate">Search block / tx...</span>
            <kbd className="px-1 text-[9px] bg-[var(--surface-sunken)] border border-[var(--border)] rounded-[2px] shrink-0">⌘K</kbd>
          </button>

          <ThemeToggle />
        </div>

        <SearchModal open={searchOpen} onClose={() => setSearchOpen(false)} />

      </div>

      {/* ── Mobile Navigation Drawer ── */}
      {mobileOpen && (
        <div className="md:hidden fixed top-14 left-0 w-full bg-[var(--surface-1)] border-b border-[var(--border)] p-4 flex flex-col gap-2 z-50 shadow-md animate-in slide-in-from-top-2 duration-150">
          <button
            onClick={() => { setMobileOpen(false); setSearchOpen(true); }}
            className="flex items-center gap-2 w-full h-9 pl-3 pr-3 mb-2 bg-[var(--surface-sunken)] border border-[var(--border)] rounded-[6px] text-xs font-mono text-[var(--text-muted)]"
          >
            <Search className="w-4 h-4 shrink-0" />
            <span className="flex-1 text-left">Search block / tx / EIP...</span>
            <kbd className="text-[9px] px-1 bg-[var(--surface-1)] border border-[var(--border)] rounded-[2px]">⌘K</kbd>
          </button>

          <div className="text-[10px] font-mono font-bold uppercase tracking-widest text-[var(--primary-text)] px-2 pt-1">
            MEMPOOL OBSERVATORY
          </div>
          {MEMPOOL_DROPDOWN.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                "px-3 py-2 text-xs font-mono rounded-[6px] flex items-center justify-between",
                pathname === item.href
                  ? "bg-[var(--primary-bg)] text-[var(--primary-text)] font-bold"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              )}
            >
              <span>{item.label}</span>
              <span className="text-[9px] px-1.5 py-0.5 rounded-[3px] bg-[var(--surface-sunken)] border border-[var(--border)]">
                {item.badge}
              </span>
            </Link>
          ))}

          <div className="border-t border-dashed border-[var(--border)] my-1" />

          {NAV_LINKS.map((link) => {
            const isActive = link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "px-3 py-2 text-xs font-sans rounded-[6px]",
                  isActive
                    ? "bg-[var(--surface-sunken)] text-[var(--text-primary)] font-semibold"
                    : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </div>
      )}
    </header>
  );
}
