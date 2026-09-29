import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  typedRoutes: true,
  poweredByHeader: false,
  // PPR by default: static shells from the CDN, only request-bound parts stream.
  cacheComponents: true,
  // Prefetch one reusable App Shell per route instead of one prefetch per link.
  partialPrefetching: true,
  cacheLife: {
    // Content only changes on deploy. The built-in `default` revalidates every
    // 15 minutes, which on Hobby costs invocations for nothing. This redefines
    // it, so `cacheLife('default')` and a bare `use cache` mean these values.
    default: {
      stale: 300, // 5 minutes
      revalidate: 60 * 60 * 24 * 30, // 30 days
      expire: 60 * 60 * 24 * 365, // 1 year
    },
  },
  images: {
    formats: ["image/avif", "image/webp"],
    qualities: [75],
  },
  experimental: {
    // Only pull in the Radix primitives we use from the `radix-ui` barrel.
    optimizePackageImports: ["radix-ui"],
  },
};

export default nextConfig;
