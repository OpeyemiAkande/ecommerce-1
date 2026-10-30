import type {MetadataRoute} from "next";
import {SITE_URL} from "@/lib/config";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/cart", "/checkout", "/account", "/sign-in", "/sign-up"]
      }
    ],
    sitemap: `${SITE_URL}/sitemap.xml`
  };
}
