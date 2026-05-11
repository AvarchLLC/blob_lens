import type { Metadata } from "next";
import { Averia_Serif_Libre, Geist_Mono, Space_Grotesk } from "next/font/google";
import { AppSidebar } from "@/components/shared/AppSidebar";
import { Footer } from "@/components/shared/Footer";
import { ThemeProvider } from "@/components/shared/ThemeProvider";
import { Spotlight } from "@/components/ui/spotlight-new";
import { Banner } from "@/components/ui/banner";
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
      <body className="h-full bg-background text-foreground overflow-hidden">
        <ThemeProvider>
          {/* Aceternity Spotlight — Bayland emerald beams, site-wide */}
          <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
            <Spotlight
              gradientFirst="radial-gradient(68.54% 68.72% at 55.02% 31.46%, hsla(153, 100%, 44%, 0.10) 0, hsla(153, 100%, 44%, 0.03) 50%, transparent 80%)"
              gradientSecond="radial-gradient(50% 50% at 50% 50%, hsla(153, 100%, 44%, 0.07) 0, hsla(153, 100%, 44%, 0.02) 80%, transparent 100%)"
              gradientThird="radial-gradient(50% 50% at 50% 50%, hsla(153, 100%, 44%, 0.04) 0, transparent 80%)"
              translateY={-280}
              width={520}
              height={1200}
              smallWidth={200}
              duration={9}
              xOffset={80}
            />
          </div>

          {/* App shell: banner on top, sidebar + content below */}
          <div className="relative z-10 flex flex-col h-full">
            {/* Banner */}
            <Banner
              id="giveth-qf-2026"
              variant="rainbow"
              height="2.5rem"
              rainbowColors={[
                "rgba(0,223,129,0.18)",
                "rgba(0,223,129,0.06)",
                "transparent",
                "rgba(0,223,129,0.10)",
                "transparent",
                "rgba(0,223,129,0.15)",
                "transparent",
              ]}
              className="shrink-0 border-b border-[#00df81]/15 bg-[#09090b]"
              xColor="#71717a"
            >
              <span className="text-[0.8rem] text-[#a1a1aa] tracking-wide">
                Public goods infrastructure for Ethereum governance.&nbsp;
                <a
                  href="https://giveth.io/project/eipsinsight"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#00df81] hover:text-[#00df81]/80 underline underline-offset-2 transition-colors duration-150"
                >
                  Support us on Giveth QF
                </a>
                &nbsp;💜
              </span>
            </Banner>

            {/* Sidebar + scrollable content */}
            <div className="flex flex-1 overflow-hidden">
              <AppSidebar />
              <main className="flex-1 overflow-y-auto min-w-0">
                {children}
                <Footer />
              </main>
            </div>
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
