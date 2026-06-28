import { Activity, BarChart3, FlaskConical, Github, Globe, Layers, LayoutDashboard } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

const NAV_LINKS = [
  { href: "/",            label: "Overview",    icon: LayoutDashboard },
  { href: "/market",      label: "Market",      icon: Activity },
  { href: "/leaderboard", label: "Leaderboard", icon: BarChart3 },
  { href: "/research",    label: "Research",    icon: FlaskConical },
  { href: "/live",        label: "Live Feed",   icon: Layers },
];

const DATA_FACTS = [
  { label: "Network",   value: "Ethereum mainnet" },
  { label: "Standard", value: "EIP-4844 (type-3 txs)" },
  { label: "Target",   value: "14 blobs / block" },
  { label: "Max",      value: "21 blobs / block (BPO2)" },
  { label: "Refresh",  value: "30s – 60s ISR" },
];

export function Footer() {
  return (
    <footer className="relative mt-12 border-t border-border/20 bg-surface/30">
      {/* Subtle purple top-glow line */}
      <div
        className="absolute inset-x-0 top-0 h-px"
        style={{
          background: "linear-gradient(90deg, transparent 0%, rgba(139, 92, 246, 0.2) 40%, rgba(139, 92, 246, 0.2) 60%, transparent 100%)",
        }}
      />

      <div className="px-6 py-8">
        {/* Main grid */}
        <div className="grid grid-cols-2 gap-10 sm:grid-cols-2 lg:grid-cols-4">

          {/* Brand column */}
          <div className="col-span-2 lg:col-span-1 space-y-4">
            <Link href="/" className="inline-flex items-center gap-3 group">
              <Image
                src="/brand/bloblens-logo.svg"
                alt="BlobLens logo"
                width={48}
                height={48}
                className="h-12 w-12 shrink-0 opacity-90 group-hover:opacity-100 transition-opacity"
                priority
              />
              <div>
                <p className="font-mono text-base font-bold tracking-tight text-text-primary leading-none">
                  Blob<span className="text-primary">Lens</span>
                </p>
                <p className="mt-0.5 font-mono text-[9px] uppercase tracking-[0.18em] text-text-tertiary">
                  EIP-4844 Analytics
                </p>
              </div>
            </Link>
            <p className="text-xs text-text-secondary/70 leading-relaxed max-w-[220px]">
              Real-time blob economics dashboard for Ethereum. Track fees, utilization, and rollup activity.
            </p>
            <div className="flex items-center gap-3 pt-1">
              <a
                href="https://github.com/AvarchLLC/blob_lens"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider text-text-secondary/70 hover:text-primary transition-colors"
              >
                <Github className="h-3.5 w-3.5" />
                GitHub
              </a>
              <a
                href="https://www.mywallet360.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider text-text-secondary/70 hover:text-primary transition-colors"
              >
                <Globe className="h-3.5 w-3.5" />
                MyWallet360
              </a>
            </div>
          </div>

          {/* Navigation */}
          <div className="space-y-3">
            <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-text-primary/70 font-mono">
              Navigate
            </p>
            <ul className="space-y-2">
              {NAV_LINKS.map(({ href, label, icon: Icon }) => (
                <li key={href}>
                  <Link
                    href={href}
                    className="flex items-center gap-2 text-xs text-text-secondary/70 hover:text-primary transition-colors font-mono uppercase tracking-wider group"
                  >
                    <Icon className="h-3 w-3 text-text-secondary/40 group-hover:text-primary transition-colors" />
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Protocol facts */}
          <div className="space-y-3">
            <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-text-primary/70 font-mono">
              Protocol
            </p>
            <ul className="space-y-2">
              {DATA_FACTS.map(({ label, value }) => (
                <li key={label} className="flex items-baseline gap-2">
                  <span className="text-[10px] text-text-secondary/40 font-mono uppercase tracking-wider shrink-0 w-14">{label}</span>
                  <span className="font-mono text-[10px] text-text-secondary">{value}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Regime legend */}
          <div className="space-y-3">
            <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-text-primary/70 font-mono">
              Fee Regimes
            </p>
            <ul className="space-y-2.5">
              {[
                { label: "Quiet",     sub: "< 20% utilization",  color: "#6b7280" },
                { label: "Healthy",   sub: "20 – 80%",           color: "#10b981" },
                { label: "Congested", sub: "80 – 95%",           color: "#f59e0b" },
                { label: "Spike",     sub: "> 95%",              color: "#ef4444" },
              ].map(({ label, sub, color }) => (
                <li key={label} className="flex items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 shrink-0 border border-black/10 dark:border-white/10"
                    style={{ backgroundColor: color }}
                  />
                  <span className="text-xs font-mono text-text-secondary">{label}</span>
                  <span className="font-mono text-[10px] opacity-65 text-text-secondary">{sub}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-10 flex flex-col gap-2 border-t border-border/10 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[9px] text-text-tertiary font-mono uppercase tracking-wider">
            © {new Date().getFullYear()} AvarchLLC · Open-source · MIT License
          </p>
          <p className="text-[9px] text-text-tertiary font-mono uppercase tracking-wider">
            Data sourced from Ethereum mainnet via BlobLens indexer
          </p>
        </div>
      </div>
    </footer>
  );
}
