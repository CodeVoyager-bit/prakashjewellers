import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Photos live on Cloudinary, which resizes them itself.
  images: { loader: "custom", loaderFile: "./lib/cloudinary-loader.ts" },
};

export default nextConfig;
