import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  typedRoutes: true,
  poweredByHeader: false,
  // cacheComponents stays off for now; decide in Phase 2.
};

export default nextConfig;
