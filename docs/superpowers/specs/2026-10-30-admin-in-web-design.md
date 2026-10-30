# Admin inside the web app

## Goal

Serve the admin dashboard from the Next.js app under `/admin`, so one app hosts both the storefront and the admin. The standalone `admin/` (Vite) app is retired once the new admin is confirmed to work.

## Decisions

- Admin is ported to the web design system (tokens and shared classes in `globals.css`), not daisyUI. Light and dark follow the OS like the storefront.
- `admin/` is **left in place** until the user has tested the new admin against real data. Its deletion, and the matching backend cleanup, are the last separate commit.
- Same Clerk app and same backend API. No backend endpoint changes.

## Global constraints

- Next.js 15 App Router, TypeScript, Tailwind v4, `react-icons/io5`, TanStack Query, sonner (all already in `web/`).
- No new UI library. Lucide and daisyUI are not carried over.
- `/admin` must never be indexed.

## 1. Structure and routing

- Existing storefront pages move into a `(store)` route group (URLs unchanged). `(store)/layout.tsx` renders the storefront `Header` and the `<main>` wrapper.
- Root `layout.tsx` keeps `ClerkProvider`, `<html>`, `<body>`, `Providers` (Query client + Toaster).
- `src/app/admin/layout.tsx`: sidebar + top bar. Sidebar is fixed on desktop and a slide-over on mobile.
- Pages: `/admin` (redirects to `/admin/dashboard`), `/admin/dashboard`, `/admin/products`, `/admin/orders`, `/admin/customers`.
- The admin's `/login` page is dropped; signed-out users use the existing `/sign-in?redirect_url=...`.

## 2. Auth and access

- `middleware.ts` adds `/admin(.*)` to the protected matcher.
- The backend's `adminOnly` remains the real gate. The admin layout makes one `/admin/stats` request; a 403 renders a "You don't have access" screen with a link back to the store, instead of failed requests on each page.
- `robots.ts` disallows `/admin`; admin pages export `robots: {index: false, follow: false}`; `/admin` is not in the sitemap.

## 3. Data layer

- `createApiClient` (web/src/lib/api/client.ts) sends `FormData` bodies as-is (no JSON content type, no `JSON.stringify`) and gains `patch`.
- `src/lib/admin/api.ts` replaces `admin/src/lib/api.js`: same endpoints (`/admin/products`, `/admin/orders`, `/admin/orders/:id/status`, `/admin/stats`, `/admin/customers`) over `useApi()`. Query keys: `products`, `dashboardStats`, `customers` as before, and `["admin", "orders"]` for orders (the storefront already uses `["orders"]` with a different shape on the same QueryClient).
- `src/lib/admin/types.ts` types product, order, customer and stats.
- `src/lib/admin/utils.ts` ports `capitalizeText`, `getOrderStatusBadge`, `getStockStatusBadge`, `formatDate`, `getErrorMessage` (error messages come from `ApiError.message`).
- Products page is split: list, `ProductFormModal`, `DeleteProductModal`.
- Typo fixes during the port: `fon-semibold`, `customer.names` alt text.

## 4. UI

- `globals.css` gains the missing shared classes: `table`, `badge` (+ success/info/warning/error/ghost tones using existing tokens), `select`, `textarea`. The modal is a React component and stat tiles are plain `card`s.
- Lucide icons are mapped to Ionicons.
- Sidebar active state is derived from `usePathname()`.

## 5. Monitoring, config, security

- `@sentry/react` becomes `@sentry/nextjs`; DSN and replay sample rate are `NEXT_PUBLIC_SENTRY_DSN` and `NEXT_PUBLIC_SENTRY_REPLAY_SESSION_SAMPLE_RATE`. Sentry is skipped when no DSN is set, and it is loaded lazily from the admin shell (not `instrumentation-client.ts`) so the storefront bundle does not grow.
- `securityHeaders.ts` adds Sentry's ingest origin (from the DSN) to `connect-src`.
- Env mapping: `VITE_CLERK_PUBLISHABLE_KEY` -> `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `VITE_API_URL` -> `NEXT_PUBLIC_API_URL`. `.env.example` and README updated.
- Backend `CLIENT_URL` already needs the web origin for CORS; no change.

## 6. Tests

- Unit: API client FormData and `patch`; admin utils; access gate (403 shows the no-access screen); middleware matcher includes `/admin`; security headers include the Sentry origin.
- Existing 56 unit tests and 5 e2e tests keep passing after the `(store)` move.

## 7. Retirement (separate, last commit, only after the user confirms)

- Delete `admin/`.
- Remove the `admin/dist` static serving and catch-all from `backend/src/server.js`.
- Update root `package.json` scripts and README.

## Out of scope

- Redesigning admin features, pagination or search, new admin capabilities.
- Changing backend endpoints or admin authorization (`ADMIN_EMAIL` check stays).
- Deployment restructuring on Sevalla (follows once the admin is confirmed).
