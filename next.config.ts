import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Photos live on Cloudinary, which resizes them itself.
  images: { loader: "custom", loaderFile: "./lib/cloudinary-loader.ts" },
  poweredByHeader: false, // security headers are set in vercel.json
};

export default nextConfig;
