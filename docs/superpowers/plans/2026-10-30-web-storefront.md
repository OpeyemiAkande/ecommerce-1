# Web Storefront Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship an SEO-focused customer web storefront (`web/`) on Next.js with Clerk auth and Paystack checkout, backed by the existing Express API.

**Architecture:** `web/` is a new Next.js App Router app next to `backend/`, `admin/` and `mobile/`. Public pages (home, product list, product detail) are server-rendered with ISR from new unauthenticated `/api/public/*` backend endpoints. Private pages (cart, checkout, account) are client components that call the existing authenticated API with the Clerk session token through TanStack Query. Paystack uses the redirect flow; the backend gets a `platform: "web"` option so the callback lands on the web app.

**Tech Stack:** Next.js 15 (App Router), React 19, TypeScript, Tailwind, `@clerk/nextjs`, TanStack Query, `sonner`, Vitest + React Testing Library, Playwright. Backend: Express 5, Mongoose, Node's built-in `node:test`.

Spec: [docs/superpowers/specs/2026-10-30-web-storefront-design.md](../specs/2026-10-30-web-storefront-design.md)

## Global Constraints

- `web/` is its own app; no database access, all data comes from the Express API.
- Public pages use ISR with `revalidate` of about 60 seconds (`next: {revalidate: 60}` on fetches).
- Private pages are client-side and send `Authorization: Bearer <Clerk session token>`; `protectRoute` is not changed.
- Paystack only, redirect flow (not the inline popup). Stripe is out of scope.
- The web `callback_url` is built server-side from `WEB_URL`; a URL is never accepted from the client.
- `admin/` and `mobile/` are not modified. The existing mobile payment callback behavior stays as is.
- v1 scope: home, product list and search, product detail, cart, Paystack checkout, order history, addresses, SEO layer. Wishlist, writing reviews, Stripe and i18n are out.
- Next.js is pinned to major version 15 so the code below (async `params` and `searchParams`, `middleware.ts`) is accurate. A Next 16 upgrade is a separate task.
- Code style follows the repo: double quotes, semicolons, no bracket spacing (`{a}`), no trailing commas.
- Prices are displayed in `NEXT_PUBLIC_CURRENCY` (default `NGN`). The server is authoritative for totals.

## Known deviations from the spec

- **Wishlist:** the spec's route table lists `/wishlist`, but its v1 scope puts wishlist under "Later". This plan follows the scope section and omits it.
- **Reviews:** there is no endpoint that lists individual reviews, so v1 shows the rating summary (`averageRating`, `totalReviews`) only. Listing reviews needs a new public endpoint and is deferred.
- **E2E:** the Playwright smoke test covers browse, product page SEO, sitemap/robots and the sign-in redirect for `/cart`. It does not drive a signed-in session (that needs Clerk testing tokens), so the authenticated cart and checkout flow is verified manually in Tasks 11 and 13.
- **Order history** hides unpaid `pending` orders, since the backend creates them before the Paystack redirect.

## File Structure

**Backend (modify/create under `backend/`)**

| File | Responsibility |
|---|---|
| `src/lib/origins.js` (create) | Parse a comma-separated origin list for CORS |
| `src/lib/publicProducts.js` (create) | Pure helpers: query filter, pagination, public serializer |
| `src/lib/paymentCallback.js` (create) | Pure helper: choose the Paystack `callback_url` |
| `src/controllers/public.controller.js` (create) | Public product list, detail, categories |
| `src/routes/public.route.js` (create) | `/api/public/*` router |
| `src/server.js` (modify) | Use origin list, mount public router |
| `src/config/env.js` (modify) | Add `WEB_URL` |
| `src/controllers/payment.controller.js` (modify) | Accept `platform`, use `resolveCallbackUrl` |
| `test/*.test.js` (create) | `node:test` unit tests for the pure helpers |

**Web (create under `web/`, all paths relative to `web/`)**

| File | Responsibility |
|---|---|
| `src/lib/config.ts` | Env-derived constants |
| `src/lib/types.ts` | API types |
| `src/lib/format.ts` | `formatPrice`, `formatDate` |
| `src/lib/pricing.ts` | Totals mirroring backend `calculateTotal`, cart helpers |
| `src/lib/address.ts` | Address helpers |
| `src/lib/seo.ts` | Product JSON-LD and sitemap builders |
| `src/lib/api/server.ts` | Server-side cached fetchers for public endpoints |
| `src/lib/api/client.ts` | Browser fetch wrapper with auth token and error normalizing |
| `src/lib/api/useApi.ts` | Hook binding the wrapper to Clerk |
| `src/hooks/useCart.ts`, `useAddresses.ts`, `useOrders.ts`, `useStartPayment.ts`, `usePaymentVerification.ts` | Client data hooks |
| `src/components/*` | Header, Providers, ProductCard, SearchForm, AddToCartButton, OrderSummary, AddressForm |
| `src/app/**` | Routes, `middleware.ts`, `sitemap.ts`, `robots.ts` |
| `e2e/*` | Playwright smoke test and fake API |

---

## Part A: Backend

### Task 1: CORS origin list

**Files:**
- Create: `backend/src/lib/origins.js`
- Create: `backend/test/origins.test.js`
- Modify: `backend/package.json` (add `test` script)
- Modify: `backend/src/server.js:35`

**Interfaces:**
- Produces: `parseAllowedOrigins(value: string | undefined): string[]`

- [ ] **Step 1: Add the test script**

In `backend/package.json`, add to `scripts` (after `"start"`):

```json
    "test": "node --test",
```

- [ ] **Step 2: Write the failing test**

Create `backend/test/origins.test.js`:

```js
import {test} from "node:test";
import assert from "node:assert/strict";
import {parseAllowedOrigins} from "../src/lib/origins.js";

test("returns an empty list when unset", () => {
  assert.deepEqual(parseAllowedOrigins(undefined), []);
  assert.deepEqual(parseAllowedOrigins(""), []);
});

test("parses a single origin", () => {
  assert.deepEqual(parseAllowedOrigins("http://localhost:5173"), [
    "http://localhost:5173"
  ]);
});

test("parses a comma-separated list, trimming spaces and trailing slashes", () => {
  assert.deepEqual(
    parseAllowedOrigins("http://localhost:5173/, https://shop.example.com ,"),
    ["http://localhost:5173", "https://shop.example.com"]
  );
});
```

- [ ] **Step 3: Run it to verify it fails**

Run: `cd backend && npm test`
Expected: FAIL (`Cannot find module '../src/lib/origins.js'`).

- [ ] **Step 4: Implement**

Create `backend/src/lib/origins.js`:

```js
// CLIENT_URL may hold several origins, e.g. the admin app and the web storefront.
export function parseAllowedOrigins(value) {
  if (!value) return [];

  return value
    .split(",")
    .map((origin) => origin.trim().replace(/\/+$/, ""))
    .filter(Boolean);
}
```

- [ ] **Step 5: Wire it into the server**

In `backend/src/server.js`, add the import after the `connectDB` import:

```js
import {parseAllowedOrigins} from "./lib/origins.js";
```

Replace the cors line:

```js
app.use(cors({origin: parseAllowedOrigins(ENV.CLIENT_URL), credentials: true}));
```

- [ ] **Step 6: Run the tests**

Run: `cd backend && npm test`
Expected: PASS (3 tests).

- [ ] **Step 7: Commit**

```bash
git add backend/package.json backend/src/lib/origins.js backend/src/server.js backend/test/origins.test.js
git commit -m "Allow multiple CORS origins via comma-separated CLIENT_URL"
```

---

### Task 2: Public product helpers

**Files:**
- Create: `backend/src/lib/publicProducts.js`
- Create: `backend/test/publicProducts.test.js`

**Interfaces:**
- Produces:
  - `buildProductFilter({category, q}): object` (Mongo filter; ignores non-string values)
  - `parsePagination({page, limit}, {defaultLimit = 24, maxLimit = 100}?): {page: number, limit: number, skip: number}`
  - `toPublicProduct(product): {_id, name, description, price, category, images, averageRating, totalReviews, inStock, createdAt, updatedAt}` (never includes `stock`)

- [ ] **Step 1: Write the failing tests**

Create `backend/test/publicProducts.test.js`:

```js
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
```

- [ ] **Step 2: Run to verify failure**

Run: `cd backend && npm test`
Expected: FAIL (`Cannot find module '../src/lib/publicProducts.js'`).

- [ ] **Step 3: Implement**

Create `backend/src/lib/publicProducts.js`:

```js
const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const cleanString = (value) =>
  typeof value === "string" && value.trim() ? value.trim() : null;

export function buildProductFilter({category, q} = {}) {
  const filter = {};

  const cleanCategory = cleanString(category);
  if (cleanCategory) filter.category = cleanCategory;

  const search = cleanString(q);
  if (search) {
    const regex = {$regex: escapeRegex(search), $options: "i"};
    filter.$or = [{name: regex}, {description: regex}];
  }

  return filter;
}

export function parsePagination(
  {page, limit} = {},
  {defaultLimit = 24, maxLimit = 100} = {}
) {
  const parsedPage = Number.parseInt(page, 10);
  const parsedLimit = Number.parseInt(limit, 10);

  const safePage = parsedPage >= 1 ? parsedPage : 1;
  const safeLimit =
    parsedLimit >= 1 ? Math.min(parsedLimit, maxLimit) : defaultLimit;

  return {page: safePage, limit: safeLimit, skip: (safePage - 1) * safeLimit};
}

// Only what the storefront needs; raw stock counts stay private.
export function toPublicProduct(product) {
  return {
    _id: String(product._id),
    name: product.name,
    description: product.description,
    price: product.price,
    category: product.category,
    images: product.images,
    averageRating: product.averageRating,
    totalReviews: product.totalReviews,
    inStock: product.stock > 0,
    createdAt: product.createdAt,
    updatedAt: product.updatedAt
  };
}
```

- [ ] **Step 4: Run tests**

Run: `cd backend && npm test`
Expected: PASS (all tests, including Task 1).

- [ ] **Step 5: Commit**

```bash
git add backend/src/lib/publicProducts.js backend/test/publicProducts.test.js
git commit -m "Add public product query, pagination and serializer helpers"
```

---

### Task 3: Public product endpoints

**Files:**
- Create: `backend/src/controllers/public.controller.js`
- Create: `backend/src/routes/public.route.js`
- Modify: `backend/src/server.js`

**Interfaces:**
- Consumes: `buildProductFilter`, `parsePagination`, `toPublicProduct` from Task 2.
- Produces (HTTP, no auth):
  - `GET /api/public/products?category=&q=&page=&limit=` returns `{products: PublicProduct[], total, page, pages}`
  - `GET /api/public/products/:id` returns `PublicProduct` or 404 `{message}`
  - `GET /api/public/categories` returns `{categories: string[]}`

- [ ] **Step 1: Write the controller**

Create `backend/src/controllers/public.controller.js`:

```js
import mongoose from "mongoose";
import {Product} from "../models/product.model.js";
import {
  buildProductFilter,
  parsePagination,
  toPublicProduct
} from "../lib/publicProducts.js";

export async function listPublicProducts(req, res) {
  try {
    const filter = buildProductFilter(req.query);
    const {page, limit, skip} = parsePagination(req.query);

    const [products, total] = await Promise.all([
      Product.find(filter)
        .sort({createdAt: -1})
        .skip(skip)
        .limit(limit)
        .lean(),
      Product.countDocuments(filter)
    ]);

    res.status(200).json({
      products: products.map(toPublicProduct),
      total,
      page,
      pages: Math.ceil(total / limit)
    });
  } catch (error) {
    console.error("Error listing public products:", error);
    res.status(500).json({message: "Internal server error"});
  }
}

export async function getPublicProduct(req, res) {
  try {
    const {id} = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(404).json({message: "Product not found"});
    }

    const product = await Product.findById(id).lean();

    if (!product) return res.status(404).json({message: "Product not found"});

    res.status(200).json(toPublicProduct(product));
  } catch (error) {
    console.error("Error fetching public product:", error);
    res.status(500).json({message: "Internal server error"});
  }
}

export async function listPublicCategories(_, res) {
  try {
    const categories = await Product.distinct("category");

    res.status(200).json({categories: categories.sort()});
  } catch (error) {
    console.error("Error listing categories:", error);
    res.status(500).json({message: "Internal server error"});
  }
}
```

