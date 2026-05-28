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
