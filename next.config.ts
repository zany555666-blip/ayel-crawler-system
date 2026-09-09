import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@prisma/client", "bcryptjs", "nodemailer"],
  allowedDevOrigins: ["*.trycloudflare.com"],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**" },
    ],
  },
  async redirects() {
    return [
      { source: "/knowledge-base", destination: "/vector-db", permanent: false },
    ];
  },
};

export default nextConfig;