- [ ] **Step 2: Write the router**

Create `backend/src/routes/public.route.js`:

```js
import {Router} from "express";
import {
  getPublicProduct,
  listPublicCategories,
  listPublicProducts
} from "../controllers/public.controller.js";

const router = Router();

// Unauthenticated, read-only storefront data.
router.get("/products", listPublicProducts);
router.get("/products/:id", getPublicProduct);
router.get("/categories", listPublicCategories);

export default router;
```

- [ ] **Step 3: Mount it**

In `backend/src/server.js`, add after the `productsRoutes` import:

```js
import publicRoutes from "./routes/public.route.js";
```

and after `app.use("/api/payments", paymentRoutes);`:

```js
app.use("/api/public", publicRoutes);
```

- [ ] **Step 4: Verify against a running server**

Needs `backend/.env` with `DB_URL` and Clerk keys, and seeded products (`npm run seed:products`).

Run: `cd backend && npm run dev` (in one terminal), then in another:

```bash
curl -s "http://localhost:8000/api/public/products?limit=2"
curl -s "http://localhost:8000/api/public/categories"
curl -s -o /dev/null -w "%{http_code}\n" "http://localhost:8000/api/public/products/not-an-id"
```

Expected: the first returns `{"products":[...2 items...],"total":N,"page":1,"pages":M}` with no `stock` key in any product and `inStock` present; the second returns `{"categories":[...]}`; the third prints `404`. Use `PORT` from your `.env` if it is not 8000.

- [ ] **Step 5: Commit**

```bash
git add backend/src/controllers/public.controller.js backend/src/routes/public.route.js backend/src/server.js
git commit -m "Add unauthenticated public product and category endpoints"
```

---

### Task 4: Web-aware Paystack callback

**Files:**
- Create: `backend/src/lib/paymentCallback.js`
- Create: `backend/test/paymentCallback.test.js`
- Modify: `backend/src/config/env.js`
- Modify: `backend/src/controllers/payment.controller.js` (import, destructure, callback)

**Interfaces:**
- Produces: `resolveCallbackUrl({platform, reference, webUrl, ngrokUrl}): string`. For `platform === "web"` it returns `<webUrl>/checkout/success` with no query string (Paystack appends `?trxref=...&reference=...` itself); any other platform keeps the existing ngrok URL. Throws if `platform === "web"` and `webUrl` is missing.
- Produces (HTTP): `POST /api/payments/initialize-payment` now accepts optional `platform: "web"` in the body. The response shape is unchanged: `{authorization_url, reference}`.

- [ ] **Step 1: Write the failing test**

Create `backend/test/paymentCallback.test.js`:

```js
import {test} from "node:test";
import assert from "node:assert/strict";
import {resolveCallbackUrl} from "../src/lib/paymentCallback.js";

const ngrokUrl = "https://abc.ngrok.app";

test("web platform returns the web success page, trimming trailing slashes", () => {
  assert.equal(
    resolveCallbackUrl({
      platform: "web",
      reference: "order_1",
      webUrl: "https://shop.example.com/",
      ngrokUrl
    }),
    "https://shop.example.com/checkout/success"
  );
});

test("web platform without WEB_URL throws", () => {
  assert.throws(
    () => resolveCallbackUrl({platform: "web", reference: "order_1", ngrokUrl}),
    /WEB_URL/
  );
});

test("no platform keeps the existing mobile callback", () => {
  assert.equal(
    resolveCallbackUrl({reference: "order_1", webUrl: "https://x.com", ngrokUrl}),
    "https://abc.ngrok.app/api/payments/payment-success?reference=order_1"
  );
});

test("unknown platforms fall back to the mobile callback", () => {
  assert.equal(
    resolveCallbackUrl({
      platform: "https://evil.example",
      reference: "order_1",
      webUrl: "https://x.com",
      ngrokUrl
    }),
    "https://abc.ngrok.app/api/payments/payment-success?reference=order_1"
  );
});
```

- [ ] **Step 2: Run to verify failure**

Run: `cd backend && npm test`
Expected: FAIL (`Cannot find module '../src/lib/paymentCallback.js'`).

- [ ] **Step 3: Implement**

Create `backend/src/lib/paymentCallback.js`:

```js
// The callback is always built here from server config. The client only picks
// a platform, never a URL, so there is no open-redirect surface.
export function resolveCallbackUrl({platform, reference, webUrl, ngrokUrl}) {
  if (platform === "web") {
    if (!webUrl) throw new Error("WEB_URL is not configured");

    // Paystack appends ?trxref=...&reference=... to the callback URL itself.
    return `${webUrl.replace(/\/+$/, "")}/checkout/success`;
  }

  return `${ngrokUrl}/api/payments/payment-success?reference=${reference}`;
}
```

- [ ] **Step 4: Run tests**

Run: `cd backend && npm test`
Expected: PASS.

- [ ] **Step 5: Add the env var**

In `backend/src/config/env.js`, add after `NGROK_URL`:

```js
  WEB_URL: process.env.WEB_URL,
```

- [ ] **Step 6: Use it in `initializePayment`**

In `backend/src/controllers/payment.controller.js`:

Add after the `crypto` import:

```js
import {resolveCallbackUrl} from "../lib/paymentCallback.js";
```

Replace:

```js
    const {cartItems, shippingAddress} = req.body;
```

with:

```js
    const {cartItems, shippingAddress, platform} = req.body;
```

Add directly after the line `const reference = \`order_${Date.now()}_${user._id}\`;` (before the pending order is created, so a config error never leaves an orphaned order):

```js
    const callbackUrl = resolveCallbackUrl({
      platform,
      reference,
      webUrl: ENV.WEB_URL,
      ngrokUrl: ENV.NGROK_URL
    });
```

Replace the `callback_url` line inside the axios payload:

```js
          callback_url: `${ENV.NGROK_URL}/api/payments/payment-success?reference=${reference}`
```

with:

```js
          callback_url: callbackUrl
```

- [ ] **Step 7: Run tests and a syntax check**

Run: `cd backend && npm test && node --check src/controllers/payment.controller.js`
Expected: PASS, no syntax errors.

- [ ] **Step 8: Document the env vars**

Add to `backend/.env` (not committed): `WEB_URL=http://localhost:3000` and `CLIENT_URL=http://localhost:5173,http://localhost:3000` (admin and web origins). Keep the existing `CLIENT_URL` admin value in the list.

- [ ] **Step 9: Commit**

```bash
git add backend/src/lib/paymentCallback.js backend/test/paymentCallback.test.js backend/src/config/env.js backend/src/controllers/payment.controller.js
git commit -m "Support a web callback URL in Paystack payment initialization"
```

---

## Part B: Web app

### Task 5: Scaffold `web/` with tooling

**Files:**
- Create: `web/` (via create-next-app), then `web/vitest.config.ts`, `web/vitest.setup.ts`, `web/.env.example`, `web/src/lib/config.ts`
- Modify: `web/next.config.ts`, `web/package.json`

**Interfaces:**
- Produces (from `src/lib/config.ts`): `API_URL: string`, `SITE_URL: string` (no trailing slash), `CURRENCY: string`, `STORE_NAME: string`

- [ ] **Step 1: Scaffold**

Run from the repo root:

```bash
npx create-next-app@15 web --ts --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm --no-turbopack
```

Then confirm it did not create a nested git repo: `ls web/.git`. If that directory exists, delete it (`rm -rf web/.git`); the root repo is the only one.

- [ ] **Step 2: Install dependencies**

```bash
cd web
npm install @clerk/nextjs @tanstack/react-query sonner
npm install -D vitest jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event @playwright/test
npx playwright install chromium
```

If npm reports a peer-dependency conflict for `@clerk/nextjs`, check `npm view @clerk/nextjs peerDependencies` and install the newest release whose `next` range includes 15.

- [ ] **Step 3: Add scripts**

In `web/package.json` `scripts`, add:

```json
    "test": "vitest run",
    "test:e2e": "playwright test",
    "typecheck": "tsc --noEmit",
```

- [ ] **Step 4: Vitest config**

Create `web/vitest.config.ts`:

```ts
import {defineConfig} from "vitest/config";
import path from "node:path";

export default defineConfig({
  esbuild: {jsx: "automatic"},
  resolve: {alias: {"@": path.resolve(__dirname, "src")}},
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"]
  }
});
```

Create `web/vitest.setup.ts`:

```ts
import "@testing-library/jest-dom/vitest";
```

- [ ] **Step 5: Config constants**

Create `web/src/lib/config.ts`:

```ts
export const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api";

export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"
).replace(/\/+$/, "");

export const CURRENCY = process.env.NEXT_PUBLIC_CURRENCY ?? "NGN";

export const STORE_NAME = process.env.NEXT_PUBLIC_STORE_NAME ?? "Store";
```

- [ ] **Step 6: Env example and Next config**

Create `web/.env.example`:

```bash
NEXT_PUBLIC_API_URL=http://localhost:8000/api
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_CURRENCY=NGN
NEXT_PUBLIC_STORE_NAME=Store

# Must be the same Clerk application the backend and mobile app use.
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/
NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL=/
```

Copy it to `web/.env.local` and fill in the Clerk keys from the same Clerk app as `backend/.env` (`CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`). Confirm `.env.local` is ignored: `git check-ignore web/.env.local` should print the path.

Replace `web/next.config.ts`:

```ts
import type {NextConfig} from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {protocol: "https", hostname: "images.unsplash.com"},
      {protocol: "https", hostname: "res.cloudinary.com"}
    ]
  }
};

export default nextConfig;
```

- [ ] **Step 7: Verify tooling**

Run: `cd web && npm run typecheck && npm run lint && npx vitest run --passWithNoTests`
Expected: all succeed (no tests yet).

- [ ] **Step 8: Commit**

```bash
git add web
git commit -m "Scaffold Next.js web storefront with Vitest and Playwright tooling"
```

---

### Task 6: Types and pure helpers

**Files:**
- Create: `web/src/lib/types.ts`, `format.ts`, `pricing.ts`, `address.ts`
- Test: `web/src/lib/format.test.ts`, `pricing.test.ts`, `address.test.ts`

**Interfaces:**
- Produces:
  - Types: `PublicProduct`, `Product`, `ProductPage`, `CartItem`, `Cart`, `Address`, `ShippingAddress`, `OrderItem`, `Order`
  - `formatPrice(amount: number): string`, `formatDate(iso: string): string`
  - `SHIPPING_FEE = 10`, `TAX_RATE = 0.08`, `computeTotals(subtotal): {subtotal, shipping, tax, total}`, `cartSubtotal(items: CartItem[]): number`, `cartItemCount(items: CartItem[]): number`
  - `toShippingAddress(address: Address): ShippingAddress`, `pickDefaultAddress(addresses: Address[]): Address | null`

- [ ] **Step 1: Types**

Create `web/src/lib/types.ts`:

```ts
export interface PublicProduct {
  _id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  images: string[];
  averageRating: number;
  totalReviews: number;
  inStock: boolean;
  createdAt: string;
  updatedAt: string;
}

// Authenticated endpoints (cart, orders) return the full product with stock.
export interface Product extends Omit<PublicProduct, "inStock"> {
  stock: number;
}

export interface ProductPage {
  products: PublicProduct[];
  total: number;
  page: number;
  pages: number;
}

export interface CartItem {
  _id: string;
  product: Product;
  quantity: number;
}

export interface Cart {
  _id: string;
  items: CartItem[];
}

export interface Address {
  _id: string;
  label: string;
  fullName: string;
  streetAddress: string;
  city: string;
  state: string;
  zipCode: string;
  phoneNumber: string;
  isDefault: boolean;
}

export type ShippingAddress = Omit<Address, "_id" | "label" | "isDefault">;

export interface OrderItem {
  _id: string;
  name: string;
  price: number;
  quantity: number;
  image: string;
}

export interface Order {
  _id: string;
  orderItems: OrderItem[];
  shippingAddress: ShippingAddress;
  paymentResult: {id: string; status: string};
  totalPrice: number;
  status: "pending" | "shipped" | "delivered";
  createdAt: string;
}
```

