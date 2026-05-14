import type { Metadata } from "next";
import { Averia_Serif_Libre, Geist_Mono, Space_Grotesk } from "next/font/google";
import { FloatingNav } from "@/components/shared/FloatingNav";
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

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://bloblens.com";

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),

  title: {
    default: "BlobLens — EIP-4844 Blob Analytics",
    template: "%s | BlobLens",
  },
  description:
    "Real-time EIP-4844 blob market analytics. Track rollup efficiency, forecast congestion, and monitor DA costs across Base, Arbitrum, OP Mainnet, zkSync, Starknet, and 40+ rollups.",

  keywords: [
    "EIP-4844", "blob transactions", "blob fees", "blob gas",
    "Ethereum", "rollup analytics", "Layer 2", "L2", "data availability",
    "DA cost", "KZG commitments", "excess_blob_gas", "congestion forecast",
    "Base", "Arbitrum", "OP Mainnet", "zkSync Era", "Starknet", "Linea",
    "blob market", "open source", "blockchain analytics",
  ],

  authors: [{ name: "Avarch LLC", url: "https://github.com/AvarchLLC" }],
  creator: "Avarch LLC",
  publisher: "Avarch LLC",

  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },

  icons: {
    icon: [{ url: "/brand/bloblogo.png", type: "image/png" }],
    apple: "/brand/bloblogo.png",
    shortcut: "/brand/bloblogo.png",
  },

  openGraph: {
    type: "website",
    url: APP_URL,
    siteName: "BlobLens",
    title: "BlobLens — EIP-4844 Blob Analytics",
    description:
      "Real-time EIP-4844 blob market analytics. Track rollup efficiency, forecast congestion, and monitor DA costs across 40+ rollups.",
    images: [
      {
        url: "/bloblens.png",
        width: 1200,
        height: 630,
        alt: "BlobLens — EIP-4844 Blob Analytics Dashboard",
        type: "image/png",
      },
    ],
    locale: "en_US",
  },

  twitter: {
    card: "summary_large_image",
    title: "BlobLens — EIP-4844 Blob Analytics",
    description:
      "Real-time EIP-4844 blob market analytics. Track rollup efficiency, forecast congestion, and monitor DA costs across 40+ rollups.",
    images: ["/bloblens.png"],
  },

  alternates: {
    canonical: "/",
  },

  category: "technology",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${spaceGrotesk.variable} ${geistMono.variable} ${averiaSerif.variable} antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-screen bg-background text-foreground">
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

          {/* App shell: banner → sticky nav → scrollable content */}
          <div className="relative z-10 flex flex-col min-h-screen">
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
                  href="https://qf.giveth.io/project/eipsinsight"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#00df81] hover:text-[#00df81]/80 underline underline-offset-2 transition-colors duration-150"
                >
                  Support us on Giveth QF
                </a>
                &nbsp;💜
              </span>
            </Banner>

            {/* Sticky floating nav */}
            <div className="sticky top-0 z-50">
              <FloatingNav />
            </div>

            {/* Page content */}
            <main className="flex-1 min-w-0">
              {children}
              <Footer />
            </main>
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
