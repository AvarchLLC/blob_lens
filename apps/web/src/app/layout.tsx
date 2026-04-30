import type { Metadata } from "next";
import { Fraunces, Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  weight: ["300", "400", "500"],
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
      className={`${geistSans.variable} ${geistMono.variable} ${fraunces.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-background text-foreground flex flex-col">
        {children}
        <footer className="mt-auto border-t border-[#1a1a1a] py-4 text-center">
          <p className="caption">
            Built on{" "}
            <a
              href="https://eipsinsight.com"
              target="_blank"
              rel="noreferrer"
              className="text-[#5C5575] hover:text-[#9D93B8] transition-colors underline-offset-2 hover:underline"
            >
              EIPsInsight
            </a>
            {" "}· Ethereum governance analytics ·{" "}
            <a
              href="https://eipsinsight.com"
              target="_blank"
              rel="noreferrer"
              className="text-[#5C5575] hover:text-[#9D93B8] transition-colors"
            >
              eipsinsight.com
            </a>
          </p>
        </footer>
      </body>
    </html>
  );
}