- [ ] **Step 2: Write the failing tests**

Create `web/src/lib/format.test.ts`:

```ts
import {describe, expect, it} from "vitest";
import {formatDate, formatPrice} from "./format";

describe("formatPrice", () => {
  it("formats with thousands separators and two decimals", () => {
    expect(formatPrice(1234.5)).toContain("1,234.50");
  });
});

describe("formatDate", () => {
  it("formats an ISO date", () => {
    expect(formatDate("2026-03-05T10:00:00.000Z")).toContain("2026");
  });
});
```

Create `web/src/lib/pricing.test.ts`:

```ts
import {describe, expect, it} from "vitest";
import {cartItemCount, cartSubtotal, computeTotals} from "./pricing";
import type {CartItem} from "./types";

const item = (price: number, quantity: number): CartItem =>
  ({_id: "i", quantity, product: {price}}) as unknown as CartItem;

describe("computeTotals", () => {
  it("adds shipping and 8% tax, mirroring the backend", () => {
    expect(computeTotals(100)).toEqual({
      subtotal: 100,
      shipping: 10,
      tax: 8,
      total: 118
    });
  });

  it("charges nothing for an empty cart", () => {
    expect(computeTotals(0)).toEqual({
      subtotal: 0,
      shipping: 0,
      tax: 0,
      total: 0
    });
  });
});

describe("cart helpers", () => {
  const items = [item(10, 2), item(5, 3)];

  it("sums price times quantity", () => {
    expect(cartSubtotal(items)).toBe(35);
  });

  it("counts units", () => {
    expect(cartItemCount(items)).toBe(5);
  });
});
```

Create `web/src/lib/address.test.ts`:

```ts
import {describe, expect, it} from "vitest";
import {pickDefaultAddress, toShippingAddress} from "./address";
import type {Address} from "./types";

const address = (overrides: Partial<Address> = {}): Address => ({
  _id: "a1",
  label: "Home",
  fullName: "Ada Obi",
  streetAddress: "1 Main St",
  city: "Lagos",
  state: "Lagos",
  zipCode: "100001",
  phoneNumber: "0800000000",
  isDefault: false,
  ...overrides
});

describe("toShippingAddress", () => {
  it("keeps only the fields the order needs", () => {
    expect(toShippingAddress(address())).toEqual({
      fullName: "Ada Obi",
      streetAddress: "1 Main St",
      city: "Lagos",
      state: "Lagos",
      zipCode: "100001",
      phoneNumber: "0800000000"
    });
  });
});

describe("pickDefaultAddress", () => {
  it("prefers the default address", () => {
    const list = [address({_id: "a1"}), address({_id: "a2", isDefault: true})];
    expect(pickDefaultAddress(list)?._id).toBe("a2");
  });

  it("falls back to the first address", () => {
    expect(pickDefaultAddress([address({_id: "a1"})])?._id).toBe("a1");
  });

  it("returns null for an empty list", () => {
    expect(pickDefaultAddress([])).toBeNull();
  });
});
```

- [ ] **Step 3: Run to verify failure**

Run: `cd web && npm test`
Expected: FAIL (modules not found).

- [ ] **Step 4: Implement**

Create `web/src/lib/format.ts`:

```ts
import {CURRENCY} from "./config";

const priceFormatter = new Intl.NumberFormat("en-NG", {
  style: "currency",
  currency: CURRENCY
});

export const formatPrice = (amount: number) => priceFormatter.format(amount);

export const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric"
  });
```

Create `web/src/lib/pricing.ts`:

```ts
import type {CartItem} from "./types";

// Mirrors backend/src/lib/pricing.js. The server is authoritative; this is
// for display only, so keep both in sync.
export const SHIPPING_FEE = 10;
export const TAX_RATE = 0.08;

export function computeTotals(subtotal: number) {
  const shipping = subtotal > 0 ? SHIPPING_FEE : 0;
  const tax = subtotal * TAX_RATE;

  return {subtotal, shipping, tax, total: subtotal + shipping + tax};
}

export const cartSubtotal = (items: CartItem[]) =>
  items.reduce((sum, item) => sum + item.product.price * item.quantity, 0);

export const cartItemCount = (items: CartItem[]) =>
  items.reduce((sum, item) => sum + item.quantity, 0);
```

Create `web/src/lib/address.ts`:

```ts
import type {Address, ShippingAddress} from "./types";

export function toShippingAddress(address: Address): ShippingAddress {
  return {
    fullName: address.fullName,
    streetAddress: address.streetAddress,
    city: address.city,
    state: address.state,
    zipCode: address.zipCode,
    phoneNumber: address.phoneNumber
  };
}

export function pickDefaultAddress(addresses: Address[]): Address | null {
  return addresses.find((a) => a.isDefault) ?? addresses[0] ?? null;
}
```

- [ ] **Step 5: Run tests and typecheck**

Run: `cd web && npm test && npm run typecheck`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add web/src/lib
git commit -m "Add web types, price formatting, totals and address helpers"
```

---

### Task 7: API clients

**Files:**
- Create: `web/src/lib/api/server.ts`, `client.ts`, `useApi.ts`
- Test: `web/src/lib/api/server.test.ts`, `client.test.ts`

**Interfaces:**
- Produces (`server.ts`, server-only):
  - `fetchProducts(params?: {category?: string; q?: string; page?: number; limit?: number}): Promise<ProductPage>`
  - `fetchProduct(id: string): Promise<PublicProduct | null>` (null on 404)
  - `fetchCategories(): Promise<string[]>`
  - `fetchAllProducts(): Promise<PublicProduct[]>` (walks every page, 100 at a time)
- Produces (`client.ts`):
  - `class ApiError extends Error {status: number}`
  - `createApiClient({baseUrl, getToken, onUnauthorized?, fetchImpl?}): {get<T>(path), post<T>(path, body?), put<T>(path, body?), delete<T>(path)}`
- Produces (`useApi.ts`): `useApi(): ReturnType<typeof createApiClient>` (memoized, bound to Clerk; a 401 sends the user to `/sign-in?redirect_url=<current path>`)

- [ ] **Step 1: Write the failing tests**

Create `web/src/lib/api/server.test.ts`:

```ts
import {afterEach, describe, expect, it, vi} from "vitest";
import {
  fetchAllProducts,
  fetchCategories,
  fetchProduct,
  fetchProducts
} from "./server";

const json = (body: unknown, status = 200) =>
  Promise.resolve(new Response(JSON.stringify(body), {status}));

afterEach(() => vi.unstubAllGlobals());

describe("fetchProducts", () => {
  it("builds the query string and skips empty params", async () => {
    const fetchMock = vi.fn(() => json({products: [], total: 0, page: 1, pages: 0}));
    vi.stubGlobal("fetch", fetchMock);

    await fetchProducts({q: "shoe", category: "", page: 2});

    const url = (fetchMock.mock.calls[0] as unknown as [string])[0];
    expect(url).toContain("/public/products?");
    expect(url).toContain("q=shoe");
    expect(url).toContain("page=2");
    expect(url).not.toContain("category=");
  });

  it("throws on a server error", async () => {
    vi.stubGlobal("fetch", vi.fn(() => json({}, 500)));
    await expect(fetchProducts()).rejects.toThrow(/500/);
  });
});

describe("fetchProduct", () => {
  it("returns null for a 404", async () => {
    vi.stubGlobal("fetch", vi.fn(() => json({message: "nope"}, 404)));
    expect(await fetchProduct("abc")).toBeNull();
  });

  it("returns the product", async () => {
    vi.stubGlobal("fetch", vi.fn(() => json({_id: "abc", name: "Shoe"})));
    expect((await fetchProduct("abc"))?.name).toBe("Shoe");
  });
});

describe("fetchCategories", () => {
  it("unwraps the categories array", async () => {
    vi.stubGlobal("fetch", vi.fn(() => json({categories: ["A", "B"]})));
    expect(await fetchCategories()).toEqual(["A", "B"]);
  });
});

