import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      // The MEV analytics section was renamed to "Mempool". Preserve old links.
      { source: "/mev", destination: "/mempool", permanent: true },
    ];
  },
};

export default nextConfig;
