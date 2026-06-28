import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

interface Props {
  active: "overview" | "leaderboard" | "market" | "rollup" | "research";
  regimeBadge?: ReactNode;
}

export function AppHeader({ active, regimeBadge }: Props) {
  const navItem = (href: string, label: string, isActive: boolean) => (
    <Link href={href} className={isActive ? "nav-link nav-link-active" : "nav-link"}>
      {label}
    </Link>
  );

  return (
    <header
      className="sticky top-0 z-40 bg-[#0B0F1A]/95 backdrop-blur-md"
      style={{ boxShadow: "0 1px 0 0 rgba(16,185,129,0.12)" }}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex items-end gap-3">
          <Link href="/" className="flex items-center gap-2.5">
            <Image
              src="/brand/bloblens-logo.svg"
              alt="BlobLens"
              width={44}
              height={44}
              className="shrink-0"
              priority
            />
            <span className="wordmark leading-none">BlobLens</span>
          </Link>
          <div className="flex flex-col justify-end pb-0.5 gap-0.5">
            <p className="wordmark-sub">EIP-4844 ANALYTICS</p>
            <p className="wordmark-sub" style={{ letterSpacing: "0.1em" }}>
              an{" "}
              <a
                href="https://www.mywallet360.com/"
                target="_blank"
                rel="noreferrer"
                className="hover:text-[#10B981] transition-colors"
              >
                MyWallet360
              </a>
              {" "}extension ↗
            </p>
          </div>
        </div>

        <div className="flex items-center gap-8">
          <nav className="hidden items-center gap-6 sm:flex">
            {navItem("/", "Overview", active === "overview")}
            {navItem("/leaderboard", "Leaderboard", active === "leaderboard")}
            {navItem("/market", "Market", active === "market")}
            {navItem("/research", "Research", active === "research")}
          </nav>
          {regimeBadge ? <div className="hidden sm:block">{regimeBadge}</div> : null}
        </div>
      </div>
    </header>
  );
}