describe("fetchAllProducts", () => {
  it("walks every page", async () => {
    const fetchMock = vi
      .fn()
      .mockImplementationOnce(() =>
        json({products: [{_id: "1"}], total: 2, page: 1, pages: 2})
      )
      .mockImplementationOnce(() =>
        json({products: [{_id: "2"}], total: 2, page: 2, pages: 2})
      );
    vi.stubGlobal("fetch", fetchMock);

    const all = await fetchAllProducts();

    expect(all.map((p) => p._id)).toEqual(["1", "2"]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
```

Create `web/src/lib/api/client.test.ts`:

```ts
import {describe, expect, it, vi} from "vitest";
import {ApiError, createApiClient} from "./client";

const respond = (body: unknown, status = 200) =>
  vi.fn(() => Promise.resolve(new Response(JSON.stringify(body), {status})));

describe("createApiClient", () => {
  it("attaches the bearer token and parses JSON", async () => {
    const fetchImpl = respond({cart: {items: []}});
    const api = createApiClient({
      baseUrl: "http://api/x",
      getToken: async () => "tok",
      fetchImpl
    });

    const data = await api.get<{cart: {items: unknown[]}}>("/cart");

    expect(data.cart.items).toEqual([]);
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [
      string,
      RequestInit
    ];
    expect(url).toBe("http://api/x/cart");
    expect((init.headers as Record<string, string>).Authorization).toBe(
      "Bearer tok"
    );
  });

  it("serializes JSON bodies", async () => {
    const fetchImpl = respond({});
    const api = createApiClient({
      baseUrl: "http://api",
      getToken: async () => null,
      fetchImpl
    });

    await api.post("/cart", {productId: "p1", quantity: 2});

    const [, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(init.method).toBe("POST");
    expect(init.body).toBe(JSON.stringify({productId: "p1", quantity: 2}));
    expect((init.headers as Record<string, string>).Authorization).toBeUndefined();
  });

  it("normalizes errors from {error} and {message} bodies", async () => {
    const api = createApiClient({
      baseUrl: "http://api",
      getToken: async () => "t",
      fetchImpl: respond({error: "Insufficient stock"}, 400)
    });

    await expect(api.post("/cart", {})).rejects.toMatchObject({
      name: "ApiError",
      status: 400,
      message: "Insufficient stock"
    });

    const api2 = createApiClient({
      baseUrl: "http://api",
      getToken: async () => "t",
      fetchImpl: respond({message: "User not found"}, 404)
    });
    await expect(api2.get("/cart")).rejects.toBeInstanceOf(ApiError);
  });

  it("calls onUnauthorized on a 401", async () => {
    const onUnauthorized = vi.fn();
    const api = createApiClient({
      baseUrl: "http://api",
      getToken: async () => "t",
      onUnauthorized,
      fetchImpl: respond({message: "Unauthorized"}, 401)
    });

    await expect(api.get("/cart")).rejects.toMatchObject({status: 401});
    expect(onUnauthorized).toHaveBeenCalledOnce();
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `cd web && npm test`
Expected: FAIL (modules not found).

- [ ] **Step 3: Implement the server fetchers**

Create `web/src/lib/api/server.ts`:

```ts
import {API_URL} from "@/lib/config";
import type {ProductPage, PublicProduct} from "@/lib/types";

// Cached for 60s so public pages are served from ISR; failures are thrown so
// the route shows error.tsx instead of caching a broken page.
async function getJson<T>(path: string): Promise<T | null> {
  const res = await fetch(`${API_URL}${path}`, {next: {revalidate: 60}});

  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`API request failed: ${res.status} ${path}`);

  return (await res.json()) as T;
}

interface ProductQuery {
  category?: string;
  q?: string;
  page?: number;
  limit?: number;
}

export async function fetchProducts(
  params: ProductQuery = {}
): Promise<ProductPage> {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") search.set(key, String(value));
  }
  const query = search.toString();

  const data = await getJson<ProductPage>(
    `/public/products${query ? `?${query}` : ""}`
  );
  if (!data) throw new Error("Products endpoint returned 404");

  return data;
}

export const fetchProduct = (id: string) =>
  getJson<PublicProduct>(`/public/products/${encodeURIComponent(id)}`);

export async function fetchCategories(): Promise<string[]> {
  const data = await getJson<{categories: string[]}>("/public/categories");

  return data?.categories ?? [];
}

export async function fetchAllProducts(): Promise<PublicProduct[]> {
  const all: PublicProduct[] = [];
  let page = 1;
  let pages = 1;

  do {
    const data = await fetchProducts({page, limit: 100});
    all.push(...data.products);
    pages = data.pages;
    page += 1;
  } while (page <= pages);

  return all;
}
```

- [ ] **Step 4: Implement the browser client**

Create `web/src/lib/api/client.ts`:

```ts
export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

interface ApiClientOptions {
  baseUrl: string;
  getToken: () => Promise<string | null>;
  onUnauthorized?: () => void;
  fetchImpl?: typeof fetch;
}

function parseJson(text: string): Record<string, unknown> | null {
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return null;
  }
}

export function createApiClient({
  baseUrl,
  getToken,
  onUnauthorized,
  fetchImpl = (...args) => fetch(...args)
}: ApiClientOptions) {
  async function request<T>(
    path: string,
    method: string,
    body?: unknown
  ): Promise<T> {
    const token = await getToken();
    const headers: Record<string, string> = {};
    if (body !== undefined) headers["Content-Type"] = "application/json";
    if (token) headers.Authorization = `Bearer ${token}`;

    const res = await fetchImpl(`${baseUrl}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined
    });

    const data = parseJson(await res.text());

    if (!res.ok) {
      if (res.status === 401) onUnauthorized?.();

      const message =
        (data?.error as string | undefined) ??
        (data?.message as string | undefined) ??
        (res.statusText || "Request failed");
      throw new ApiError(res.status, message);
    }

    return data as T;
  }

  return {
    get: <T>(path: string) => request<T>(path, "GET"),
    post: <T>(path: string, body?: unknown) => request<T>(path, "POST", body ?? {}),
    put: <T>(path: string, body?: unknown) => request<T>(path, "PUT", body ?? {}),
    delete: <T>(path: string) => request<T>(path, "DELETE")
  };
}
```

- [ ] **Step 5: Implement the hook**

Create `web/src/lib/api/useApi.ts`:

```ts
"use client";

import {useMemo} from "react";
import {useAuth} from "@clerk/nextjs";
import {API_URL} from "@/lib/config";
import {createApiClient} from "./client";

export function useApi() {
  const {getToken} = useAuth();

  return useMemo(
    () =>
      createApiClient({
        baseUrl: API_URL,
        getToken: () => getToken(),
        onUnauthorized: () => {
          const here = window.location.pathname + window.location.search;
          window.location.assign(
            `/sign-in?redirect_url=${encodeURIComponent(here)}`
          );
        }
      }),
    [getToken]
  );
}
```

- [ ] **Step 6: Run tests and typecheck**

Run: `cd web && npm test && npm run typecheck`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add web/src/lib/api
git commit -m "Add server fetchers and authenticated browser API client"
```

---

### Task 8: Auth, providers, layout and header

**Files:**
- Create: `web/src/middleware.ts`, `web/src/components/Providers.tsx`, `web/src/components/Header.tsx`, `web/src/hooks/useCart.ts`, `web/src/app/sign-in/[[...sign-in]]/page.tsx`, `web/src/app/sign-up/[[...sign-up]]/page.tsx`, `web/src/app/error.tsx`, `web/src/app/not-found.tsx`
- Modify: `web/src/app/layout.tsx`

**Interfaces:**
- Consumes: `useApi`, `ApiError` (Task 7); `cartSubtotal`, `cartItemCount` (Task 6); types `Cart`.
- Produces (`useCart()` in `src/hooks/useCart.ts`):
  - `{cart: Cart | undefined, isLoading: boolean, subtotal: number, itemCount: number, addToCart(vars: {productId: string; quantity?: number}, options?), updateQuantity(vars: {productId: string; quantity: number}), removeFromCart(productId: string), isAdding: boolean, isUpdating: boolean, isRemoving: boolean}`. `cart` is only fetched when signed in.
- Produces: `middleware.ts` protects `/cart`, `/checkout` and `/account` routes.

- [ ] **Step 1: Cart hook (needed by the header)**

Create `web/src/hooks/useCart.ts`:

```ts
"use client";

import {useAuth} from "@clerk/nextjs";
import {useMutation, useQuery, useQueryClient} from "@tanstack/react-query";
import {toast} from "sonner";
import {ApiError} from "@/lib/api/client";
import {useApi} from "@/lib/api/useApi";
import {cartItemCount, cartSubtotal} from "@/lib/pricing";
import type {Cart} from "@/lib/types";

export const CART_KEY = ["cart"];

export function useCart() {
  const api = useApi();
  const {isSignedIn} = useAuth();
  const queryClient = useQueryClient();

  const invalidate = () => queryClient.invalidateQueries({queryKey: CART_KEY});
  const onError = (error: unknown) =>
    toast.error(
      error instanceof ApiError ? error.message : "Something went wrong"
    );

  const query = useQuery({
    queryKey: CART_KEY,
    enabled: Boolean(isSignedIn),
    queryFn: async () => (await api.get<{cart: Cart}>("/cart")).cart
  });

  const add = useMutation({
    mutationFn: ({
      productId,
      quantity = 1
    }: {
      productId: string;
      quantity?: number;
    }) => api.post("/cart", {productId, quantity}),
    onSuccess: invalidate,
    onError
  });

  const update = useMutation({
    mutationFn: ({productId, quantity}: {productId: string; quantity: number}) =>
      api.put(`/cart/${productId}`, {quantity}),
    onSuccess: invalidate,
    onError
  });

  const remove = useMutation({
    mutationFn: (productId: string) => api.delete(`/cart/${productId}`),
    onSuccess: invalidate,
    onError
  });

  const items = query.data?.items ?? [];

  return {
    cart: query.data,
    isLoading: query.isLoading,
    subtotal: cartSubtotal(items),
    itemCount: cartItemCount(items),
    addToCart: add.mutate,
    updateQuantity: update.mutate,
    removeFromCart: remove.mutate,
    isAdding: add.isPending,
    isUpdating: update.isPending,
    isRemoving: remove.isPending
  };
}
```

- [ ] **Step 2: Middleware**

Create `web/src/middleware.ts`:

```ts
import {clerkMiddleware, createRouteMatcher} from "@clerk/nextjs/server";

const isProtected = createRouteMatcher([
  "/cart(.*)",
  "/checkout(.*)",
  "/account(.*)"
]);

export default clerkMiddleware(async (auth, req) => {
  if (isProtected(req)) await auth.protect();
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)"
  ]
};
```

- [ ] **Step 3: Providers**

Create `web/src/components/Providers.tsx`:

```tsx
"use client";

import {useState} from "react";
import {QueryClient, QueryClientProvider} from "@tanstack/react-query";
import {Toaster} from "sonner";

export function Providers({children}: {children: React.ReactNode}) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {queries: {staleTime: 30_000, retry: 1}}
      })
  );

  return (
    <QueryClientProvider client={client}>
      {children}
      <Toaster richColors position="top-right" />
    </QueryClientProvider>
  );
}
```

- [ ] **Step 4: Header**

Create `web/src/components/Header.tsx`:

```tsx
"use client";

import Link from "next/link";
import {SignedIn, SignedOut, SignInButton, UserButton} from "@clerk/nextjs";
import {useCart} from "@/hooks/useCart";
import {STORE_NAME} from "@/lib/config";

export function Header() {
  const {itemCount} = useCart();

  return (
    <header className="border-b border-neutral-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
        <Link href="/" className="text-xl font-semibold">
          {STORE_NAME}
        </Link>

        <nav className="flex items-center gap-5 text-sm">
          <Link href="/products" className="hover:underline">
            Shop
          </Link>

          <SignedIn>
            <Link href="/account/orders" className="hover:underline">
              Orders
            </Link>
            <Link href="/account/addresses" className="hover:underline">
              Addresses
            </Link>
          </SignedIn>

          <Link href="/cart" className="relative hover:underline">
            Cart
            {itemCount > 0 && (
              <span className="ml-1 rounded-full bg-neutral-900 px-2 py-0.5 text-xs text-white">
                {itemCount}
              </span>
            )}
          </Link>

          <SignedOut>
            <SignInButton mode="redirect">
              <button className="rounded bg-neutral-900 px-3 py-1.5 text-white">
                Sign in
              </button>
            </SignInButton>
          </SignedOut>
          <SignedIn>
            <UserButton />
          </SignedIn>
        </nav>
      </div>
    </header>
  );
}
```

- [ ] **Step 5: Root layout**

Replace `web/src/app/layout.tsx`:

```tsx
import type {Metadata} from "next";
import {ClerkProvider} from "@clerk/nextjs";
import {Header} from "@/components/Header";
import {Providers} from "@/components/Providers";
import {SITE_URL, STORE_NAME} from "@/lib/config";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {default: STORE_NAME, template: `%s | ${STORE_NAME}`},
  description: `Shop the latest products at ${STORE_NAME}.`
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body className="min-h-screen bg-neutral-50 text-neutral-900 antialiased">
          <Providers>
            <Header />
            <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
          </Providers>
        </body>
      </html>
    </ClerkProvider>
  );
}
```

- [ ] **Step 6: Sign-in/up pages**

Create `web/src/app/sign-in/[[...sign-in]]/page.tsx`:

```tsx
import {SignIn} from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <div className="flex justify-center py-8">
      <SignIn />
    </div>
  );
}
```

Create `web/src/app/sign-up/[[...sign-up]]/page.tsx`:

```tsx
import {SignUp} from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <div className="flex justify-center py-8">
      <SignUp />
    </div>
  );
}
```

- [ ] **Step 7: Error and not-found pages**

Create `web/src/app/error.tsx`:

```tsx
"use client";

export default function ErrorPage({reset}: {error: Error; reset: () => void}) {
  return (
    <div className="py-16 text-center">
      <h1 className="text-2xl font-semibold">Something went wrong</h1>
      <p className="mt-2 text-neutral-600">
        We couldn&apos;t load this page. Please try again.
      </p>
      <button
        onClick={reset}
        className="mt-6 rounded bg-neutral-900 px-4 py-2 text-white"
      >
        Try again
      </button>
    </div>
  );
}
```

Create `web/src/app/not-found.tsx`:

```tsx
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="py-16 text-center">
      <h1 className="text-2xl font-semibold">Page not found</h1>
      <p className="mt-2 text-neutral-600">
        That page doesn&apos;t exist or is no longer available.
      </p>
      <Link
        href="/products"
        className="mt-6 inline-block rounded bg-neutral-900 px-4 py-2 text-white"
      >
        Browse products
      </Link>
    </div>
  );
}
```

- [ ] **Step 8: Verify**

Run: `cd web && npm run typecheck && npm run lint && npm run dev`
Open http://localhost:3000. Expected: header renders, "Sign in" opens the Clerk sign-in page at `/sign-in`, and visiting `/cart` while signed out redirects to sign-in. Sign in with an existing account; the header should show the user button.

- [ ] **Step 9: Commit**

```bash
git add web/src
git commit -m "Add Clerk auth, providers, header, layout and error pages"
```

---

### Task 9: Catalog pages (home and product list)

**Files:**
- Create: `web/src/components/ProductCard.tsx`, `web/src/components/SearchForm.tsx`, `web/src/app/products/page.tsx`
- Modify: `web/src/app/page.tsx` (replace scaffold content)

**Interfaces:**
- Consumes: `fetchProducts`, `fetchCategories` (Task 7), `formatPrice` (Task 6), `PublicProduct`.
- Produces: `<ProductCard product={PublicProduct} />`, `<SearchForm defaultValue? category? />`. Routes `/` and `/products?q=&category=&page=`.

- [ ] **Step 1: Product card**

Create `web/src/components/ProductCard.tsx`:

```tsx
import Image from "next/image";
import Link from "next/link";
import {formatPrice} from "@/lib/format";
import type {PublicProduct} from "@/lib/types";

export function ProductCard({product}: {product: PublicProduct}) {
  return (
    <Link
      href={`/products/${product._id}`}
      className="group block overflow-hidden rounded-lg border border-neutral-200 bg-white"
    >
      <div className="relative aspect-square bg-neutral-100">
        {product.images[0] && (
          <Image
            src={product.images[0]}
            alt={product.name}
            fill
            sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
            className="object-cover transition group-hover:scale-105"
          />
        )}
        {!product.inStock && (
          <span className="absolute left-2 top-2 rounded bg-neutral-900 px-2 py-0.5 text-xs text-white">
            Sold out
          </span>
        )}
      </div>
      <div className="p-3">
        <p className="text-xs text-neutral-500">{product.category}</p>
        <h3 className="mt-0.5 line-clamp-1 font-medium">{product.name}</h3>
        <p className="mt-1">{formatPrice(product.price)}</p>
      </div>
    </Link>
  );
}
```

- [ ] **Step 2: Search form**

Create `web/src/components/SearchForm.tsx`:

```tsx
export function SearchForm({
  defaultValue,
  category
}: {
  defaultValue?: string;
  category?: string;
}) {
  return (
    <form action="/products" method="get" className="flex gap-2">
      <input
        type="search"
        name="q"
        defaultValue={defaultValue}
        placeholder="Search products"
        className="w-full rounded border border-neutral-300 px-3 py-2"
      />
      {category && <input type="hidden" name="category" value={category} />}
      <button className="rounded bg-neutral-900 px-4 py-2 text-white">
        Search
      </button>
    </form>
  );
}
```

- [ ] **Step 3: Home page**

Replace `web/src/app/page.tsx`:

```tsx
import Link from "next/link";
import {ProductCard} from "@/components/ProductCard";
import {fetchCategories, fetchProducts} from "@/lib/api/server";
import {STORE_NAME} from "@/lib/config";

export const revalidate = 60;

export default async function HomePage() {
  const [latest, categories] = await Promise.all([
    fetchProducts({limit: 8}),
    fetchCategories()
  ]);

  return (
    <div className="space-y-10">
      <section className="rounded-lg bg-neutral-900 px-6 py-12 text-white">
        <h1 className="text-3xl font-semibold">Welcome to {STORE_NAME}</h1>
        <p className="mt-2 text-neutral-300">
          Discover our latest products.
        </p>
        <Link
          href="/products"
          className="mt-6 inline-block rounded bg-white px-4 py-2 text-neutral-900"
        >
          Shop all
        </Link>
      </section>

      {categories.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-semibold">Shop by category</h2>
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <Link
                key={category}
                href={`/products?category=${encodeURIComponent(category)}`}
                className="rounded-full border border-neutral-300 bg-white px-4 py-1.5 text-sm hover:bg-neutral-100"
              >
                {category}
              </Link>
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="mb-3 text-lg font-semibold">New arrivals</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {latest.products.map((product) => (
            <ProductCard key={product._id} product={product} />
          ))}
        </div>
      </section>
    </div>
  );
}
```

- [ ] **Step 4: Product list page**

Create `web/src/app/products/page.tsx`:

```tsx
import type {Metadata} from "next";
import Link from "next/link";
import {ProductCard} from "@/components/ProductCard";
import {SearchForm} from "@/components/SearchForm";
import {fetchCategories, fetchProducts} from "@/lib/api/server";

export const metadata: Metadata = {
  title: "Shop all products",
  alternates: {canonical: "/products"}
};

type SearchParams = {q?: string; category?: string; page?: string};

function href({q, category, page}: SearchParams) {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (category) params.set("category", category);
  if (page && page !== "1") params.set("page", page);
  const query = params.toString();

  return `/products${query ? `?${query}` : ""}`;
}

export default async function ProductsPage({
  searchParams
}: {
  searchParams: Promise<SearchParams>;
}) {
  const {q, category, page: pageParam} = await searchParams;
  const page = Math.max(1, Number.parseInt(pageParam ?? "1", 10) || 1);

  const [data, categories] = await Promise.all([
    fetchProducts({q, category, page, limit: 12}),
    fetchCategories()
  ]);

  return (
    <div className="space-y-6">
      <SearchForm defaultValue={q} category={category} />

      <div className="flex flex-wrap gap-2 text-sm">
        <Link
          href={href({q})}
          className={`rounded-full border px-3 py-1 ${!category ? "bg-neutral-900 text-white" : "bg-white"}`}
        >
          All
        </Link>
        {categories.map((name) => (
          <Link
            key={name}
            href={href({q, category: name})}
            className={`rounded-full border px-3 py-1 ${category === name ? "bg-neutral-900 text-white" : "bg-white"}`}
          >
            {name}
          </Link>
        ))}
      </div>

      {data.products.length === 0 ? (
        <p className="py-12 text-center text-neutral-600">
          No products found.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {data.products.map((product) => (
            <ProductCard key={product._id} product={product} />
          ))}
        </div>
      )}

      {data.pages > 1 && (
        <nav className="flex items-center justify-center gap-4 text-sm">
          {page > 1 && (
            <Link href={href({q, category, page: String(page - 1)})}>
              ← Previous
            </Link>
          )}
          <span>
            Page {data.page} of {data.pages}
          </span>
          {page < data.pages && (
            <Link href={href({q, category, page: String(page + 1)})}>
              Next →
            </Link>
          )}
        </nav>
      )}
    </div>
  );
}
```

- [ ] **Step 5: Verify**

With the backend running (Task 3) and `web` dev server up:
- `/` shows the hero, category pills and up to 8 products with images.
- `/products?q=<part of a product name>` filters results; clicking a category pill filters and highlights.
- `/products?page=999` shows "No products found." without an error.

Run: `cd web && npm run typecheck && npm run lint`
Expected: clean.

- [ ] **Step 6: Commit**

```bash
git add web/src
git commit -m "Add home and product list pages"
```

---

### Task 10: Product detail and SEO

**Files:**
- Create: `web/src/lib/seo.ts`, `web/src/lib/seo.test.ts`, `web/src/components/AddToCartButton.tsx`, `web/src/app/products/[id]/page.tsx`, `web/src/app/sitemap.ts`, `web/src/app/robots.ts`

**Interfaces:**
- Consumes: `fetchProduct`, `fetchAllProducts` (Task 7); `useCart` (Task 8); `PublicProduct`.
- Produces:
  - `productJsonLd(product: PublicProduct, siteUrl: string): object` (schema.org Product)
  - `buildSitemap(products: PublicProduct[], siteUrl: string): {url: string; lastModified?: string}[]`
  - `<AddToCartButton productId={string} disabled? />`

- [ ] **Step 1: Write the failing test**

Create `web/src/lib/seo.test.ts`:

```ts
import {describe, expect, it} from "vitest";
import {buildSitemap, productJsonLd} from "./seo";
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
```

- [ ] **Step 2: Run to verify failure**

Run: `cd web && npm test`
Expected: FAIL (`./seo` not found).

- [ ] **Step 3: Implement the SEO helpers**

Create `web/src/lib/seo.ts`:

```ts
import {CURRENCY} from "./config";
import type {PublicProduct} from "./types";

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

export function buildSitemap(products: PublicProduct[], siteUrl: string) {
  return [
    {url: siteUrl},
    {url: `${siteUrl}/products`},
    ...products.map((product) => ({
      url: `${siteUrl}/products/${product._id}`,
      lastModified: product.updatedAt
    }))
  ];
}
```

- [ ] **Step 4: Run tests**

Run: `cd web && npm test`
Expected: PASS.

- [ ] **Step 5: Add-to-cart button**

Create `web/src/components/AddToCartButton.tsx`:

```tsx
"use client";

import {useAuth} from "@clerk/nextjs";
import {usePathname, useRouter} from "next/navigation";
import {toast} from "sonner";
import {useCart} from "@/hooks/useCart";

export function AddToCartButton({
  productId,
  disabled
}: {
  productId: string;
  disabled?: boolean;
}) {
  const {isSignedIn} = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const {addToCart, isAdding} = useCart();

  function handleClick() {
    if (!isSignedIn) {
      router.push(`/sign-in?redirect_url=${encodeURIComponent(pathname)}`);
      return;
    }

    addToCart(
      {productId, quantity: 1},
      {onSuccess: () => toast.success("Added to cart")}
    );
  }

  return (
    <button
      onClick={handleClick}
      disabled={disabled || isAdding}
      className="w-full rounded bg-neutral-900 px-6 py-3 text-white disabled:opacity-50 sm:w-auto"
    >
      {disabled ? "Sold out" : isAdding ? "Adding..." : "Add to cart"}
    </button>
  );
}
```

- [ ] **Step 6: Product detail page**

Create `web/src/app/products/[id]/page.tsx`:

```tsx
import type {Metadata} from "next";
import Image from "next/image";
import {notFound} from "next/navigation";
import {AddToCartButton} from "@/components/AddToCartButton";
import {fetchProduct} from "@/lib/api/server";
import {SITE_URL} from "@/lib/config";
import {formatPrice} from "@/lib/format";
import {productJsonLd} from "@/lib/seo";

export const revalidate = 60;

type Props = {params: Promise<{id: string}>};

export async function generateMetadata({params}: Props): Promise<Metadata> {
  const {id} = await params;
  const product = await fetchProduct(id);

  if (!product) return {title: "Product not found"};

  const description = product.description.slice(0, 160);

  return {
    title: product.name,
    description,
    alternates: {canonical: `/products/${product._id}`},
    openGraph: {
      title: product.name,
      description,
      images: product.images.slice(0, 1)
    }
  };
}

export default async function ProductPage({params}: Props) {
  const {id} = await params;
  const product = await fetchProduct(id);

  if (!product) notFound();

  // "<" is escaped so product text can never close the script tag.
  const jsonLd = JSON.stringify(productJsonLd(product, SITE_URL)).replace(
    /</g,
    "\\u003c"
  );

  return (
    <article className="grid gap-8 md:grid-cols-2">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{__html: jsonLd}}
      />

      <div className="space-y-3">
        <div className="relative aspect-square overflow-hidden rounded-lg bg-neutral-100">
          {product.images[0] && (
            <Image
              src={product.images[0]}
              alt={product.name}
              fill
              priority
              sizes="(min-width: 768px) 50vw, 100vw"
              className="object-cover"
            />
          )}
        </div>
        {product.images.length > 1 && (
          <div className="grid grid-cols-4 gap-2">
            {product.images.slice(1, 5).map((src) => (
              <div
                key={src}
                className="relative aspect-square overflow-hidden rounded bg-neutral-100"
              >
                <Image
                  src={src}
                  alt={product.name}
                  fill
                  sizes="12vw"
                  className="object-cover"
                />
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-4">
        <p className="text-sm text-neutral-500">{product.category}</p>
        <h1 className="text-3xl font-semibold">{product.name}</h1>
        <p className="text-2xl">{formatPrice(product.price)}</p>

        {product.totalReviews > 0 && (
          <p className="text-sm text-neutral-600">
            ★ {product.averageRating.toFixed(1)} ({product.totalReviews}{" "}
            {product.totalReviews === 1 ? "review" : "reviews"})
          </p>
        )}

        <p className="whitespace-pre-line text-neutral-700">
          {product.description}
        </p>

        <p className={product.inStock ? "text-green-700" : "text-red-700"}>
          {product.inStock ? "In stock" : "Out of stock"}
        </p>

        <AddToCartButton productId={product._id} disabled={!product.inStock} />
      </div>
    </article>
  );
}
```

- [ ] **Step 7: Sitemap and robots**

Create `web/src/app/sitemap.ts`:

```ts
import type {MetadataRoute} from "next";
import {fetchAllProducts} from "@/lib/api/server";
import {SITE_URL} from "@/lib/config";
import {buildSitemap} from "@/lib/seo";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  return buildSitemap(await fetchAllProducts(), SITE_URL);
}
```

Create `web/src/app/robots.ts`:

```ts
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
```

- [ ] **Step 8: Verify**

Run: `cd web && npm run typecheck && npm run lint && npm run dev`, then:
- Open a product page: gallery, price, rating (if reviews exist), stock status. "Add to cart" while signed out sends you to `/sign-in?redirect_url=/products/<id>`.
- Open `/products/000000000000000000000000`: shows the 404 page.
- View source on a product page: a `<script type="application/ld+json">` with the product, and `<title>` containing the product name.
- `http://localhost:3000/sitemap.xml` lists `/products/<id>` URLs; `/robots.txt` shows the sitemap line and disallow rules.

- [ ] **Step 9: Commit**

```bash
git add web/src
git commit -m "Add product detail page with metadata, JSON-LD, sitemap and robots"
```

---

### Task 11: Cart page

**Files:**
- Create: `web/src/components/OrderSummary.tsx`, `web/src/components/OrderSummary.test.tsx`, `web/src/app/cart/page.tsx`

**Interfaces:**
- Consumes: `useCart` (Task 8), `computeTotals`, `formatPrice`.
- Produces: `<OrderSummary subtotal={number} />` (rows: Subtotal, Shipping, Tax, Total).

- [ ] **Step 1: Write the failing test**

Create `web/src/components/OrderSummary.test.tsx`:

```tsx
import {render, screen} from "@testing-library/react";
import {describe, expect, it} from "vitest";
import {formatPrice} from "@/lib/format";
import {OrderSummary} from "./OrderSummary";

describe("OrderSummary", () => {
  it("shows subtotal, shipping, tax and total", () => {
    render(<OrderSummary subtotal={100} />);

    expect(screen.getByText("Subtotal").parentElement).toHaveTextContent(
      formatPrice(100)
    );
    expect(screen.getByText("Shipping").parentElement).toHaveTextContent(
      formatPrice(10)
    );
    expect(screen.getByText("Tax").parentElement).toHaveTextContent(
      formatPrice(8)
    );
    expect(screen.getByText("Total").parentElement).toHaveTextContent(
      formatPrice(118)
    );
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `cd web && npm test`
Expected: FAIL (`./OrderSummary` not found).

- [ ] **Step 3: Implement the summary**

Create `web/src/components/OrderSummary.tsx`:

```tsx
import {formatPrice} from "@/lib/format";
import {computeTotals} from "@/lib/pricing";

export function OrderSummary({subtotal}: {subtotal: number}) {
  const totals = computeTotals(subtotal);

  const rows = [
    ["Subtotal", totals.subtotal],
    ["Shipping", totals.shipping],
    ["Tax", totals.tax]
  ] as const;

  return (
    <div className="space-y-2 rounded-lg border border-neutral-200 bg-white p-4">
      {rows.map(([label, amount]) => (
        <div key={label} className="flex justify-between text-sm">
          <span>{label}</span>
          <span>{formatPrice(amount)}</span>
        </div>
      ))}
      <div className="flex justify-between border-t border-neutral-200 pt-2 font-semibold">
        <span>Total</span>
        <span>{formatPrice(totals.total)}</span>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run tests**

Run: `cd web && npm test`
Expected: PASS.

- [ ] **Step 5: Cart page**

Create `web/src/app/cart/page.tsx`:

```tsx
"use client";

import Image from "next/image";
import Link from "next/link";
import {OrderSummary} from "@/components/OrderSummary";
import {useCart} from "@/hooks/useCart";
import {formatPrice} from "@/lib/format";

export default function CartPage() {
  const {
    cart,
    isLoading,
    subtotal,
    updateQuantity,
    removeFromCart,
    isUpdating,
    isRemoving
  } = useCart();

  if (isLoading) return <p>Loading your cart...</p>;

  const items = cart?.items ?? [];

  if (items.length === 0) {
    return (
      <div className="py-16 text-center">
        <h1 className="text-2xl font-semibold">Your cart is empty</h1>
        <Link
          href="/products"
          className="mt-6 inline-block rounded bg-neutral-900 px-4 py-2 text-white"
        >
          Continue shopping
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-8 lg:grid-cols-3">
      <section className="space-y-4 lg:col-span-2">
        <h1 className="text-2xl font-semibold">Your cart</h1>

        {items.map(({_id, product, quantity}) => (
          <div
            key={_id}
            className="flex gap-4 rounded-lg border border-neutral-200 bg-white p-4"
          >
            <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded bg-neutral-100">
              {product.images[0] && (
                <Image
                  src={product.images[0]}
                  alt={product.name}
                  fill
                  sizes="96px"
                  className="object-cover"
                />
              )}
            </div>

            <div className="flex flex-1 flex-col justify-between">
              <div className="flex justify-between gap-2">
                <Link
                  href={`/products/${product._id}`}
                  className="font-medium hover:underline"
                >
                  {product.name}
                </Link>
                <span>{formatPrice(product.price * quantity)}</span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button
                    aria-label="Decrease quantity"
                    disabled={quantity <= 1 || isUpdating}
                    onClick={() =>
                      updateQuantity({
                        productId: product._id,
                        quantity: quantity - 1
                      })
                    }
                    className="h-8 w-8 rounded border disabled:opacity-40"
                  >
                    −
                  </button>
                  <span className="w-6 text-center">{quantity}</span>
                  <button
                    aria-label="Increase quantity"
                    disabled={quantity >= product.stock || isUpdating}
                    onClick={() =>
                      updateQuantity({
                        productId: product._id,
                        quantity: quantity + 1
                      })
                    }
                    className="h-8 w-8 rounded border disabled:opacity-40"
                  >
                    +
                  </button>
                </div>

                <button
                  disabled={isRemoving}
                  onClick={() => removeFromCart(product._id)}
                  className="text-sm text-red-700 hover:underline disabled:opacity-50"
                >
                  Remove
                </button>
              </div>
            </div>
          </div>
        ))}
      </section>

      <aside className="space-y-4">
        <OrderSummary subtotal={subtotal} />
        <Link
          href="/checkout"
          className="block rounded bg-neutral-900 px-4 py-3 text-center text-white"
        >
          Proceed to checkout
        </Link>
      </aside>
    </div>
  );
}
```

- [ ] **Step 6: Verify end to end (confirms the Clerk token works with `protectRoute`)**

Run the backend (`CLIENT_URL` including `http://localhost:3000`) and `web` dev server, signed in on the web:
- Add a product from its page: toast "Added to cart", the header badge updates.
- `/cart` lists the item. Plus/minus update quantity and totals; Remove deletes it; empty state appears.
- The browser network tab shows `GET /api/cart` returning 200 with no CORS error. A 401/404 `User not found` here means the Clerk user has no MongoDB record (the Inngest sync) or the web and backend use different Clerk apps.

Run: `cd web && npm run typecheck && npm run lint`
Expected: clean.

- [ ] **Step 7: Commit**

```bash
git add web/src
git commit -m "Add cart page and order summary"
```

---

### Task 12: Addresses

**Files:**
- Create: `web/src/hooks/useAddresses.ts`, `web/src/components/AddressForm.tsx`, `web/src/app/account/addresses/page.tsx`

**Interfaces:**
- Consumes: `useApi`, `ApiError`, `Address`.
- Produces (`useAddresses()`): `{addresses: Address[], isLoading, addAddress(data: AddressInput, options?), updateAddress({addressId, data}), deleteAddress(addressId), isAdding: boolean}` where `AddressInput = Omit<Address, "_id">`.
- Produces: `<AddressForm onSubmit={(data: AddressInput) => void} submitting={boolean} onCancel? />`, and `export type AddressInput`.

- [ ] **Step 1: Hook**

Create `web/src/hooks/useAddresses.ts`:

```ts
"use client";

import {useAuth} from "@clerk/nextjs";
import {useMutation, useQuery, useQueryClient} from "@tanstack/react-query";
import {toast} from "sonner";
import {ApiError} from "@/lib/api/client";
import {useApi} from "@/lib/api/useApi";
import type {Address} from "@/lib/types";

export type AddressInput = Omit<Address, "_id">;

const ADDRESSES_KEY = ["addresses"];

export function useAddresses() {
  const api = useApi();
  const {isSignedIn} = useAuth();
  const queryClient = useQueryClient();

  const invalidate = () =>
    queryClient.invalidateQueries({queryKey: ADDRESSES_KEY});
  const onError = (error: unknown) =>
    toast.error(
      error instanceof ApiError ? error.message : "Something went wrong"
    );

  const query = useQuery({
    queryKey: ADDRESSES_KEY,
    enabled: Boolean(isSignedIn),
    queryFn: async () =>
      (await api.get<{addresses: Address[]}>("/users/addresses")).addresses
  });

  const add = useMutation({
    mutationFn: (data: AddressInput) => api.post("/users/addresses", data),
    onSuccess: invalidate,
    onError
  });

  const update = useMutation({
    mutationFn: ({
      addressId,
      data
    }: {
      addressId: string;
      data: Partial<AddressInput>;
    }) => api.put(`/users/addresses/${addressId}`, data),
    onSuccess: invalidate,
    onError
  });

  const remove = useMutation({
    mutationFn: (addressId: string) =>
      api.delete(`/users/addresses/${addressId}`),
    onSuccess: invalidate,
    onError
  });

  return {
    addresses: query.data ?? [],
    isLoading: query.isLoading,
    addAddress: add.mutate,
    updateAddress: update.mutate,
    deleteAddress: remove.mutate,
    isAdding: add.isPending
  };
}
```

- [ ] **Step 2: Form**

Create `web/src/components/AddressForm.tsx`:

```tsx
"use client";

import {useState} from "react";
import type {AddressInput} from "@/hooks/useAddresses";

const FIELDS: {name: keyof AddressInput; label: string}[] = [
  {name: "label", label: "Label (e.g. Home)"},
  {name: "fullName", label: "Full name"},
  {name: "streetAddress", label: "Street address"},
  {name: "city", label: "City"},
  {name: "state", label: "State"},
  {name: "zipCode", label: "Postal code"},
  {name: "phoneNumber", label: "Phone number"}
];

export function AddressForm({
  onSubmit,
  submitting,
  onCancel
}: {
  onSubmit: (data: AddressInput) => void;
  submitting: boolean;
  onCancel?: () => void;
}) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [isDefault, setIsDefault] = useState(false);

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit({...(values as Omit<AddressInput, "isDefault">), isDefault});
      }}
      className="grid gap-3 rounded-lg border border-neutral-200 bg-white p-4 sm:grid-cols-2"
    >
      {FIELDS.map(({name, label}) => (
        <label key={name} className="text-sm">
          {label}
          <input
            required
            value={values[name] ?? ""}
            onChange={(event) =>
              setValues((prev) => ({...prev, [name]: event.target.value}))
            }
            className="mt-1 w-full rounded border border-neutral-300 px-3 py-2"
          />
        </label>
      ))}

      <label className="flex items-center gap-2 text-sm sm:col-span-2">
        <input
          type="checkbox"
          checked={isDefault}
          onChange={(event) => setIsDefault(event.target.checked)}
        />
        Make this my default address
      </label>

      <div className="flex gap-2 sm:col-span-2">
        <button
          disabled={submitting}
          className="rounded bg-neutral-900 px-4 py-2 text-white disabled:opacity-50"
        >
          {submitting ? "Saving..." : "Save address"}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="rounded border px-4 py-2"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
```

All fields are required because the Mongoose schema requires them (the controller only checks some, so a missing one would surface as a 500).

- [ ] **Step 3: Addresses page**

Create `web/src/app/account/addresses/page.tsx`:

```tsx
"use client";

import {useState} from "react";
import {AddressForm} from "@/components/AddressForm";
import {useAddresses} from "@/hooks/useAddresses";

export default function AddressesPage() {
  const {
    addresses,
    isLoading,
    addAddress,
    updateAddress,
    deleteAddress,
    isAdding
  } = useAddresses();
  const [showForm, setShowForm] = useState(false);

  if (isLoading) return <p>Loading addresses...</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Your addresses</h1>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="rounded bg-neutral-900 px-4 py-2 text-white"
          >
            Add address
          </button>
        )}
      </div>

      {showForm && (
        <AddressForm
          submitting={isAdding}
          onCancel={() => setShowForm(false)}
          onSubmit={(data) =>
            addAddress(data, {onSuccess: () => setShowForm(false)})
          }
        />
      )}

      {addresses.length === 0 && !showForm && (
        <p className="text-neutral-600">You haven&apos;t saved any addresses.</p>
      )}

      <ul className="grid gap-4 sm:grid-cols-2">
        {addresses.map((address) => (
          <li
            key={address._id}
            className="rounded-lg border border-neutral-200 bg-white p-4 text-sm"
          >
            <div className="flex items-center justify-between">
              <p className="font-medium">{address.label}</p>
              {address.isDefault && (
                <span className="rounded bg-neutral-900 px-2 py-0.5 text-xs text-white">
                  Default
                </span>
              )}
            </div>
            <p className="mt-2">{address.fullName}</p>
            <p>{address.streetAddress}</p>
            <p>
              {address.city}, {address.state} {address.zipCode}
            </p>
            <p>{address.phoneNumber}</p>

            <div className="mt-3 flex gap-3">
              {!address.isDefault && (
                <button
                  onClick={() =>
                    updateAddress({
                      addressId: address._id,
                      data: {isDefault: true}
                    })
                  }
                  className="hover:underline"
                >
                  Make default
                </button>
              )}
              <button
                onClick={() => deleteAddress(address._id)}
                className="text-red-700 hover:underline"
              >
                Delete
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

- [ ] **Step 4: Verify**

Run: `cd web && npm run typecheck && npm run lint`, then in the browser while signed in: `/account/addresses` lists existing addresses (including ones added on mobile), adding one shows it immediately, "Make default" moves the badge, Delete removes it.

- [ ] **Step 5: Commit**

```bash
git add web/src
git commit -m "Add address management page"
```

---

### Task 13: Checkout and payment verification

**Files:**
- Create: `web/src/lib/payment.ts`, `web/src/lib/payment.test.ts`, `web/src/hooks/useStartPayment.ts`, `web/src/hooks/usePaymentVerification.ts`, `web/src/hooks/usePaymentVerification.test.tsx`, `web/src/app/checkout/page.tsx`, `web/src/app/checkout/success/page.tsx`

**Interfaces:**
- Consumes: `useApi`, `ApiError` (Task 7); `useCart`, `CART_KEY` (Task 8); `useAddresses`, `AddressForm` (Task 12); `toShippingAddress`, `pickDefaultAddress` (Task 6); `OrderSummary` (Task 11).
- Produces:
  - `parseReference(value: string | string[] | undefined): string | null`
  - `useStartPayment(): {startPayment(address: Address, items: CartItem[]): Promise<void>, isStarting: boolean}`. It posts `{cartItems, shippingAddress, platform: "web"}` to `/payments/initialize-payment` and then redirects the browser to `authorization_url`.
  - `usePaymentVerification(reference: string | null): {status: "verifying" | "success" | "failed", message?: string, retry(): void}`. On success it clears the cart (`DELETE /cart`) and invalidates the `["cart"]` and `["orders"]` queries.

- [ ] **Step 1: Write the failing tests**

Create `web/src/lib/payment.test.ts`:

```ts
import {describe, expect, it} from "vitest";
import {parseReference} from "./payment";

describe("parseReference", () => {
  it("returns a plain reference", () => {
    expect(parseReference("order_1")).toBe("order_1");
  });

  it("takes the first value when Paystack repeats the param", () => {
    expect(parseReference(["order_1", "order_1"])).toBe("order_1");
    expect(parseReference("order_1,order_1")).toBe("order_1");
  });

  it("returns null when missing or blank", () => {
    expect(parseReference(undefined)).toBeNull();
    expect(parseReference("  ")).toBeNull();
  });
});
```

Create `web/src/hooks/usePaymentVerification.test.tsx`:

```tsx
import {QueryClient, QueryClientProvider} from "@tanstack/react-query";
import {act, renderHook, waitFor} from "@testing-library/react";
import {beforeEach, describe, expect, it, vi} from "vitest";
import {ApiError} from "@/lib/api/client";
import {usePaymentVerification} from "./usePaymentVerification";

// vi.mock is hoisted above imports, so the shared mock must be hoisted too.
const api = vi.hoisted(() => ({get: vi.fn(), delete: vi.fn()}));
vi.mock("@/lib/api/useApi", () => ({useApi: () => api}));

function wrapper({children}: {children: React.ReactNode}) {
  const client = new QueryClient();
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  api.get.mockReset();
  api.delete.mockReset();
});

describe("usePaymentVerification", () => {
  it("verifies the payment, clears the cart and reports success", async () => {
    api.get.mockResolvedValue({message: "Payment verified successfully"});
    api.delete.mockResolvedValue({});

    const {result} = renderHook(() => usePaymentVerification("order_1"), {
      wrapper
    });

    expect(result.current.status).toBe("verifying");
    await waitFor(() => expect(result.current.status).toBe("success"));
    expect(api.get).toHaveBeenCalledWith("/payments/verify-payment/order_1");
    expect(api.delete).toHaveBeenCalledWith("/cart");
  });

  it("reports failure with the server message and keeps the cart", async () => {
    api.get.mockRejectedValue(new ApiError(400, "Payment not successful"));

    const {result} = renderHook(() => usePaymentVerification("order_1"), {
      wrapper
    });

    await waitFor(() => expect(result.current.status).toBe("failed"));
    expect(result.current.message).toBe("Payment not successful");
    expect(api.delete).not.toHaveBeenCalled();
  });

  it("fails immediately without a reference", async () => {
    const {result} = renderHook(() => usePaymentVerification(null), {wrapper});

    await waitFor(() => expect(result.current.status).toBe("failed"));
    expect(api.get).not.toHaveBeenCalled();
  });

  it("retries verification", async () => {
    api.get.mockRejectedValueOnce(new ApiError(400, "Payment not successful"));
    api.get.mockResolvedValueOnce({});
    api.delete.mockResolvedValue({});

    const {result} = renderHook(() => usePaymentVerification("order_1"), {
      wrapper
    });
    await waitFor(() => expect(result.current.status).toBe("failed"));

    act(() => result.current.retry());

    await waitFor(() => expect(result.current.status).toBe("success"));
    expect(api.get).toHaveBeenCalledTimes(2);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `cd web && npm test`
Expected: FAIL (modules not found).

- [ ] **Step 3: Implement `parseReference`**

Create `web/src/lib/payment.ts`:

```ts
// Paystack appends both `trxref` and `reference`; if the param is repeated it
// can arrive as an array or a comma-joined string, so take the first value.
export function parseReference(
  value: string | string[] | undefined
): string | null {
  const raw = Array.isArray(value) ? value[0] : value;
  const reference = raw?.split(",")[0].trim();

  return reference || null;
}
```

- [ ] **Step 4: Implement the verification hook**

Create `web/src/hooks/usePaymentVerification.ts`:

```ts
"use client";

import {useEffect, useState} from "react";
import {useQueryClient} from "@tanstack/react-query";
import {ApiError} from "@/lib/api/client";
import {useApi} from "@/lib/api/useApi";
import {CART_KEY} from "@/hooks/useCart";

type State = {status: "verifying" | "success" | "failed"; message?: string};

// verify-payment is idempotent on the server, so re-running it (retry button,
// React strict-mode double effects) is safe.
export function usePaymentVerification(reference: string | null) {
  const api = useApi();
  const queryClient = useQueryClient();
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<State>({status: "verifying"});

  useEffect(() => {
    if (!reference) {
      setState({status: "failed", message: "Missing payment reference"});
      return;
    }

    let cancelled = false;
    setState({status: "verifying"});

    (async () => {
      try {
        await api.get(`/payments/verify-payment/${encodeURIComponent(reference)}`);
        await api.delete("/cart");
        await Promise.all([
          queryClient.invalidateQueries({queryKey: CART_KEY}),
          queryClient.invalidateQueries({queryKey: ["orders"]})
        ]);
        if (!cancelled) setState({status: "success"});
      } catch (error) {
        if (cancelled) return;
        setState({
          status: "failed",
          message:
            error instanceof ApiError ? error.message : "Verification failed"
        });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [api, reference, attempt, queryClient]);

  return {...state, retry: () => setAttempt((n) => n + 1)};
}
```

- [ ] **Step 5: Run tests**

Run: `cd web && npm test`
Expected: PASS.

- [ ] **Step 6: Start-payment hook**

Create `web/src/hooks/useStartPayment.ts`:

```ts
"use client";

import {useState} from "react";
import {toast} from "sonner";
import {ApiError} from "@/lib/api/client";
import {useApi} from "@/lib/api/useApi";
import {toShippingAddress} from "@/lib/address";
import type {Address, CartItem} from "@/lib/types";

export function useStartPayment() {
  const api = useApi();
  const [isStarting, setIsStarting] = useState(false);

  async function startPayment(address: Address, items: CartItem[]) {
    setIsStarting(true);
    try {
      const {authorization_url} = await api.post<{
        authorization_url: string;
        reference: string;
      }>("/payments/initialize-payment", {
        cartItems: items,
        shippingAddress: toShippingAddress(address),
        platform: "web"
      });

      // Leave the spinner on: the browser is navigating to Paystack.
      window.location.assign(authorization_url);
    } catch (error) {
      toast.error(
        error instanceof ApiError ? error.message : "Could not start payment"
      );
      setIsStarting(false);
    }
  }

  return {startPayment, isStarting};
}
```

- [ ] **Step 7: Checkout page**

Create `web/src/app/checkout/page.tsx`:

```tsx
"use client";

import Link from "next/link";
import {useState} from "react";
import {AddressForm} from "@/components/AddressForm";
import {OrderSummary} from "@/components/OrderSummary";
import {useAddresses} from "@/hooks/useAddresses";
import {useCart} from "@/hooks/useCart";
import {useStartPayment} from "@/hooks/useStartPayment";
import {pickDefaultAddress} from "@/lib/address";

export default function CheckoutPage() {
  const {cart, isLoading: cartLoading, subtotal} = useCart();
  const {
    addresses,
    isLoading: addressesLoading,
    addAddress,
    isAdding
  } = useAddresses();
  const {startPayment, isStarting} = useStartPayment();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  if (cartLoading || addressesLoading) return <p>Loading checkout...</p>;

  const items = cart?.items ?? [];

  if (items.length === 0) {
    return (
      <div className="py-16 text-center">
        <h1 className="text-2xl font-semibold">Your cart is empty</h1>
        <Link href="/products" className="mt-4 inline-block underline">
          Continue shopping
        </Link>
      </div>
    );
  }

  const selected =
    addresses.find((a) => a._id === selectedId) ?? pickDefaultAddress(addresses);

  return (
    <div className="grid gap-8 lg:grid-cols-3">
      <section className="space-y-4 lg:col-span-2">
        <h1 className="text-2xl font-semibold">Checkout</h1>
        <h2 className="font-medium">Shipping address</h2>

        {addresses.map((address) => (
          <label
            key={address._id}
            className={`flex cursor-pointer gap-3 rounded-lg border bg-white p-4 text-sm ${selected?._id === address._id ? "border-neutral-900" : "border-neutral-200"}`}
          >
            <input
              type="radio"
              name="address"
              checked={selected?._id === address._id}
              onChange={() => setSelectedId(address._id)}
            />
            <span>
              <span className="block font-medium">
                {address.label} · {address.fullName}
              </span>
              {address.streetAddress}, {address.city}, {address.state}{" "}
              {address.zipCode} · {address.phoneNumber}
            </span>
          </label>
        ))}

        {showForm || addresses.length === 0 ? (
          <AddressForm
            submitting={isAdding}
            onCancel={addresses.length > 0 ? () => setShowForm(false) : undefined}
            onSubmit={(data) =>
              addAddress(data, {onSuccess: () => setShowForm(false)})
            }
          />
        ) : (
          <button
            onClick={() => setShowForm(true)}
            className="text-sm underline"
          >
            + Add a new address
          </button>
        )}
      </section>

      <aside className="space-y-4">
        <OrderSummary subtotal={subtotal} />
        <button
          disabled={!selected || isStarting}
          onClick={() => selected && startPayment(selected, items)}
          className="w-full rounded bg-neutral-900 px-4 py-3 text-white disabled:opacity-50"
        >
          {isStarting ? "Redirecting to Paystack..." : "Pay with Paystack"}
        </button>
        {!selected && (
          <p className="text-sm text-neutral-600">
            Add a shipping address to continue.
          </p>
        )}
      </aside>
    </div>
  );
}
```

- [ ] **Step 8: Success page**

Create `web/src/app/checkout/success/page.tsx` (server component that hands the reference to a client component, so no Suspense boundary is needed):

```tsx
import {parseReference} from "@/lib/payment";
import {PaymentResult} from "./PaymentResult";

export default async function CheckoutSuccessPage({
  searchParams
}: {
  searchParams: Promise<{reference?: string | string[]}>;
}) {
  const {reference} = await searchParams;

  return <PaymentResult reference={parseReference(reference)} />;
}
```

Create `web/src/app/checkout/success/PaymentResult.tsx`:

```tsx
"use client";

import Link from "next/link";
import {usePaymentVerification} from "@/hooks/usePaymentVerification";

export function PaymentResult({reference}: {reference: string | null}) {
  const {status, message, retry} = usePaymentVerification(reference);

  if (status === "verifying") {
    return (
      <div className="py-16 text-center">
        <h1 className="text-2xl font-semibold">Confirming your payment...</h1>
        <p className="mt-2 text-neutral-600">Please don&apos;t close this page.</p>
      </div>
    );
  }

  if (status === "success") {
    return (
      <div className="py-16 text-center">
        <h1 className="text-2xl font-semibold">Thank you for your order!</h1>
        <p className="mt-2 text-neutral-600">Your payment was successful.</p>
        <Link
          href="/account/orders"
          className="mt-6 inline-block rounded bg-neutral-900 px-4 py-2 text-white"
        >
          View my orders
        </Link>
      </div>
    );
  }

  return (
    <div className="py-16 text-center">
      <h1 className="text-2xl font-semibold">We couldn&apos;t confirm your payment</h1>
      <p className="mt-2 text-neutral-600">{message}</p>
      <p className="mt-1 text-sm text-neutral-500">
        If you were charged, your order will still be processed automatically.
      </p>
      <div className="mt-6 flex justify-center gap-3">
        <button onClick={retry} className="rounded bg-neutral-900 px-4 py-2 text-white">
          Try again
        </button>
        <Link href="/cart" className="rounded border px-4 py-2">
          Back to cart
        </Link>
      </div>
    </div>
  );
}
```

- [ ] **Step 9: Verify with Paystack test mode**

Backend `.env` must have a Paystack **test** secret key and `WEB_URL=http://localhost:3000`. In the Paystack dashboard, test mode must be on.
- Add a product, go to `/checkout`, pick or add an address, click "Pay with Paystack". Expected: redirect to a Paystack-hosted page.
- Pay with a Paystack test card. Expected: redirect to `http://localhost:3000/checkout/success?trxref=...&reference=order_...`, then "Thank you for your order!", the cart badge clears, and the order appears at `/account/orders` (Task 14).
- Abandon payment and return manually to `/checkout/success?reference=<ref>`: Expected: "We couldn't confirm your payment" with the retry button; the cart is untouched.
- Confirm the mobile flow is unaffected: initializing without `platform` still returns the ngrok-based callback (covered by the Task 4 unit test).

Run: `cd web && npm test && npm run typecheck && npm run lint`
Expected: clean.

- [ ] **Step 10: Commit**

```bash
git add web/src
git commit -m "Add Paystack checkout and payment verification"
```

---

### Task 14: Order history

**Files:**
- Create: `web/src/hooks/useOrders.ts`, `web/src/app/account/orders/page.tsx`

**Interfaces:**
- Consumes: `useApi`, `Order`, `formatPrice`, `formatDate`.
- Produces: `useOrders(): {orders: Order[], isLoading: boolean}`. It uses query key `["orders"]` (invalidated by Task 13) and returns only paid orders, since the backend also creates `pending` orders before payment and abandoned checkouts should not appear in history.

- [ ] **Step 1: Hook**

Create `web/src/hooks/useOrders.ts`:

```ts
"use client";

import {useAuth} from "@clerk/nextjs";
import {useQuery} from "@tanstack/react-query";
import {useApi} from "@/lib/api/useApi";
import type {Order} from "@/lib/types";

export function useOrders() {
  const api = useApi();
  const {isSignedIn} = useAuth();

  const query = useQuery({
    queryKey: ["orders"],
    enabled: Boolean(isSignedIn),
    queryFn: async () => (await api.get<{orders: Order[]}>("/orders")).orders
  });

  // Orders are created as "pending" before the Paystack redirect; hide the
  // ones that were never paid.
  const orders = (query.data ?? []).filter(
    (order) => order.paymentResult.status === "succeeded"
  );

  return {orders, isLoading: query.isLoading};
}
```

- [ ] **Step 2: Orders page**

Create `web/src/app/account/orders/page.tsx`:

```tsx
"use client";

import Image from "next/image";
import Link from "next/link";
import {useOrders} from "@/hooks/useOrders";
import {formatDate, formatPrice} from "@/lib/format";

export default function OrdersPage() {
  const {orders, isLoading} = useOrders();

  if (isLoading) return <p>Loading your orders...</p>;

  if (orders.length === 0) {
    return (
      <div className="py-16 text-center">
        <h1 className="text-2xl font-semibold">No orders yet</h1>
        <Link href="/products" className="mt-4 inline-block underline">
          Start shopping
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Your orders</h1>

      {orders.map((order) => (
        <section
          key={order._id}
          className="rounded-lg border border-neutral-200 bg-white p-4"
        >
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <span className="text-neutral-600">
              Placed {formatDate(order.createdAt)}
            </span>
            <span className="rounded bg-neutral-100 px-2 py-0.5 capitalize">
              {order.status}
            </span>
            <span className="font-semibold">{formatPrice(order.totalPrice)}</span>
          </div>

          <ul className="mt-4 space-y-3">
            {order.orderItems.map((item) => (
              <li key={item._id} className="flex items-center gap-3">
                <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded bg-neutral-100">
                  {item.image && (
                    <Image
                      src={item.image}
                      alt={item.name}
                      fill
                      sizes="56px"
                      className="object-cover"
                    />
                  )}
                </div>
                <span className="flex-1">{item.name}</span>
                <span className="text-sm text-neutral-600">
                  {item.quantity} × {formatPrice(item.price)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Verify**

Run: `cd web && npm run typecheck && npm run lint`, then signed in at `/account/orders`: paid orders (including ones placed on mobile) are listed newest first with items, status and total; abandoned (unpaid) checkouts are absent.

- [ ] **Step 4: Commit**

```bash
git add web/src
git commit -m "Add order history page"
```

---

### Task 15: E2E smoke test, production verification and docs

**Files:**
- Create: `web/e2e/fake-api.mjs`, `web/e2e/storefront.spec.ts`, `web/playwright.config.ts`, `web/README.md`

**Interfaces:**
- Consumes: all public pages plus `sitemap.xml`, `robots.txt`.
- Produces: `npm run test:e2e` (builds the app, runs it against a fake API on port 4010).

The smoke test runs against a fake API because server-side fetches cannot be intercepted by Playwright. It does not exercise a signed-in session; Clerk's testing-token setup is deferred (see Spec deviations in the summary).

- [ ] **Step 1: Fake API**

Create `web/e2e/fake-api.mjs`:

```js
import http from "node:http";

const products = [
  {
    _id: "64b7f0c2a1b2c3d4e5f60001",
    name: "Test Sneakers",
    description: "Comfortable everyday sneakers.",
    price: 49.99,
    category: "Shoes",
    images: ["https://images.unsplash.com/photo-1542291026-7eec264c27ff"],
    averageRating: 4.5,
    totalReviews: 10,
    inStock: true,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-02-01T00:00:00.000Z"
  }
];

const send = (res, status, body) => {
  res.writeHead(status, {"Content-Type": "application/json"});
  res.end(JSON.stringify(body));
};

http
  .createServer((req, res) => {
    const url = new URL(req.url, "http://localhost");

    if (url.pathname === "/api/health") return send(res, 200, {ok: true});
    if (url.pathname === "/api/public/categories")
      return send(res, 200, {categories: ["Shoes"]});
    if (url.pathname === "/api/public/products")
      return send(res, 200, {
        products,
        total: products.length,
        page: 1,
        pages: 1
      });

    const match = url.pathname.match(/^\/api\/public\/products\/(.+)$/);
    if (match) {
      const product = products.find((p) => p._id === match[1]);
      return product
        ? send(res, 200, product)
        : send(res, 404, {message: "Product not found"});
    }

    send(res, 404, {message: "Not found"});
  })
  .listen(4010, () => console.log("fake api on 4010"));
```

- [ ] **Step 2: Playwright config**

Create `web/playwright.config.ts`:

```ts
import {defineConfig} from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  use: {baseURL: "http://localhost:3100"},
  webServer: [
    {
      command: "node e2e/fake-api.mjs",
      url: "http://localhost:4010/api/health",
      reuseExistingServer: false
    },
    {
      command: "npm run build && npm run start -- -p 3100",
      url: "http://localhost:3100",
      timeout: 300_000,
      reuseExistingServer: false,
      env: {
        ...(process.env as Record<string, string>),
        NEXT_PUBLIC_API_URL: "http://localhost:4010/api",
        NEXT_PUBLIC_SITE_URL: "http://localhost:3100"
      }
    }
  ]
});
```

Clerk keys are read from `web/.env.local`. Add `/test-results/` and `/playwright-report/` to `web/.gitignore`.

- [ ] **Step 3: The smoke spec**

Create `web/e2e/storefront.spec.ts`:

```ts
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
});

test("cart requires sign-in", async ({page}) => {
  await page.goto("/cart");
  await expect(page).toHaveURL(/sign-in/);
});
```

- [ ] **Step 4: Run it**

Run: `cd web && npm run test:e2e`
Expected: 5 tests pass. The "cart requires sign-in" test needs valid Clerk dev keys in `.env.local` and network access to Clerk.

- [ ] **Step 5: Production-build checks**

Run: `cd web && npm run build`. In the route table of the output, confirm `/` and `/products/[id]` are listed as static/ISR (`○`, `●` or "Revalidate 1m") and not fully dynamic (`ƒ`). `/products` is expected to be dynamic because it reads `searchParams`; its data is still cached by the fetch layer.

Verify failures are not cached: with `npm run start` and the real backend, load a product page, stop the backend, wait 60+ seconds and reload. Expected: the previously cached page keeps being served (ISR keeps the last good page). For a product never visited, expected: the "Something went wrong" page. Restart the backend and reload that same URL; expected: it renders normally.

Run Lighthouse (Chrome DevTools, or `npx lighthouse http://localhost:3000/products/<id> --only-categories=seo,performance --view`) on a product page. Expected: SEO score 90 or above. Paste the page URL into Google's Rich Results Test (use a deployed URL or a tunnel) and confirm the Product item is detected without errors. This last check is manual and can wait until the first deployment.

- [ ] **Step 6: README**

Create `web/README.md`:

```markdown
# Web storefront

SEO-focused customer storefront: Next.js (App Router), Clerk, Paystack.

## Setup

1. `cp .env.example .env.local` and fill in the Clerk keys (same Clerk app as `backend/` and `mobile/`).
2. Backend `.env` needs:
   - `CLIENT_URL` including this app's origin, comma-separated (e.g. `http://localhost:5173,http://localhost:3000`)
   - `WEB_URL` = this app's public URL (Paystack returns the customer here)
   - `PAYSTACK_SECRET_KEY` (use a test key locally)
3. `npm install && npm run dev` (http://localhost:3000)

## Scripts

- `npm test` unit tests (Vitest)
- `npm run test:e2e` Playwright smoke test (builds the app; uses a fake API)
- `npm run typecheck`, `npm run lint`

## Notes

- Public pages call `GET /api/public/*` on the backend and are cached with ISR (60s).
- Cart, checkout and account pages are client-side and call the authenticated API with the Clerk token.
- `src/lib/pricing.ts` mirrors `backend/src/lib/pricing.js` (shipping and tax). The server is authoritative; keep both in sync.
- Deploy separately (e.g. Vercel) with the same env vars as `.env.example`.
```

- [ ] **Step 7: Final check and commit**

Run: `cd web && npm test && npm run typecheck && npm run lint && cd ../backend && npm test`
Expected: all pass.

```bash
git add web
git commit -m "Add storefront e2e smoke test and README"
```
