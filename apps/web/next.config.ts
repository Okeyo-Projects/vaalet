import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@valet/env", "@valet/db"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
};

export default nextConfig;
