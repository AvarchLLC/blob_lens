import type { Metadata } from "next";
import { Averia_Serif_Libre, Geist_Mono, Space_Grotesk } from "next/font/google";
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
    >
      <body className="min-h-full bg-background text-foreground flex flex-col">
        {children}
        <footer className="mt-auto border-t border-[#1E2D45] py-8">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col items-center gap-2 text-center sm:flex-row sm:justify-between sm:text-left">
              <div>
                <p className="text-[0.8125rem] font-medium text-[#9CA3AF]">
                  BlobLens · An EIPsInsight extension · Ethereum blob economics analytics
                </p>
                <p className="mt-1 caption">Built in public · MIT Licensed · No paywalls</p>
              </div>
              <div className="flex items-center gap-4 caption">
                <a href="https://eipsinsight.com" target="_blank" rel="noreferrer" className="hover:text-[#10B981] transition-colors">
                  eipsinsight.com
                </a>
                <span className="text-[#1E2D45]">·</span>
                <a href="https://github.com/AvarchLLC/EIPsInsight" target="_blank" rel="noreferrer" className="hover:text-[#10B981] transition-colors">
                  GitHub
                </a>
                <span className="text-[#1E2D45]">·</span>
                <a href="https://giveth.io" target="_blank" rel="noreferrer" className="hover:text-[#10B981] transition-colors">
                  Giveth
                </a>
              </div>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
