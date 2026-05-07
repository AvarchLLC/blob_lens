"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  FlaskConical,
  LayoutDashboard,
  TrendingUp,
} from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";

const NAV = [
  { href: "/",            label: "Overview",    icon: LayoutDashboard },
  { href: "/leaderboard", label: "Leaderboard", icon: BarChart3       },
  { href: "/market",      label: "Market",      icon: TrendingUp      },
  { href: "/research",    label: "Research",    icon: FlaskConical    },
] as const;

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="sidebar">
      {/* ── Logo ── */}
      <div className="sidebar-logo-wrap">
        <Link href="/" className="flex flex-col items-center gap-2 group">
          <div className="sidebar-logo-ring">
            <Image
              src="/brand/bloblogo.png"
              alt="BlobLens"
              width={46}
              height={46}
              priority
              className="drop-shadow-[0_0_12px_rgba(16,185,129,0.35)] group-hover:drop-shadow-[0_0_18px_rgba(16,185,129,0.55)] transition-all duration-300"
            />
          </div>
          <span className="wordmark mt-0.5">BlobLens</span>
          <span className="wordmark-sub">EIP-4844 Analytics</span>
        </Link>
      </div>

      {/* ── Divider ── */}
      <div className="sidebar-sep" />

      {/* ── Nav ── */}
      <nav className="sidebar-nav">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active =
            href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`sidebar-item${active ? " sidebar-item-active" : ""}`}
            >
              <Icon className="h-[1.05rem] w-[1.05rem] shrink-0" />
              <span>{label}</span>
              {active && <span className="sidebar-item-dot" />}
            </Link>
          );
        })}
      </nav>

      {/* ── Spacer ── */}
      <div className="flex-1" />

      {/* ── Theme toggle ── */}
      <div className="pb-2">
        <ThemeToggle />
      </div>

      {/* ── Live badge ── */}
      <div className="sidebar-live">
        <span className="pulse-dot" />
        <span className="text-[0.6875rem] font-medium text-[#10B981] tracking-wide">
          LIVE
        </span>
        <span className="caption ml-auto">mainnet</span>
      </div>

      {/* ── Footer links ── */}
      <div className="sidebar-footer">
        <a
          href="https://eipsinsight.com"
          target="_blank"
          rel="noreferrer"
          className="sidebar-footer-link"
        >
          EIPsInsight ↗
        </a>
        <span className="text-border">·</span>
        <a
          href="https://github.com/AvarchLLC/EIPsInsight"
          target="_blank"
          rel="noreferrer"
          className="sidebar-footer-link"
        >
          GitHub
        </a>
        <span className="text-border">·</span>
        <a
          href="https://giveth.io"
          target="_blank"
          rel="noreferrer"
          className="sidebar-footer-link"
        >
          Giveth
        </a>
      </div>
    </aside>
  );
}
