import {CURRENCY} from "./config";
import type {PublicProduct} from "./types";

export interface SitemapEntry {
  url: string;
  lastModified?: string;
}

export function productJsonLd(product: PublicProduct, siteUrl: string) {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description,
    image: product.images,
    sku: product._id,
    category: product.category,
    offers: {
      "@type": "Offer",
      url: `${siteUrl}/products/${product._id}`,
      priceCurrency: CURRENCY,
      price: product.price.toFixed(2),
      availability: product.inStock
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock"
    },
    ...(product.totalReviews > 0 && {
      aggregateRating: {
        "@type": "AggregateRating",
        ratingValue: product.averageRating,
        reviewCount: product.totalReviews
      }
    })
  };
}

export function buildSitemap(
  products: PublicProduct[],
  siteUrl: string
): SitemapEntry[] {
  return [
    {url: siteUrl},
    {url: `${siteUrl}/products`},
    ...products.map((product) => ({
      url: `${siteUrl}/products/${product._id}`,
      lastModified: product.updatedAt
    }))
  ];
}
