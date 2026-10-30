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

## Design system

Adapted from `mobile/` (see `docs/superpowers/specs/2026-10-30-web-design-system-design.md`). Dark mode is the mobile palette; light mode follows the OS setting.

- Colors live as CSS variables in `src/app/globals.css` and are exposed to Tailwind with the same names as mobile (`bg-surface`, `text-text-secondary`, `bg-primary`). Use `text-primary-text` for green text (it is darker in light mode) and `text-on-primary` on green fills.
- Shared classes: `card`, `btn-primary`, `btn-secondary`, `icon-btn`, `icon-btn-primary`, `input`, `chip`.
- Icons are Ionicons via `react-icons/io5`. Category artwork is in `public/categories/`.
- Clerk and toast colors read the same CSS variables, so they follow the mode too.

## Notes

- Public pages call `GET /api/public/*` on the backend and are cached with ISR (60s).
- Cart, checkout and account pages are client-side and call the authenticated API with the Clerk token.
- `src/lib/pricing.ts` mirrors `backend/src/lib/pricing.js` (shipping and tax). The server is authoritative; keep both in sync.
- `src/pages/500.tsx` exists only because App Router error boundaries don't cover a failed first render of an ISR route.
- Deploy separately (e.g. Vercel) with the same env vars as `.env.example`.
