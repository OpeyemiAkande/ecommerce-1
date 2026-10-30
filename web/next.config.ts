import path from "node:path";
import type {NextConfig} from "next";

const nextConfig: NextConfig = {
  // The e2e build uses its own directory so it never clobbers a running `next dev`.
  distDir: process.env.NEXT_DIST_DIR ?? ".next",
  // The repo root has its own package-lock.json; pin tracing to this app.
  outputFileTracingRoot: path.join(__dirname),
  images: {
    remotePatterns: [
      {protocol: "https", hostname: "images.unsplash.com"},
      {protocol: "https", hostname: "res.cloudinary.com"}
    ]
  }
};

export default nextConfig;
