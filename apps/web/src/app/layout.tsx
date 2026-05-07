import type { Metadata } from "next";
import { Averia_Serif_Libre, Geist_Mono, Space_Grotesk } from "next/font/google";
import { Sidebar } from "@/components/shared/Sidebar";
import { ThemeProvider } from "@/components/shared/ThemeProvider";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const averiaSerif = Averia_Serif_Libre({
  variable: "--font-averia",
  subsets: ["latin"],
  weight: ["300", "400", "700"],
});

export const metadata: Metadata = {
  title: "BlobLens — EIP-4844 Analytics",
  description:
    "Real-time Ethereum blob transaction analytics. Track EIP-4844 blobs by rollup, fee trends, and activity across Base, Arbitrum, OP Mainnet, and more.",
  openGraph: {
    title: "BlobLens — EIP-4844 Analytics",
    description: "Real-time Ethereum blob transaction analytics",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${spaceGrotesk.variable} ${geistMono.variable} ${averiaSerif.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="h-full bg-background text-foreground flex overflow-hidden">
      <ThemeProvider>
        {/* Sidebar — desktop only; hidden below lg */}
        <div className="hidden lg:flex">
          <Sidebar />
        </div>

        {/* Main scroll area */}
        <div className="flex-1 flex flex-col min-w-0 overflow-y-auto overflow-x-hidden">
          {/* Mobile top bar (shows logo + nav when sidebar is hidden) */}
          <div className="lg:hidden sticky top-0 z-40 flex items-center justify-between px-4 py-3 bg-[#090D17]/95 backdrop-blur-md border-b border-[#1A2840]">
            <span className="wordmark text-base">BlobLens</span>
            <nav className="flex items-center gap-4 text-sm font-medium text-[#6B7280]">
              <a href="/"            className="hover:text-white transition-colors">Overview</a>
              <a href="/leaderboard" className="hover:text-white transition-colors">Leaderboard</a>
              <a href="/market"      className="hover:text-white transition-colors">Market</a>
            </nav>
          </div>

          <main className="flex-1 pb-12">
            {children}
          </main>
        </div>
      </ThemeProvider>
      </body>
    </html>
  );
}
