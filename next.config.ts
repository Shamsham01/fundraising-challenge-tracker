import type { NextConfig } from "next";

const supa = process.env.NEXT_PUBLIC_SUPABASE_URL;
const host = supa ? new URL(supa).hostname : "127.0.0.1";

const nextConfig: NextConfig = {
  turbopack: { root: process.cwd() },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: host, pathname: "/storage/v1/object/public/**" },
    ],
  },
};

export default nextConfig;
