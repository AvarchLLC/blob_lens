"use client";

import { usePathname } from "next/navigation";
import { AppSidebar } from "./AppSidebar";
import { AppNavbar } from "./AppNavbar";
import { Footer } from "./Footer";
import { Banner } from "@/components/ui/banner";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLandingPage = pathname === "/";

  if (isLandingPage) {
    return <div className="h-screen overflow-y-auto" data-landing-scroll>{children}</div>;
  }

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar Rebuild */}
      <AppSidebar />

      <div className="flex flex-col flex-1 min-w-0 bg-background overflow-hidden">
        {/* Institutional Banner */}
        <Banner
          id="giveth-qf-2026"
          variant="rainbow"
          height="2.5rem"
          rainbowColors={[
            "rgba(0,167,181,0.18)", // Primary Teal
            "rgba(0,167,181,0.06)",
            "transparent",
            "rgba(90,215,226,0.10)", // Accent Teal
            "transparent",
            "rgba(0,138,150,0.15)", // Hover Teal
            "transparent",
          ]}
          className="shrink-0 border-b border-primary/15 bg-sidebar"
          xColor="var(--text-secondary)"
        >
          <span className="text-[0.8rem] text-text-secondary tracking-wide">
            Protocol Intelligence for Ethereum. Support our development.&nbsp;
            <a
              href="https://qf.giveth.io/project/eipsinsight"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:text-primary-hover underline underline-offset-2 transition-colors duration-150"
            >
              Support on Giveth QF
            </a>
            &nbsp;💜
          </span>
        </Banner>

        {/* Navbar Rebuild */}
        <AppNavbar />

        {/* Page content */}
        <main className="flex-1 overflow-y-auto custom-scrollbar">
          <div className="max-w-[1600px] mx-auto p-6 md:p-10">
            {children}
            <Footer />
          </div>
        </main>
      </div>
    </div>
  );
}
