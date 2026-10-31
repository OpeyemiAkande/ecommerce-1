import path from "node:path";
import type {NextConfig} from "next";
import {buildSecurityHeaders} from "./src/lib/securityHeaders";

const nextConfig: NextConfig = {
  // The e2e build uses its own directory so it never clobbers a running `next dev`.
  distDir: process.env.NEXT_DIST_DIR ?? ".next",
  // The repo root has its own package-lock.json; pin tracing to this app.
  outputFileTracingRoot: path.join(__dirname),
  // Don't advertise the framework.
  poweredByHeader: false,
  // Enables forbidden() and forbidden.tsx (a real 403 page).
  experimental: {authInterrupts: true},
  images: {
    remotePatterns: [
      {protocol: "https", hostname: "images.unsplash.com"},
      {protocol: "https", hostname: "res.cloudinary.com"}
    ]
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: buildSecurityHeaders({
          clerkPublishableKey: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
          apiUrl: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api",
          sentryDsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
          isProd: process.env.NODE_ENV === "production"
        })
      }
    ];
  }
};

export default nextConfig;
