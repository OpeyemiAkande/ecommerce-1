# Web Storefront Design

Date: 2026-10-30

## Goal

Build an SEO-focused customer web storefront as a new `web/` app in the monorepo, alongside `backend/`, `admin/` and `mobile/`. Payments use Paystack only.

## Decisions

- **Stack:** Next.js (App Router), TypeScript, Tailwind.
- **Auth:** Clerk via `@clerk/nextjs`.
- **Payments:** Paystack redirect flow. No Stripe.
- **Data:** the existing Express backend is the single source of truth. `web/` has no database access.
- **Monorepo:** `web/` is its own app. Types are copied from `mobile/types` at first. `packages/shared` is extracted only if duplication becomes painful.
- **Deployment:** `web/` deploys separately (e.g. Vercel) with `NEXT_PUBLIC_API_URL`. Root `build`/`start` scripts are unchanged.

## Architecture

- **Public pages** (home, product list, product detail) are fetched on the server with ISR (`revalidate` ~60s) so they are indexable and fast.
- **Private pages** (cart, checkout, orders, addresses, wishlist) are client components calling the API with the Clerk session token via TanStack Query, the same pattern as the mobile hooks.
- **SEO layer:** `generateMetadata` per product, Open Graph tags, `sitemap.ts` and `robots.ts` built from the products API, and Product JSON-LD (price, availability, rating).

## Routes

| Route | Rendering | Auth |
|---|---|---|
| `/` | Server, ISR | Public |
| `/products` (`?category=`, `?q=`) | Server | Public |
| `/products/[id]` | Server, ISR, metadata + JSON-LD | Public |
| `/cart`, `/wishlist` | Client | Signed in |
| `/checkout` | Client | Signed in |
| `/checkout/success?reference=` | Client, verifies payment | Signed in |
| `/account/orders`, `/account/addresses` | Client | Signed in |
| `/sign-in`, `/sign-up` | Clerk components | Public |

Clerk middleware protects `/cart`, `/checkout`, `/wishlist` and `/account/*`. Requests to Express send `Authorization: Bearer <Clerk session token>`, so `protectRoute` is expected to work unchanged. This must be confirmed during implementation.

## Required backend changes

1. **Public product endpoints.** `GET /api/products` and `GET /api/products/:id` currently use `protectRoute`. Add unauthenticated `GET /api/public/products` and `GET /api/public/products/:id` that return only storefront fields. Admin and mobile contracts are untouched.
2. **CORS.** `server.js` allows a single origin (`ENV.CLIENT_URL`). Change it to accept a comma-separated list so the web origin is allowed.
3. **Web-aware Paystack callback.** `initializePayment` builds `callback_url` from `ENV.NGROK_URL`, and `/payment-success` redirects to an `exp://` deep link. Accept an optional `platform: "web"`. When set, use `${ENV.WEB_URL}/checkout/success?reference=...`. Otherwise keep the current behavior. The URL is built server-side from `WEB_URL`. A URL is never taken from the client, so there is no open-redirect risk.

## Checkout flow

1. `/checkout` collects the address and cart, then calls `POST /api/payments/initialize-payment` with `platform: "web"`.
2. The response carries Paystack's `authorization_url` and `reference`. The browser redirects to `authorization_url` (redirect flow, not the inline popup, so it survives refreshes and popup blockers).
3. Paystack redirects to `/checkout/success?reference=...`.
4. That page calls `GET /api/payments/verify-payment/:reference` (existing, idempotent), shows the result, and clears the cart. It handles `pending`, `success` and `failed`, with a retry button.
5. The existing Paystack webhook still fulfills the order if the user never returns to the site.

## Error handling

- Missing product: `notFound()` renders a real 404. API down: `error.tsx` renders a retry page. Failures are not cached for the ISR window.
- Client calls go through a shared fetch wrapper that attaches the Clerk token and normalizes errors to `{status, message}`. A 401 redirects to sign-in with a return URL. TanStack Query handles retries, and mutations show toasts.
- A failed `initialize-payment` keeps the user on checkout with the cart intact.

## Testing

- **Backend:** unit tests for the public product routes (no auth, storefront fields only) and for `callback_url` selection. The backend has no test setup today, so a small one is part of this work.
- **Web:** Vitest and React Testing Library for cart and checkout logic and the fetch wrapper. One Playwright smoke test covers browse, product, sign-in and cart, with Paystack mocked at the network layer.
- **Manual before release:** the real Paystack redirect in test mode.
- **SEO checks:** Lighthouse on a product page, structured data in Google's Rich Results Test, and `sitemap.xml` listing every product.

## v1 scope

- **In:** home, product list and search, product detail with reviews displayed, cart, Paystack checkout, order history, addresses, SEO layer.
- **Later:** wishlist (small add if wanted in v1), writing reviews, extra social login, `packages/shared`.
- **Out:** Stripe, i18n, changes to `admin/` or `mobile/`.

## Open items to verify during implementation

- `protectRoute` accepts a Clerk web session token.
- Which storefront fields the public product endpoints should expose.
- Whether the product model needs a slug for friendlier URLs (v1 uses `_id`).
