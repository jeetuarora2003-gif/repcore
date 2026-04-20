/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  experimental: {
    ppr: false,
  },
  images: {
    formats: ["image/webp"],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "czpsobwtfnzqtjxnnfis.supabase.co",
      },
    ],
  },
  // Triple-Lock Fix:
  // 1. Mark 'crypto' as an external so Webpack stops trying to resolve it for the client.
  webpack: (config) => {
    config.externals.push("node:crypto", "crypto");
    return config;
  },
};

export default nextConfig;
