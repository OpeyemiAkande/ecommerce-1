import {describe, expect, it} from "vitest";
import {filterProducts, productsUrl} from "./search";
import type {PublicProduct} from "./types";

const product = (name: string, description = ""): PublicProduct => ({
  _id: name,
  name,
  description,
  price: 10,
  category: "Misc",
  images: [],
  averageRating: 0,
  totalReviews: 0,
  inStock: true,
  createdAt: "2026-01-01",
  updatedAt: "2026-01-01"
});

const list = [
  product("Sneakers", "Comfortable everyday shoes"),
  product("Mechanical Keyboard", "RGB backlight"),
  product("Headphones", "Wireless Bluetooth")
];

describe("filterProducts", () => {
  it("returns the whole list for an empty or blank query", () => {
    expect(filterProducts(list, "")).toEqual(list);
    expect(filterProducts(list, "   ")).toEqual(list);
  });

  it("matches names case-insensitively", () => {
    expect(filterProducts(list, "KEY").map((p) => p.name)).toEqual([
      "Mechanical Keyboard"
    ]);
  });

  it("also matches descriptions, like the server search", () => {
    expect(filterProducts(list, "bluetooth").map((p) => p.name)).toEqual([
      "Headphones"
    ]);
  });

  it("trims the query and returns nothing when there is no match", () => {
    expect(filterProducts(list, "  sneak ").map((p) => p.name)).toEqual([
      "Sneakers"
    ]);
    expect(filterProducts(list, "zzz")).toEqual([]);
  });
});

describe("productsUrl", () => {
  it("builds a bare URL with no params", () => {
    expect(productsUrl({})).toBe("/products");
  });

  it("includes q, category and page, skipping blanks and page 1", () => {
    expect(productsUrl({q: "red shoe", category: "Sports", page: "2"})).toBe(
      "/products?q=red+shoe&category=Sports&page=2"
    );
    expect(productsUrl({q: "  ", category: "", page: "1"})).toBe("/products");
  });
});
