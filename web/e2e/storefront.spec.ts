import {expect, test} from "@playwright/test";

const PRODUCT_ID = "64b7f0c2a1b2c3d4e5f60001";

test("home page lists products", async ({page}) => {
  await page.goto("/");
  await expect(page.getByRole("link", {name: /Test Sneakers/})).toBeVisible();
});

test("product page is server-rendered with SEO metadata", async ({page}) => {
  await page.goto(`/products/${PRODUCT_ID}`);

  await expect(page).toHaveTitle(/Test Sneakers/);
  await expect(
    page.getByRole("heading", {name: "Test Sneakers"})
  ).toBeVisible();

  const ld = JSON.parse(
    (await page.locator('script[type="application/ld+json"]').textContent()) ??
      "{}"
  );
  expect(ld["@type"]).toBe("Product");
  expect(ld.offers.price).toBe("49.99");
});

test("unknown product returns a real 404", async ({page}) => {
  const response = await page.goto("/products/64b7f0c2a1b2c3d4e5f6ffff");
  expect(response?.status()).toBe(404);
});

test("sitemap lists products and robots points to it", async ({request}) => {
  const sitemap = await (await request.get("/sitemap.xml")).text();
  expect(sitemap).toContain(`/products/${PRODUCT_ID}`);

  const robots = await (await request.get("/robots.txt")).text();
  expect(robots).toContain("Sitemap:");
  expect(robots).toContain("Disallow: /cart");
  expect(robots).toContain("Disallow: /admin");
});

test("cart requires sign-in", async ({page}) => {
  await page.goto("/cart");
  await expect(page).toHaveURL(/sign-in/);
});

test("admin requires sign-in", async ({page}) => {
  await page.goto("/admin/products");
  await expect(page).toHaveURL(/sign-in/);
});
