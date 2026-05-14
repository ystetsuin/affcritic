import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Standalone output: створює .next/standalone/server.js з усіма залежностями,
  // що дозволяє запускати на shared/cloud-startup хостингу без копіювання node_modules.
  output: "standalone",
};

export default nextConfig;
