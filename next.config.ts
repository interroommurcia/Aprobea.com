import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [{ protocol: 'https', hostname: '*.supabase.co' }],
  },
  serverExternalPackages: ['@anthropic-ai/sdk', 'pdf-parse'],
};

export default nextConfig;
