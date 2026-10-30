# Web storefront

SEO-focused customer storefront and admin dashboard: Next.js (App Router), Clerk, Paystack.

## Setup

1. `cp .env.example .env.local` and fill in the Clerk keys (same Clerk app as `backend/` and `mobile/`).
2. Backend `.env` needs:
   - `CLIENT_URL` including this app's origin, comma-separated (e.g. `http://localhost:5173,http://localhost:3000`)
   - `WEB_URL` = this app's public URL (Paystack returns the customer here)
   - `PAYSTACK_SECRET_KEY` (use a test key locally)
3. `npm install && npm run dev` (http://localhost:3000)

## Admin

The admin dashboard lives at `/admin` (dashboard, products, orders, customers). It uses the same Clerk app as the storefront and calls `/api/admin/*`; the backend only allows the user whose email is `ADMIN_EMAIL`. Other signed-in users see a "You don't have access" screen. `/admin` is noindex and disallowed in `robots.txt`.

Env mapping from the old Vite admin: `VITE_CLERK_PUBLISHABLE_KEY` -> `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `VITE_API_URL` -> `NEXT_PUBLIC_API_URL`, `VITE_SENTRY_DSN` -> `NEXT_PUBLIC_SENTRY_DSN`, `VITE_SENTRY_REPLAY_SESSION_SAMPLE_RATE` -> `NEXT_PUBLIC_SENTRY_REPLAY_SESSION_SAMPLE_RATE`.

## Scripts

- `npm test` unit tests (Vitest)
- `npm run test:e2e` Playwright smoke test (builds the app; uses a fake API)
- `npm run typecheck`, `npm run lint`

## Security

- `next.config.ts` sends security headers built by `src/lib/securityHeaders.ts`: a Content-Security-Policy, `X-Frame-Options: DENY`, `nosniff`, a referrer policy, a permissions policy, and HSTS in production.
- The CSP allows Clerk by reading its host from `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, and the API from `NEXT_PUBLIC_API_URL`. If you add another third-party script, image host or API, add it to that file or the browser will block it (check the console for "Content Security Policy" errors).
- Scripts allow `'unsafe-inline'` because Next.js emits inline bootstrap code; a per-request nonce would tighten this.
- Backend (`backend/.env`): set `TRUST_PROXY=1` when deployed behind one reverse proxy (Render, Heroku, nginx), otherwise rate limiting sees every user as the proxy's IP.

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
- Sentry is loaded only inside `/admin` (lazily, so the storefront bundle stays small) and only when `NEXT_PUBLIC_SENTRY_DSN` is set; its ingest host is added to the CSP from that DSN.
