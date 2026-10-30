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
- `src/pages/500.tsx` exists only because App Router error boundaries don't cover a failed first render of an ISR route.
- Deploy separately (e.g. Vercel) with the same env vars as `.env.example`.
