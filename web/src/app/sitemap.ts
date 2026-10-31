import type {MetadataRoute} from "next";
import {fetchAllProducts} from "@/lib/api/server";
import {SITE_URL} from "@/lib/config";
import {buildSitemap} from "@/lib/seo";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  return buildSitemap(await fetchAllProducts(), SITE_URL);
}
