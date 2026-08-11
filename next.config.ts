import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/v1/:path*",
        destination: "https://medxverse-backend.onrender.com/api/v1/:path*", // Update port if your Express app runs on a different port
      },
    ];
  },
};

export default nextConfig;