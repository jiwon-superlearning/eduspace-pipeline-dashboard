import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  images: {
    unoptimized: true,
  },
  transpilePackages: [
    '@refinedev/core',
    '@refinedev/antd',
    '@refinedev/nextjs-router',
  ],
};

export default nextConfig;
