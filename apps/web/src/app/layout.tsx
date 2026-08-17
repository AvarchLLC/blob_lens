import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import {
  GeistPixelSquare,
  GeistPixelGrid,
  GeistPixelCircle,
  GeistPixelTriangle,
  GeistPixelLine,
} from "geist/font/pixel";
import "./globals.css";
import { QueryProvider } from "@/components/providers/query-provider";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { AppNavbar } from "@/components/shared/app-navbar";
import { AppFooter } from "@/components/shared/app-footer";

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FAFAFC" },
    { media: "(prefers-color-scheme: dark)", color: "#07090D" },
  ],
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  metadataBase: new URL("https://bloblens.io"),
  title: {
    default: "BlobLens — Ethereum Blob Analytics & Observability",
    template: "%s | BlobLens",
  },
  description:
    "Real-time telemetry, fee market analytics, and regime indicators for Ethereum's EIP-4844 blob storage layer.",
  keywords: [
    "Ethereum",
    "BlobLens",
    "EIP-4844",
    "Danksharding",
    "Blob Gas",
    "Fee Market",
    "Rollups",
    "Layer 2",
    "Arbitrum",
    "Optimism",
    "Base",
    "ClickHouse",
    "Reth",
  ],
  authors: [{ name: "BlobLens Protocol Labs" }],
  manifest: "/site.webmanifest",
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    shortcut: ["/favicon.ico"],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
    other: [
      {
        rel: "apple-touch-icon",
        url: "/apple-touch-icon.png",
      },
      {
        rel: "android-chrome-192",
        url: "/android-chrome-192x192.png",
      },
      {
        rel: "android-chrome-512",
        url: "/android-chrome-512x512.png",
      },
    ],
  },
  openGraph: {
    title: "BlobLens — Ethereum Blob Analytics & Observability",
    description:
      "Real-time telemetry, fee market analytics, and storage regimes for Ethereum EIP-4844 blobs & L2 rollups.",
    url: "https://bloblens.io",
    siteName: "BlobLens",
    images: [
      {
        url: "/android-chrome-512x512.png",
        width: 512,
        height: 512,
        alt: "BlobLens Icon",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "BlobLens — Ethereum Blob Observatory",
    description:
      "Real-time telemetry, fee market analytics, and storage regimes for Ethereum EIP-4844 blobs & L2 rollups.",
    images: ["/android-chrome-512x512.png"],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${GeistSans.variable} ${GeistMono.variable} ${GeistPixelSquare.variable} ${GeistPixelGrid.variable} ${GeistPixelCircle.variable} ${GeistPixelTriangle.variable} ${GeistPixelLine.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[var(--surface-0)] text-[var(--text-primary)]">
        <ThemeProvider
          attribute="data-theme"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange={false}
        >
          <QueryProvider>
            <AppNavbar />
            <main className="flex-1 w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
              {children}
            </main>
            <AppFooter />
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
