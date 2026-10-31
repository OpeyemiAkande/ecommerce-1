import {describe, expect, it} from "vitest";
import {buildSitemap, productJsonLd, serializeJsonLd} from "./seo";
import type {PublicProduct} from "./types";

interface JsonLd {
  "@type": string;
  name: string;
  image: string[];
  offers: {price: string; availability: string; url: string};
  aggregateRating?: unknown;
}

const product: PublicProduct = {
  _id: "p1",
  name: "Sneakers",
  description: "Comfortable",
  price: 49.99,
  category: "Shoes",
  images: ["https://img/a.jpg"],
  averageRating: 4.5,
  totalReviews: 10,
  inStock: true,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-02-01T00:00:00.000Z"
};

describe("productJsonLd", () => {
  it("describes the product, offer and rating", () => {
    const ld = productJsonLd(product, "https://shop.example.com") as unknown as JsonLd;

    expect(ld["@type"]).toBe("Product");
    expect(ld.name).toBe("Sneakers");
    expect(ld.image).toEqual(["https://img/a.jpg"]);
    expect(ld.offers.price).toBe("49.99");
    expect(ld.offers.availability).toBe("https://schema.org/InStock");
    expect(ld.offers.url).toBe("https://shop.example.com/products/p1");
    expect(ld.aggregateRating).toEqual({
      "@type": "AggregateRating",
      ratingValue: 4.5,
      reviewCount: 10
    });
  });

  it("omits aggregateRating without reviews and marks sold out", () => {
    const ld = productJsonLd(
      {...product, totalReviews: 0, inStock: false},
      "https://shop.example.com"
    ) as unknown as JsonLd;

    expect(ld.aggregateRating).toBeUndefined();
    expect(ld.offers.availability).toBe("https://schema.org/OutOfStock");
  });
});

describe("buildSitemap", () => {
  it("lists static pages and every product", () => {
    const entries = buildSitemap([product], "https://shop.example.com");

    expect(entries.map((e) => e.url)).toEqual([
      "https://shop.example.com",
      "https://shop.example.com/products",
      "https://shop.example.com/products/p1"
    ]);
    expect(entries[2].lastModified).toBe("2026-02-01T00:00:00.000Z");
  });
});

describe("serializeJsonLd", () => {
  it("never emits a raw < so product text cannot close the script tag", () => {
    const hostile = {description: "</script><script>alert(1)</script>"};

    const out = serializeJsonLd(hostile);

    expect(out).not.toContain("<");
    expect(out).toContain(String.fromCharCode(92) + "u003c");
    expect(JSON.parse(out)).toEqual(hostile);
  });
});
