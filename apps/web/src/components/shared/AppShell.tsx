"use client";

import { usePathname } from "next/navigation";
import { AppSidebar } from "./AppSidebar";
import { AppNavbar } from "./AppNavbar";
import { Footer } from "./Footer";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLandingPage = pathname === "/";

  if (isLandingPage) {
    return <div className="h-screen overflow-y-auto" data-landing-scroll>{children}</div>;
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <AppSidebar />

      <div className="flex flex-col flex-1 min-w-0 bg-background overflow-hidden">
        <AppNavbar />

        <main className="flex-1 overflow-y-auto custom-scrollbar cosmic-grid-bg flex flex-col">
          <div className="flex-grow w-full max-w-[1600px] mx-auto p-4 sm:p-6 md:p-10 pb-0 sm:pb-0 md:pb-0">
            {children}
          </div>
          <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 md:px-10 pb-4 sm:pb-6 md:pb-10">
            <Footer />
          </div>
        </main>
      </div>
    </div>
  );
}
