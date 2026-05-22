import type { Metadata } from "next";
import { Averia_Serif_Libre, Geist_Mono, Space_Grotesk, Plus_Jakarta_Sans } from "next/font/google";
import { AppShell } from "@/components/shared/AppShell";
import { ThemeProvider } from "@/components/shared/ThemeProvider";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
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
  // ... rest of metadata unchanged
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
      className={`${spaceGrotesk.variable} ${plusJakartaSans.variable} ${geistMono.variable} ${averiaSerif.variable} antialiased`}
      suppressHydrationWarning
    >
      <body className="h-screen bg-background text-foreground overflow-hidden" suppressHydrationWarning>
        <ThemeProvider>
          <AppShell>
            {children}
          </AppShell>
        </ThemeProvider>
      </body>
    </html>
  );
}

