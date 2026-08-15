import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  env: {
    NEXT_PUBLIC_TURNSTILE_SITE_KEY: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY,
  },
  allowedDevOrigins: [
    "192.168.1.9",
    "nonpurulent-lachlan-memorably.ngrok-free.dev",
    "*.ngrok-free.app",
    "*.ngrok.io",
  ],
  experimental: {
    serverActions: {
      bodySizeLimit: "600kb",
    },
  },
};

export default nextConfig;