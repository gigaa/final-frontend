import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /**
   * Proxy all /api/* requests to the NestJS backend.
   * NEXT_API_URL is a server-side env variable (no NEXT_PUBLIC_ prefix needed)
   * because rewrites run on the server/edge — not in the browser bundle.
   *
   * Set this in Vercel: Settings → Environment Variables → NEXT_API_URL
   * Example value: https://final-backend-ab6b.onrender.com
   */
  async rewrites() {
    const backendUrl = process.env.NEXT_API_URL ?? "http://localhost:3000";
    return [
      {
        source: "/api/:path*",
        destination: `${backendUrl}/api/:path*`,
      },
    ];
  },

  images: {
    remotePatterns: [
      {
        // AWS S3 bucket for gallery and chat images (presigned URLs)
        protocol: "https",
        hostname: "*.amazonaws.com",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
