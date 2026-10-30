# Web Design System (adapted from mobile)

Date: 2026-10-30

## Goal

Make the `web/` storefront look and feel like the `mobile/` app: same palette, shapes, type and icons, adapted to a browser layout. Visual change only; routes, data flow, SEO and tests are unchanged.

## Source of truth (mobile)

- Palette (`mobile/tailwind.config.js`): background `#121212`, surface `#282828`, primary `#1DB954`, text `#FFF` / `#B3B3B3` / `#6A6A6A`, star `#FFC107`, red `#F44336`.
- Shapes: `rounded-3xl` cards, `rounded-2xl` inputs and primary buttons, pill chips, circular icon buttons.
- Icons: Ionicons. Category artwork: electronics, fashion, sports, books.

## Decisions

- **Dark and light, following the OS** (`prefers-color-scheme`). Dark uses the mobile palette exactly. Light is a new palette with the same green.
- **Tokens:** CSS variables on `:root`, mapped into Tailwind v4 via `@theme inline`, using the same names as mobile (`bg-surface`, `text-text-secondary`, `bg-primary`). Additions needed for light mode:
  - `primary-text`: green used for text. `#1DB954` on dark, a darker green on light (the brand green fails contrast on white).
  - `on-primary`: text on green fills, `#121212` in both modes.
  - `line`: card and input borders (mobile has none on dark).
- **Icons:** `react-icons/io5` (Ionicons 5, the set mobile uses).
- **Category images:** mobile's artwork, downscaled to 192px, in `web/public/categories/`.
- **Navigation:** sticky blurred top bar instead of the floating tab bar. Same destinations and icons, green active state, cart badge.
- **Third-party UI:** Clerk components and sonner toasts are themed with the same CSS variables so they follow the mode.
- **Not carried over:** the wishlist heart (wishlist is not in v1), and the exact stock count (the public API hides `stock`).

## Shared classes

`card`, `btn-primary`, `btn-secondary`, `icon-btn`, `icon-btn-primary`, `input`, `chip` defined once in `globals.css` so screens do not repeat long class strings.

## Verification

Screenshots of each screen in dark and light via Playwright, plus the existing unit and e2e tests.
