import {test} from "node:test";
import assert from "node:assert/strict";
import {
  buildProductFilter,
  parsePagination,
  toPublicProduct
} from "../src/lib/publicProducts.js";

test("buildProductFilter returns an empty filter with no input", () => {
  assert.deepEqual(buildProductFilter(), {});
  assert.deepEqual(buildProductFilter({category: "  ", q: ""}), {});
});

test("buildProductFilter filters by category", () => {
  assert.deepEqual(buildProductFilter({category: "Shoes"}), {category: "Shoes"});
});

test("buildProductFilter searches name and description, escaping regex characters", () => {
  assert.deepEqual(buildProductFilter({q: "a.b"}), {
    $or: [
      {name: {$regex: "a\\.b", $options: "i"}},
      {description: {$regex: "a\\.b", $options: "i"}}
    ]
  });
});

test("buildProductFilter ignores non-string values (operator injection)", () => {
  assert.deepEqual(buildProductFilter({q: {$ne: ""}, category: ["x"]}), {});
});

test("parsePagination applies defaults", () => {
  assert.deepEqual(parsePagination({}), {page: 1, limit: 24, skip: 0});
});

test("parsePagination computes skip and caps the limit", () => {
  assert.deepEqual(parsePagination({page: "3", limit: "10"}), {
    page: 3,
    limit: 10,
    skip: 20
  });
  assert.equal(parsePagination({limit: "1000"}).limit, 100);
});

test("parsePagination falls back on garbage input", () => {
  assert.deepEqual(parsePagination({page: "0", limit: "abc"}), {
    page: 1,
    limit: 24,
    skip: 0
  });
});

test("toPublicProduct exposes storefront fields only", () => {
  const result = toPublicProduct({
    _id: {toString: () => "abc123"},
    name: "Sneakers",
    description: "Nice",
    price: 49.99,
    stock: 5,
    category: "Shoes",
    images: ["a.jpg"],
    averageRating: 4.5,
    totalReviews: 2,
    createdAt: "2026-01-01",
    updatedAt: "2026-01-02",
    __v: 0
  });

  assert.equal(result._id, "abc123");
  assert.equal(result.inStock, true);
  assert.equal("stock" in result, false);
  assert.equal("__v" in result, false);
  assert.equal(result.name, "Sneakers");
});

test("toPublicProduct marks zero stock as out of stock", () => {
  assert.equal(toPublicProduct({_id: "1", stock: 0}).inStock, false);
});
