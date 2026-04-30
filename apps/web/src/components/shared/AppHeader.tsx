import Link from "next/link";
import type { ReactNode } from "react";

interface Props {
  active: "overview" | "leaderboard" | "market" | "rollup";
  regimeBadge?: ReactNode;
}

export function AppHeader({ active, regimeBadge }: Props) {
  const navItem = (href: string, label: string, isActive: boolean) => (
    <Link href={href} className={isActive ? "nav-link nav-link-active" : "nav-link"}>
      {label}
    </Link>
  );

  return (
    <header className="border-b border-border bg-card/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-5 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-end gap-3">
          <h1 className="wordmark">BlobLens</h1>
          <p className="wordmark-sub">EIP-4844 ANALYTICS</p>
        </Link>

        <div className="flex items-center gap-8">
          <nav className="hidden items-center gap-2 sm:flex">
            {navItem("/", "Overview", active === "overview")}
            {navItem("/leaderboard", "Leaderboard", active === "leaderboard")}
            {navItem("/market", "Market", active === "market")}
          </nav>
          {regimeBadge ? <div className="hidden sm:block">{regimeBadge}</div> : null}
        </div>
      </div>
    </header>
  );
}
