import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Produces a self-contained server in .next/standalone, used by the Docker image.
  output: "standalone",
  serverExternalPackages: ["better-sqlite3"],
  poweredByHeader: false,
  experimental: {
    serverActions: {
      // Label photos are uploaded through server actions.
      bodySizeLimit: "10mb",
    },
  },
};

export default nextConfig;
