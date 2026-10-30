# Admin inside the web app Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Serve the admin dashboard from the Next.js app under `/admin`, built on the web design system, so the web app hosts both storefront and admin.

**Architecture:** Storefront pages move into a `(store)` route group so the storefront header no longer wraps `/admin`. `/admin/*` gets its own layout (sidebar, top bar, access gate) and four client pages that call the existing `/api/admin/*` endpoints through the web app's authenticated API client. The old `admin/` Vite app is left untouched.

**Tech Stack:** Next.js 15 App Router, TypeScript, Tailwind v4 (tokens in `globals.css`), Clerk (`@clerk/nextjs`), TanStack Query, sonner, `react-icons/io5`, Vitest + RTL, Playwright, `@sentry/nextjs`.

Spec: `docs/superpowers/specs/2026-10-30-admin-in-web-design.md`

## Global Constraints

- All work happens in `web/` (paths below are relative to `web/` unless they start with `docs/`). Run commands from `web/`.
- Do **not** modify or delete `admin/` or `backend/` in this plan. Retirement is a separate step after the user has tested the new admin.
- No new UI library. No daisyUI, no lucide. Icons come from `react-icons/io5`; toasts from `sonner`.
- Style only with the tokens/classes in `src/app/globals.css` (`card`, `btn-primary`, `btn-secondary`, `icon-btn`, `input`, `chip`, plus those added in Task 4). Both light and dark must work with no per-mode code.
- Money uses `formatPrice` (`src/lib/format.ts`) and dates use `formatDate` from the same file. This replaces the old admin's hardcoded `$`.
- Admin pages are noindex and `/admin` is never in the sitemap.
- Existing tests (56 unit, 5 e2e) must keep passing after every task.
- Commit after each task. Do not push.
- Observed, out of scope: the admin orders list shows unpaid `pending` orders (the storefront hides them). That is existing admin behavior; leave it.

## File structure

| File | Responsibility |
|---|---|
| `src/components/StoreChrome.tsx` (new) | Storefront header + page wrapper, shared by `(store)/layout.tsx` and `not-found.tsx` |
| `src/app/(store)/**` (moved) | Existing storefront pages, URLs unchanged |
| `src/lib/api/client.ts` (modify) | Send `FormData` untouched; add `patch` |
| `src/lib/admin/types.ts` (new) | `AdminStats`, `Customer`, `OrderStatus`, `ORDER_STATUSES` |
| `src/lib/admin/utils.ts` (new) | Status tones, `capitalizeText`, `getErrorMessage`, `PRODUCT_CATEGORIES` |
| `src/lib/admin/api.ts` (new) | `useAdminApi()` hook: typed admin endpoints over `useApi()` |
| `src/app/globals.css` (modify) | `table`, `badge*`, `select`, `textarea` classes |
| `src/components/admin/{Badge,Modal,nav,AdminGate,AdminShell,ProductFormModal,DeleteProductModal}.tsx` (new) | Admin UI pieces |
| `src/app/admin/**` (new) | Layout, redirect, error, four pages |
| `src/lib/protectedRoutes.ts` (new), `src/middleware.ts`, `src/app/robots.ts` (modify) | Protect and hide `/admin` |
| `src/instrumentation-client.ts` (new), `src/lib/securityHeaders.ts`, `next.config.ts` (modify) | Sentry + CSP |

---

### Task 1: Branch and `(store)` route group

**Files:**
- Create: `src/components/StoreChrome.tsx`, `src/app/(store)/layout.tsx`
- Move into `src/app/(store)/`: `page.tsx`, `error.tsx`, `account/`, `cart/`, `checkout/`, `products/`, `sign-in/`, `sign-up/`
- Modify: `src/app/layout.tsx`, `src/app/not-found.tsx`

**Interfaces:**
- Produces: `StoreChrome({children})` used by Task 1 only; later tasks never touch the storefront chrome.

- [ ] **Step 1: Confirm the branch and record the baseline**

The branch `feature/web-admin` already exists (created from `feature/web-storefront`).

```bash
git branch --show-current   # feature/web-admin
cd web && npm test && npm run typecheck && npm run lint
```
Expected: 56 tests pass, typecheck and lint clean.

- [ ] **Step 2: Move the storefront pages (URLs do not change)**

```bash
cd src/app && mkdir "(store)"
git mv page.tsx error.tsx account cart checkout products sign-in sign-up "(store)/"
```
`layout.tsx`, `not-found.tsx`, `globals.css`, `robots.ts`, `sitemap.ts`, `icon.svg`, `apple-icon.png`, `favicon.ico` stay at `src/app/`.

- [ ] **Step 3: Create `src/components/StoreChrome.tsx`**

```tsx
import {Header} from "@/components/Header";

// Header and page wrapper for storefront pages. The admin has its own chrome.
export function StoreChrome({children}: {children: React.ReactNode}) {
  return (
    <>
      <Header />
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">{children}</main>
    </>
  );
}
```

- [ ] **Step 4: Create `src/app/(store)/layout.tsx`**

```tsx
import {StoreChrome} from "@/components/StoreChrome";

export default function StoreLayout({children}: {children: React.ReactNode}) {
  return <StoreChrome>{children}</StoreChrome>;
}
```

- [ ] **Step 5: Slim the root layout** — in `src/app/layout.tsx` remove the `Header` import and replace the body contents:

```tsx
          <Providers>{children}</Providers>
```
(delete the `<Header />` and `<main ...>` lines; keep `<body className="min-h-screen">`).

- [ ] **Step 6: Wrap the global 404 in the storefront chrome** — `src/app/not-found.tsx` is the only handler for unknown URLs and for `notFound()` in product pages, so it must render its own header:

```tsx
import Link from "next/link";
import {IoAlertCircleOutline} from "react-icons/io5";
import {StateMessage} from "@/components/StateMessage";
import {StoreChrome} from "@/components/StoreChrome";

export default function NotFound() {
  return (
    <StoreChrome>
      <StateMessage
        icon={IoAlertCircleOutline}
        tone="error"
        title="Page not found"
        description="That page doesn't exist or is no longer available."
      >
        <Link href="/products" className="btn-primary">
          Browse products
        </Link>
      </StateMessage>
    </StoreChrome>
  );
}
```

- [ ] **Step 7: Verify nothing changed for the storefront**

Run: `npm run typecheck && npm test && npm run lint && npm run test:e2e`
Expected: all pass (56 unit, 5 e2e, including the real 404 test).

- [ ] **Step 8: Commit**

```bash
git add -A && git commit -m "Move storefront pages into a (store) route group"
```

---

### Task 2: API client sends FormData and supports PATCH

**Files:**
- Modify: `src/lib/api/client.ts`
- Test: `src/lib/api/client.test.ts`

**Interfaces:**
- Produces: `createApiClient(...)` now returns `{get, post, put, patch, delete}`; `post`/`put`/`patch` accept a `FormData` body and send it without a JSON content type.

- [ ] **Step 1: Write the failing tests** — append inside the existing `describe("createApiClient", ...)` in `src/lib/api/client.test.ts`:

```ts
  it("sends FormData as-is without a JSON content type", async () => {
    const fetchImpl = respond({});
    const api = createApiClient({
      baseUrl: "http://api",
      getToken: async () => "tok",
      fetchImpl
    });
    const form = new FormData();
    form.append("name", "Shoe");

    await api.post("/admin/products", form);

    const [, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    const headers = init.headers as Record<string, string>;
    expect(init.body).toBe(form);
    expect(headers["Content-Type"]).toBeUndefined();
    expect(headers.Authorization).toBe("Bearer tok");
  });

  it("supports PATCH with a JSON body", async () => {
    const fetchImpl = respond({});
    const api = createApiClient({
      baseUrl: "http://api",
      getToken: async () => null,
      fetchImpl
    });

    await api.patch("/admin/orders/o1/status", {status: "shipped"});

    const [, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(init.method).toBe("PATCH");
    expect(init.body).toBe(JSON.stringify({status: "shipped"}));
    expect((init.headers as Record<string, string>)["Content-Type"]).toBe(
      "application/json"
    );
  });
```

- [ ] **Step 2: Run to verify they fail**

Run: `npx vitest run src/lib/api/client.test.ts`
Expected: FAIL (`api.patch is not a function`; FormData body is stringified).

- [ ] **Step 3: Implement** — in `src/lib/api/client.ts` replace the header/body lines in `request`:

```ts
    const token = await getToken();
    const isForm = typeof FormData !== "undefined" && body instanceof FormData;
    const headers: Record<string, string> = {};
    // fetch sets the multipart boundary itself, so FormData gets no content type.
    if (body !== undefined && !isForm) headers["Content-Type"] = "application/json";
    if (token) headers.Authorization = `Bearer ${token}`;

    const res = await fetchImpl(`${baseUrl}${path}`, {
      method,
      headers,
      body:
        body === undefined
          ? undefined
          : isForm
            ? (body as FormData)
            : JSON.stringify(body)
    });
```
and add to the returned object, after `put`:

```ts
    patch: <T>(path: string, body?: unknown) => request<T>(path, "PATCH", body ?? {}),
```

- [ ] **Step 4: Run to verify they pass**

Run: `npx vitest run src/lib/api/client.test.ts && npm run typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/api && git commit -m "Let the API client send FormData and PATCH"
```

---

### Task 3: Admin types, utils and API hook

**Files:**
- Create: `src/lib/admin/types.ts`, `src/lib/admin/utils.ts`, `src/lib/admin/api.ts`
- Test: `src/lib/admin/utils.test.ts`

**Interfaces:**
- Consumes: `Order`, `Product` from `@/lib/types`; `useApi` from `@/lib/api/useApi`; `ApiError` from `@/lib/api/client`.
- Produces:
  - `type OrderStatus`, `ORDER_STATUSES`, `AdminStats`, `Customer` (types.ts)
  - `type BadgeTone = "success" | "info" | "warning" | "error" | "ghost"`, `capitalizeText(text)`, `orderStatusTone(status?)`, `stockStatus(stock) => {text, tone}`, `getErrorMessage(error, fallback?)`, `PRODUCT_CATEGORIES` (utils.ts)
  - `useAdminApi()` returning `{ready, products: {list, create, update, remove}, orders: {list, updateStatus}, stats: {dashboard}, customers: {list}}` (api.ts). `ready` is Clerk's `isSignedIn`; queries must use `enabled: ready`.

- [ ] **Step 1: Write the failing utils test** — `src/lib/admin/utils.test.ts`:

```ts
import {describe, expect, it} from "vitest";
import {ApiError} from "@/lib/api/client";
import {
  capitalizeText,
  getErrorMessage,
  orderStatusTone,
  stockStatus
} from "./utils";

describe("capitalizeText", () => {
  it("uppercases the first letter", () => {
    expect(capitalizeText("pending")).toBe("Pending");
    expect(capitalizeText("")).toBe("");
  });
});

describe("orderStatusTone", () => {
  it("maps order statuses to badge tones", () => {
    expect(orderStatusTone("delivered")).toBe("success");
    expect(orderStatusTone("shipped")).toBe("info");
    expect(orderStatusTone("pending")).toBe("warning");
    expect(orderStatusTone("other")).toBe("ghost");
    expect(orderStatusTone(undefined)).toBe("ghost");
  });
});

describe("stockStatus", () => {
  it("flags out of stock, low stock and in stock", () => {
    expect(stockStatus(0)).toEqual({text: "Out of Stock", tone: "error"});
    expect(stockStatus(19)).toEqual({text: "Low Stock", tone: "warning"});
    expect(stockStatus(20)).toEqual({text: "In Stock", tone: "success"});
  });
});

describe("getErrorMessage", () => {
  it("uses the error message, else the fallback", () => {
    expect(getErrorMessage(new ApiError(400, "Bad input"), "x")).toBe("Bad input");
    expect(getErrorMessage(new Error(""), "fallback")).toBe("fallback");
    expect(getErrorMessage("boom", "fallback")).toBe("fallback");
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/lib/admin/utils.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 3: Create `src/lib/admin/types.ts`**

```ts
import type {Order} from "@/lib/types";

export type OrderStatus = Order["status"];

export const ORDER_STATUSES: OrderStatus[] = ["pending", "shipped", "delivered"];

export interface AdminStats {
  totalRevenue: number;
  totalOrders: number;
  totalCustomers: number;
  totalProducts: number;
}

export interface Customer {
  _id: string;
  name: string;
  email: string;
  imageUrl: string;
  addresses?: unknown[];
  wishlist?: unknown[];
  createdAt: string;
}
```

- [ ] **Step 4: Create `src/lib/admin/utils.ts`**

```ts
export type BadgeTone = "success" | "info" | "warning" | "error" | "ghost";

export const PRODUCT_CATEGORIES = [
  "Electronics",
  "Accessories",
  "Fashion",
  "Sports"
];

export const capitalizeText = (text: string) =>
  text ? text.charAt(0).toUpperCase() + text.slice(1) : text;

export function orderStatusTone(status?: string): BadgeTone {
  switch (status?.toLowerCase()) {
    case "delivered":
      return "success";
    case "shipped":
      return "info";
    case "pending":
      return "warning";
    default:
      return "ghost";
  }
}

export function stockStatus(stock: number): {text: string; tone: BadgeTone} {
  if (stock === 0) return {text: "Out of Stock", tone: "error"};
  if (stock < 20) return {text: "Low Stock", tone: "warning"};
  return {text: "In Stock", tone: "success"};
}

// ApiError already carries the server's `message`/`error` text.
export const getErrorMessage = (error: unknown, fallback = "Something went wrong") =>
  error instanceof Error && error.message ? error.message : fallback;
```

- [ ] **Step 5: Create `src/lib/admin/api.ts`**

```ts
"use client";

import {useMemo} from "react";
import {useAuth} from "@clerk/nextjs";
import {useApi} from "@/lib/api/useApi";
import type {Order, Product} from "@/lib/types";
import type {AdminStats, Customer, OrderStatus} from "./types";

// Endpoints under /api/admin. The backend's adminOnly check is the real gate.
export function useAdminApi() {
  const api = useApi();
  const {isSignedIn} = useAuth();

  return useMemo(
    () => ({
      ready: Boolean(isSignedIn),
      products: {
        list: () => api.get<Product[]>("/admin/products"),
        create: (form: FormData) => api.post<Product>("/admin/products", form),
        update: ({id, form}: {id: string; form: FormData}) =>
          api.put<Product>(`/admin/products/${id}`, form),
        remove: (id: string) =>
          api.delete<{message: string}>(`/admin/products/${id}`)
      },
      orders: {
        list: () => api.get<{orders: Order[]}>("/admin/orders"),
        updateStatus: ({orderId, status}: {orderId: string; status: OrderStatus}) =>
          api.patch<{message: string}>(`/admin/orders/${orderId}/status`, {status})
      },
      stats: {
        dashboard: () => api.get<AdminStats>("/admin/stats")
      },
      customers: {
        list: () => api.get<{customers: Customer[]}>("/admin/customers")
      }
    }),
    [api, isSignedIn]
  );
}
```

- [ ] **Step 6: Run to verify they pass**

Run: `npx vitest run src/lib/admin && npm run typecheck`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/lib/admin && git commit -m "Add admin types, helpers and API hook"
```

---

### Task 4: Shared table, badge, select and textarea styles

**Files:**
- Modify: `src/app/globals.css`, `docs/superpowers/specs/2026-10-30-admin-in-web-design.md`
- Create: `src/components/admin/Badge.tsx`

**Interfaces:**
- Produces: CSS classes `table`, `badge` + `badge-success|info|warning|error|ghost`, `select`, `select-sm`, `textarea`; `<Badge tone={BadgeTone}>`.

- [ ] **Step 1: Add the classes** — in `src/app/globals.css`, inside the existing `@layer components { ... }` block (after `.chip-active`):

```css
  .select {
    @apply w-full rounded-2xl border border-line bg-surface px-4 py-3 text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50;
  }

  .select-sm {
    @apply w-auto px-3 py-1.5 text-sm;
  }

  .textarea {
    @apply w-full rounded-2xl border border-line bg-surface px-5 py-4 text-text-primary placeholder:text-text-tertiary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary;
  }

  .table {
    @apply w-full text-left text-sm;
  }

  .table th {
    @apply whitespace-nowrap border-b border-line px-4 py-3 text-xs font-semibold uppercase tracking-wide text-text-tertiary;
  }

  .table td {
    @apply border-b border-line px-4 py-3 align-middle;
  }

  .table tbody tr:last-child td {
    @apply border-b-0;
  }

  .badge {
    @apply inline-flex items-center whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold;
  }

  .badge-success {
    @apply bg-primary/20 text-primary-text;
  }

  .badge-info {
    @apply bg-background-lighter text-text-primary;
  }

  .badge-warning {
    @apply bg-accent-yellow/20 text-text-primary;
  }

  .badge-error {
    @apply bg-accent-red/15 text-accent-red;
  }

  .badge-ghost {
    @apply border border-line text-text-secondary;
  }
```

- [ ] **Step 2: Create `src/components/admin/Badge.tsx`**

```tsx
import type {BadgeTone} from "@/lib/admin/utils";

export function Badge({
  tone,
  children
}: {
  tone: BadgeTone;
  children: React.ReactNode;
}) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}
```

- [ ] **Step 3: Align the spec with this decision** — in `docs/superpowers/specs/2026-10-30-admin-in-web-design.md` section 4, replace the `globals.css` bullet with:

```
- `globals.css` gains the missing shared classes: `table`, `badge` (+ success/info/warning/error/ghost tones using existing tokens), `select`, `textarea`. The modal is a React component and stat tiles are plain `card`s.
```

- [ ] **Step 4: Verify the CSS compiles**

Run: `npm run typecheck && npx next build`
Expected: build succeeds. (Visual check happens in Task 9.)

- [ ] **Step 5: Commit**

```bash
git add src/app/globals.css src/components/admin/Badge.tsx docs && git commit -m "Add table, badge, select and textarea styles"
```

---

### Task 5: Admin shell, access gate, route protection

**Files:**
- Create: `src/components/admin/nav.ts`, `src/components/admin/AdminGate.tsx`, `src/components/admin/AdminShell.tsx`, `src/app/admin/layout.tsx`, `src/app/admin/page.tsx`, `src/app/admin/error.tsx`, `src/lib/protectedRoutes.ts`
- Modify: `src/middleware.ts`, `src/app/robots.ts`, `e2e/storefront.spec.ts`
- Test: `src/components/admin/AdminGate.test.tsx`, `src/lib/protectedRoutes.test.ts`

**Interfaces:**
- Consumes: `useAdminApi` (Task 3), `ApiError`, `StateMessage`/`Spinner`.
- Produces: `ADMIN_NAV: {name, href, icon}[]`; `<AdminGate>` (renders children once `/admin/stats` succeeds or fails with a non-403, a no-access screen on 403); `<AdminShell>`; `PROTECTED_ROUTES`.
- The gate and pages share the TanStack query key `["dashboardStats"]`, so `/admin/stats` is requested once.

- [ ] **Step 1: Write the failing gate test** — `src/components/admin/AdminGate.test.tsx`:

```tsx
import {render, screen} from "@testing-library/react";
import {QueryClient, QueryClientProvider} from "@tanstack/react-query";
import {describe, expect, it, vi} from "vitest";
import {ApiError} from "@/lib/api/client";
import {AdminGate} from "./AdminGate";

const dashboard = vi.fn();

vi.mock("@/lib/admin/api", () => ({
  useAdminApi: () => ({ready: true, stats: {dashboard}})
}));

const renderGate = () =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <AdminGate>
        <p>secret admin content</p>
      </AdminGate>
    </QueryClientProvider>
  );

describe("AdminGate", () => {
  it("shows the pages once the stats request succeeds", async () => {
    dashboard.mockResolvedValue({totalOrders: 1});
    renderGate();

    expect(await screen.findByText("secret admin content")).toBeInTheDocument();
  });

  it("shows a no-access screen on 403", async () => {
    dashboard.mockRejectedValue(new ApiError(403, "Forbidden - admin access only"));
    renderGate();

    expect(await screen.findByText("You don't have access")).toBeInTheDocument();
    expect(screen.queryByText("secret admin content")).not.toBeInTheDocument();
    expect(screen.getByRole("link", {name: "Back to the store"})).toHaveAttribute(
      "href",
      "/"
    );
  });

  it("still shows the pages on other errors so they can report them", async () => {
    dashboard.mockRejectedValue(new ApiError(500, "Internal server error"));
    renderGate();

    expect(await screen.findByText("secret admin content")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/components/admin/AdminGate.test.tsx`
Expected: FAIL (module not found).

- [ ] **Step 3: Create `src/components/admin/AdminGate.tsx`**

```tsx
"use client";

import Link from "next/link";
import {useQuery} from "@tanstack/react-query";
import {IoLockClosedOutline} from "react-icons/io5";
import {Spinner, StateMessage} from "@/components/StateMessage";
import {useAdminApi} from "@/lib/admin/api";
import {ApiError} from "@/lib/api/client";

// One cheap admin request decides whether to show the admin at all. The
// dashboard page reads the same query key, so it isn't fetched twice.
export function AdminGate({children}: {children: React.ReactNode}) {
  const api = useAdminApi();
  const {isPending, error} = useQuery({
    queryKey: ["dashboardStats"],
    enabled: api.ready,
    retry: false,
    queryFn: api.stats.dashboard
  });

  if (isPending) return <Spinner label="Loading..." />;

  if (error instanceof ApiError && error.status === 403) {
    return (
      <StateMessage
        icon={IoLockClosedOutline}
        tone="error"
        title="You don't have access"
        description="This area is only for store administrators."
      >
        <Link href="/" className="btn-primary">
          Back to the store
        </Link>
      </StateMessage>
    );
  }

  return <>{children}</>;
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run src/components/admin/AdminGate.test.tsx`
Expected: PASS (3 tests). Note: `isPending` is also true while `enabled` is false, which is correct (spinner until Clerk reports signed in).

- [ ] **Step 5: Create `src/components/admin/nav.ts`**

```ts
import type {IconType} from "react-icons";
import {
  IoCubeOutline,
  IoHomeOutline,
  IoPeopleOutline,
  IoReceiptOutline
} from "react-icons/io5";

export const ADMIN_NAV: {name: string; href: string; icon: IconType}[] = [
  {name: "Dashboard", href: "/admin/dashboard", icon: IoHomeOutline},
  {name: "Products", href: "/admin/products", icon: IoCubeOutline},
  {name: "Orders", href: "/admin/orders", icon: IoReceiptOutline},
  {name: "Customers", href: "/admin/customers", icon: IoPeopleOutline}
];
```

- [ ] **Step 6: Create `src/components/admin/AdminShell.tsx`**

```tsx
"use client";

import Link from "next/link";
import {usePathname} from "next/navigation";
import {useEffect, useState} from "react";
import {UserButton, useUser} from "@clerk/nextjs";
import {IoBagHandle, IoMenu, IoStorefrontOutline} from "react-icons/io5";
import {AdminGate} from "./AdminGate";
import {ADMIN_NAV} from "./nav";

export function AdminShell({children}: {children: React.ReactNode}) {
  const pathname = usePathname() ?? "";
  const {user} = useUser();
  const [open, setOpen] = useState(false);
  const title = ADMIN_NAV.find((item) => pathname.startsWith(item.href))?.name ?? "Admin";

  // Close the mobile drawer after navigating.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <div className="min-h-screen">
      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={() => setOpen(false)}
          aria-hidden
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-line bg-background-light transition-transform lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center gap-3 p-4">
          <span className="flex size-10 items-center justify-center rounded-xl bg-primary text-on-primary">
            <IoBagHandle size={24} />
          </span>
          <span className="text-xl font-bold">Admin</span>
        </div>

        <nav aria-label="Admin" className="flex-1 space-y-1 px-3">
          {ADMIN_NAV.map(({name, href, icon: Icon}) => {
            const active = pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition ${
                  active
                    ? "bg-primary text-on-primary"
                    : "text-text-secondary hover:bg-surface-light hover:text-text-primary"
                }`}
              >
                <Icon size={20} />
                {name}
              </Link>
            );
          })}

          <Link
            href="/"
            className="flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold text-text-secondary transition hover:bg-surface-light hover:text-text-primary"
          >
            <IoStorefrontOutline size={20} />
            View store
          </Link>
        </nav>

        <div className="flex items-center gap-3 border-t border-line p-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={user?.imageUrl}
            alt=""
            className="size-10 shrink-0 rounded-full bg-surface-light"
          />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">
              {user?.firstName} {user?.lastName}
            </p>
            <p className="truncate text-xs text-text-tertiary">
              {user?.primaryEmailAddress?.emailAddress}
            </p>
          </div>
        </div>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-line bg-background/80 px-4 py-3 backdrop-blur-xl">
          <button
            type="button"
            className="icon-btn lg:hidden"
            onClick={() => setOpen(true)}
            aria-label="Open menu"
          >
            <IoMenu size={20} />
          </button>
          <h1 className="flex-1 text-xl font-bold">{title}</h1>
          <UserButton />
        </header>

        <main className="p-4 sm:p-6">
          <AdminGate>{children}</AdminGate>
        </main>
      </div>
    </div>
  );
}
```

- [ ] **Step 7: Create the admin routes**

`src/app/admin/layout.tsx`:
```tsx
import type {Metadata} from "next";
import {AdminShell} from "@/components/admin/AdminShell";

export const metadata: Metadata = {
  title: {default: "Admin", template: "%s | Admin"},
  robots: {index: false, follow: false}
};

export default function AdminLayout({children}: {children: React.ReactNode}) {
  return <AdminShell>{children}</AdminShell>;
}
```

`src/app/admin/page.tsx`:
```tsx
import {redirect} from "next/navigation";

export default function AdminIndex() {
  redirect("/admin/dashboard");
}
```

`src/app/admin/error.tsx`:
```tsx
"use client";

import {IoAlertCircleOutline} from "react-icons/io5";
import {StateMessage} from "@/components/StateMessage";

export default function AdminError({reset}: {error: Error; reset: () => void}) {
  return (
    <StateMessage
      icon={IoAlertCircleOutline}
      tone="error"
      title="Something went wrong"
      description="This admin page failed to load."
    >
      <button onClick={reset} className="btn-primary">
        Try again
      </button>
    </StateMessage>
  );
}
```

- [ ] **Step 8: Protect and hide `/admin`**

Create `src/lib/protectedRoutes.ts`:
```ts
// Routes that require a signed-in user (the middleware redirects to sign-in).
export const PROTECTED_ROUTES = [
  "/cart(.*)",
  "/checkout(.*)",
  "/account(.*)",
  "/admin(.*)"
];
```

Replace the top of `src/middleware.ts`:
```ts
import {clerkMiddleware, createRouteMatcher} from "@clerk/nextjs/server";
import {PROTECTED_ROUTES} from "./lib/protectedRoutes";

const isProtected = createRouteMatcher(PROTECTED_ROUTES);
```
(keep the `export default clerkMiddleware(...)` and `config` as they are).

In `src/app/robots.ts` change `disallow` to:
```ts
        disallow: ["/cart", "/checkout", "/account", "/admin", "/sign-in", "/sign-up"]
```

- [ ] **Step 9: Test the protected route list** — `src/lib/protectedRoutes.test.ts`:

```ts
// @vitest-environment node
import {createRouteMatcher} from "@clerk/nextjs/server";
import {NextRequest} from "next/server";
import {describe, expect, it} from "vitest";
import {PROTECTED_ROUTES} from "./protectedRoutes";

const isProtected = createRouteMatcher(PROTECTED_ROUTES);
const req = (path: string) => new NextRequest(`http://localhost${path}`);

describe("PROTECTED_ROUTES", () => {
  it("protects the admin and its sub-pages", () => {
    expect(isProtected(req("/admin"))).toBe(true);
    expect(isProtected(req("/admin/products"))).toBe(true);
  });

  it("keeps the storefront browsing pages public", () => {
    expect(isProtected(req("/"))).toBe(false);
    expect(isProtected(req("/products"))).toBe(false);
    expect(isProtected(req("/products/123"))).toBe(false);
  });
});
```
Run: `npx vitest run src/lib/protectedRoutes.test.ts`. Expected: PASS. If importing `@clerk/nextjs/server` fails under the node environment, delete this test file; the e2e test in the next step covers the same behavior.

- [ ] **Step 10: e2e coverage** — in `e2e/storefront.spec.ts` add `expect(robots).toContain("Disallow: /admin");` after the `Disallow: /cart` line in the sitemap/robots test, and append:

```ts
test("admin requires sign-in", async ({page}) => {
  await page.goto("/admin/products");
  await expect(page).toHaveURL(/sign-in/);
});
```

- [ ] **Step 11: Verify**

Run: `npm test && npm run typecheck && npm run lint && npm run test:e2e`
Expected: all pass. (`/admin/dashboard` etc. don't exist yet; the shell links to them but nothing requests them.)

- [ ] **Step 12: Commit**

```bash
git add -A && git commit -m "Add the admin shell, access gate and route protection"
```

---

### Task 6: Dashboard, Orders and Customers pages

**Files:**
- Create: `src/app/admin/dashboard/page.tsx`, `src/app/admin/orders/page.tsx`, `src/app/admin/customers/page.tsx`

**Interfaces:**
- Consumes: `useAdminApi`, `Badge`, `orderStatusTone`, `capitalizeText`, `getErrorMessage`, `ORDER_STATUSES`, `formatPrice`, `formatDate`, `Spinner`, `StateMessage`.
- Query keys: `["dashboardStats"]`, `["customers"]`, and `["admin", "orders"]`. The orders key differs from the old admin's `["orders"]` because the storefront's `useOrders` already uses `["orders"]` with a different (filtered) shape, and both share one QueryClient.

- [ ] **Step 1: Create `src/app/admin/dashboard/page.tsx`**

```tsx
"use client";

import {useQuery} from "@tanstack/react-query";
import {
  IoBagHandleOutline,
  IoCashOutline,
  IoCubeOutline,
  IoPeopleOutline
} from "react-icons/io5";
import {Badge} from "@/components/admin/Badge";
import {Spinner} from "@/components/StateMessage";
import {useAdminApi} from "@/lib/admin/api";
import {capitalizeText, orderStatusTone} from "@/lib/admin/utils";
import {formatDate, formatPrice} from "@/lib/format";

export default function DashboardPage() {
  const api = useAdminApi();

  const {data: stats, isLoading: statsLoading} = useQuery({
    queryKey: ["dashboardStats"],
    enabled: api.ready,
    queryFn: api.stats.dashboard
  });

  const {data: ordersData, isLoading: ordersLoading} = useQuery({
    queryKey: ["admin", "orders"],
    enabled: api.ready,
    queryFn: api.orders.list
  });

  const recentOrders = ordersData?.orders.slice(0, 5) ?? [];

  const cards = [
    {
      name: "Total Revenue",
      value: statsLoading ? "..." : formatPrice(stats?.totalRevenue ?? 0),
      icon: IoCashOutline
    },
    {
      name: "Total Orders",
      value: statsLoading ? "..." : (stats?.totalOrders ?? 0),
      icon: IoBagHandleOutline
    },
    {
      name: "Total Customers",
      value: statsLoading ? "..." : (stats?.totalCustomers ?? 0),
      icon: IoPeopleOutline
    },
    {
      name: "Total Products",
      value: statsLoading ? "..." : (stats?.totalProducts ?? 0),
      icon: IoCubeOutline
    }
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map(({name, value, icon: Icon}) => (
          <div key={name} className="card flex items-center justify-between p-5">
            <div>
              <p className="text-sm text-text-secondary">{name}</p>
              <p className="mt-1 text-2xl font-bold">{value}</p>
            </div>
            <Icon size={32} className="text-primary-text" />
          </div>
        ))}
      </div>

      <div className="card p-5">
        <h2 className="mb-3 text-lg font-bold">Recent Orders</h2>

        {ordersLoading ? (
          <Spinner />
        ) : recentOrders.length === 0 ? (
          <p className="py-8 text-center text-text-secondary">No orders yet</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Order ID</th>
                  <th>Customer</th>
                  <th>Items</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.map((order) => (
                  <tr key={order._id}>
                    <td className="font-medium">
                      #{order._id.slice(-8).toUpperCase()}
                    </td>
                    <td>
                      <div className="font-medium">
                        {order.shippingAddress.fullName}
                      </div>
                      <div className="text-xs text-text-tertiary">
                        {order.orderItems.length} item(s)
                      </div>
                    </td>
                    <td>
                      {order.orderItems[0]?.name}
                      {order.orderItems.length > 1 &&
                        ` +${order.orderItems.length - 1} more`}
                    </td>
                    <td className="font-semibold">
                      {formatPrice(order.totalPrice)}
                    </td>
                    <td>
                      <Badge tone={orderStatusTone(order.status)}>
                        {capitalizeText(order.status)}
                      </Badge>
                    </td>
                    <td className="text-text-tertiary">
                      {formatDate(order.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create `src/app/admin/orders/page.tsx`**

```tsx
"use client";

import {useMutation, useQuery, useQueryClient} from "@tanstack/react-query";
import {toast} from "sonner";
import {Spinner} from "@/components/StateMessage";
import {useAdminApi} from "@/lib/admin/api";
import {ORDER_STATUSES, type OrderStatus} from "@/lib/admin/types";
import {capitalizeText, getErrorMessage} from "@/lib/admin/utils";
import {formatDate, formatPrice} from "@/lib/format";

export default function OrdersPage() {
  const api = useAdminApi();
  const queryClient = useQueryClient();

  const {data, isLoading} = useQuery({
    queryKey: ["admin", "orders"],
    enabled: api.ready,
    queryFn: api.orders.list
  });

  const updateStatus = useMutation({
    mutationFn: api.orders.updateStatus,
    onSuccess: (_, {status}) => {
      queryClient.invalidateQueries({queryKey: ["admin", "orders"]});
      queryClient.invalidateQueries({queryKey: ["dashboardStats"]});
      toast.success(`Order marked as ${status}`);
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, "Failed to update order status"));
    }
  });

  const orders = data?.orders ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Orders</h2>
        <p className="mt-1 text-text-secondary">Manage customer orders</p>
      </div>

      <div className="card p-5">
        {isLoading ? (
          <Spinner />
        ) : orders.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-xl font-semibold">No orders yet</p>
            <p className="mt-1 text-sm text-text-secondary">
              Orders will appear here once customers make a purchase.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Order ID</th>
                  <th>Customer</th>
                  <th>Items</th>
                  <th>Total</th>
                  <th>Status</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => {
                  const quantity = order.orderItems.reduce(
                    (sum, item) => sum + item.quantity,
                    0
                  );
                  const updating =
                    updateStatus.isPending &&
                    updateStatus.variables?.orderId === order._id;

                  return (
                    <tr key={order._id}>
                      <td className="font-medium">
                        #{order._id.slice(-8).toUpperCase()}
                      </td>
                      <td>
                        <div className="font-medium">
                          {order.shippingAddress.fullName}
                        </div>
                        <div className="text-xs text-text-tertiary">
                          {order.shippingAddress.city},{" "}
                          {order.shippingAddress.state}
                        </div>
                      </td>
                      <td>
                        <div className="font-medium">{quantity} items</div>
                        <div className="text-xs text-text-tertiary">
                          {order.orderItems[0]?.name}
                          {order.orderItems.length > 1 &&
                            ` +${order.orderItems.length - 1} more`}
                        </div>
                      </td>
                      <td className="font-semibold">
                        {formatPrice(order.totalPrice)}
                      </td>
                      <td>
                        <select
                          aria-label={`Status for order ${order._id.slice(-8)}`}
                          className="select select-sm"
                          value={order.status}
                          disabled={updating}
                          onChange={(e) =>
                            updateStatus.mutate({
                              orderId: order._id,
                              status: e.target.value as OrderStatus
                            })
                          }
                        >
                          {ORDER_STATUSES.map((status) => (
                            <option key={status} value={status}>
                              {capitalizeText(status)}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="text-text-tertiary">
                        {formatDate(order.createdAt)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create `src/app/admin/customers/page.tsx`**

```tsx
"use client";

/* eslint-disable @next/next/no-img-element */
import {useQuery} from "@tanstack/react-query";
import {Badge} from "@/components/admin/Badge";
import {Spinner} from "@/components/StateMessage";
import {useAdminApi} from "@/lib/admin/api";
import {formatDate} from "@/lib/format";

export default function CustomersPage() {
  const api = useAdminApi();

  const {data, isLoading} = useQuery({
    queryKey: ["customers"],
    enabled: api.ready,
    queryFn: api.customers.list
  });

  const customers = data?.customers ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Customers</h2>
        <p className="mt-1 text-text-secondary">
          {customers.length} {customers.length === 1 ? "customer" : "customers"}{" "}
          registered
        </p>
      </div>

      <div className="card p-5">
        {isLoading ? (
          <Spinner />
        ) : customers.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-xl font-semibold">No customers yet</p>
            <p className="mt-1 text-sm text-text-secondary">
              Customers will appear here once they sign up.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Email</th>
                  <th>Addresses</th>
                  <th>Wishlist</th>
                  <th>Joined</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((customer) => (
                  <tr key={customer._id}>
                    <td>
                      <div className="flex items-center gap-3">
                        <img
                          src={customer.imageUrl}
                          alt=""
                          className="size-10 rounded-full bg-surface-light"
                        />
                        <span className="font-semibold">{customer.name}</span>
                      </div>
                    </td>
                    <td>{customer.email}</td>
                    <td>
                      <Badge tone="ghost">
                        {customer.addresses?.length ?? 0} address(es)
                      </Badge>
                    </td>
                    <td>
                      <Badge tone="ghost">
                        {customer.wishlist?.length ?? 0} item(s)
                      </Badge>
                    </td>
                    <td className="text-text-tertiary">
                      {formatDate(customer.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Verify**

Run: `npm run typecheck && npm run lint && npm test`
Expected: clean.

- [ ] **Step 5: Commit**

```bash
git add src/app/admin && git commit -m "Add admin dashboard, orders and customers pages"
```

---

### Task 7: Products page with form and delete modals

**Files:**
- Create: `src/components/admin/Modal.tsx`, `src/components/admin/ProductFormModal.tsx`, `src/components/admin/DeleteProductModal.tsx`, `src/app/admin/products/page.tsx`
- Test: `src/components/admin/Modal.test.tsx`

**Interfaces:**
- Consumes: `useAdminApi().products`, `PRODUCT_CATEGORIES`, `stockStatus`, `getErrorMessage`, `Badge`, `CURRENCY`, `formatPrice`, `Product`.
- Produces: `<Modal title onClose closeDisabled? maxWidth?>`; `<ProductFormModal product={Product | null} onClose />` (mount with a `key` so state resets; `null` = create); `<DeleteProductModal product onClose />`.
- Query key `["products"]` for the admin list. Saving or deleting also invalidates `["dashboardStats"]`.

- [ ] **Step 1: Write the failing Modal test** — `src/components/admin/Modal.test.tsx`:

```tsx
import {render, screen} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {describe, expect, it, vi} from "vitest";
import {Modal} from "./Modal";

describe("Modal", () => {
  it("renders a labelled dialog and closes on Escape", async () => {
    const onClose = vi.fn();
    render(
      <Modal title="Add New Product" onClose={onClose}>
        <p>body</p>
      </Modal>
    );

    expect(
      screen.getByRole("dialog", {name: "Add New Product"})
    ).toBeInTheDocument();

    await userEvent.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("does not close while closing is disabled", async () => {
    const onClose = vi.fn();
    render(
      <Modal title="Saving" onClose={onClose} closeDisabled>
        <p>body</p>
      </Modal>
    );

    await userEvent.keyboard("{Escape}");
    await userEvent.click(screen.getByRole("button", {name: "Close"}));
    expect(onClose).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/components/admin/Modal.test.tsx`
Expected: FAIL (module not found).

- [ ] **Step 3: Create `src/components/admin/Modal.tsx`**

```tsx
"use client";

import {useEffect} from "react";
import {IoClose} from "react-icons/io5";

export function Modal({
  title,
  onClose,
  closeDisabled = false,
  maxWidth = "max-w-2xl",
  children
}: {
  title: string;
  onClose: () => void;
  closeDisabled?: boolean;
  maxWidth?: string;
  children: React.ReactNode;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !closeDisabled) onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose, closeDisabled]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60"
        onClick={closeDisabled ? undefined : onClose}
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`card relative max-h-[90vh] w-full overflow-y-auto p-6 ${maxWidth}`}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold">{title}</h2>
          <button
            type="button"
            className="icon-btn"
            onClick={onClose}
            disabled={closeDisabled}
            aria-label="Close"
          >
            <IoClose size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run src/components/admin/Modal.test.tsx`
Expected: PASS.

- [ ] **Step 5: Create `src/components/admin/ProductFormModal.tsx`**

```tsx
"use client";

/* eslint-disable @next/next/no-img-element */
import {useEffect, useState} from "react";
import {useMutation, useQueryClient} from "@tanstack/react-query";
import {toast} from "sonner";
import {IoImageOutline} from "react-icons/io5";
import {useAdminApi} from "@/lib/admin/api";
import {PRODUCT_CATEGORIES, getErrorMessage} from "@/lib/admin/utils";
import {CURRENCY} from "@/lib/config";
import type {Product} from "@/lib/types";
import {Modal} from "./Modal";

const MAX_IMAGES = 3;

// Mount with a `key` per product so the form starts fresh each time.
// `product` null means "create".
export function ProductFormModal({
  product,
  onClose
}: {
  product: Product | null;
  onClose: () => void;
}) {
  const api = useAdminApi();
  const queryClient = useQueryClient();

  const [form, setForm] = useState({
    name: product?.name ?? "",
    category: product?.category ?? "",
    price: product?.price.toString() ?? "",
    stock: product?.stock.toString() ?? "",
    description: product?.description ?? ""
  });
  const [images, setImages] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>(product?.images ?? []);

  // Object URLs for newly picked files are released when replaced or on close.
  useEffect(
    () => () =>
      previews.forEach((url) => {
        if (url.startsWith("blob:")) URL.revokeObjectURL(url);
      }),
    [previews]
  );

  const save = useMutation({
    mutationFn: (data: FormData) =>
      product
        ? api.products.update({id: product._id, form: data})
        : api.products.create(data),
    onSuccess: (saved) => {
      queryClient.invalidateQueries({queryKey: ["products"]});
      queryClient.invalidateQueries({queryKey: ["dashboardStats"]});
      toast.success(`"${saved.name}" was ${product ? "updated" : "added"}`);
      onClose();
    },
    onError: (error) => {
      toast.error(
        getErrorMessage(
          error,
          product ? "Failed to update product" : "Failed to add product"
        )
      );
    }
  });

  const set = (field: keyof typeof form) => (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => setForm({...form, [field]: e.target.value});

  const handleImages = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length > MAX_IMAGES) {
      toast.error(`Maximum ${MAX_IMAGES} images allowed`);
      e.target.value = "";
      return;
    }
    setImages(files);
    setPreviews(files.map((file) => URL.createObjectURL(file)));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!product && previews.length === 0) {
      toast.error("Please upload at least one image");
      return;
    }

    const data = new FormData();
    Object.entries(form).forEach(([key, value]) => data.append(key, value));
    images.forEach((image) => data.append("images", image));
    save.mutate(data);
  };

  return (
    <Modal
      title={product ? "Edit Product" : "Add New Product"}
      onClose={onClose}
      closeDisabled={save.isPending}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block space-y-1.5 text-sm font-medium">
            Product Name
            <input
              className="input"
              placeholder="Enter product name"
              value={form.name}
              onChange={set("name")}
              required
            />
          </label>

          <label className="block space-y-1.5 text-sm font-medium">
            Category
            <select
              className="select"
              value={form.category}
              onChange={set("category")}
              required
            >
              <option value="">Select category</option>
              {PRODUCT_CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block space-y-1.5 text-sm font-medium">
            Price ({CURRENCY})
            <input
              type="number"
              step="0.01"
              min="0"
              className="input"
              placeholder="0.00"
              value={form.price}
              onChange={set("price")}
              required
            />
          </label>

          <label className="block space-y-1.5 text-sm font-medium">
            Stock
            <input
              type="number"
              min="0"
              className="input"
              placeholder="0"
              value={form.stock}
              onChange={set("stock")}
              required
            />
          </label>
        </div>

        <label className="block space-y-1.5 text-sm font-medium">
          Description
          <textarea
            className="textarea h-28"
            placeholder="Enter product description"
            value={form.description}
            onChange={set("description")}
            required
          />
        </label>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm font-medium">
            <span className="flex items-center gap-2">
              <IoImageOutline size={20} />
              Product Images
            </span>
            <span className="text-xs text-text-tertiary">
              Max {MAX_IMAGES} images
            </span>
          </div>

          <input
            type="file"
            accept="image/*"
            multiple
            aria-label="Product images"
            onChange={handleImages}
            className="input"
            required={!product}
          />
          {product && (
            <p className="text-xs text-text-tertiary">
              Leave empty to keep the current images.
            </p>
          )}

          {previews.length > 0 && (
            <div className="flex gap-2">
              {previews.map((src, index) => (
                <img
                  key={src}
                  src={src}
                  alt={`Preview ${index + 1}`}
                  className="size-20 rounded-xl object-cover"
                />
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            className="btn-secondary"
            onClick={onClose}
            disabled={save.isPending}
          >
            Cancel
          </button>
          <button type="submit" className="btn-primary" disabled={save.isPending}>
            {save.isPending
              ? "Saving..."
              : product
                ? "Update Product"
                : "Add Product"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
```

- [ ] **Step 6: Create `src/components/admin/DeleteProductModal.tsx`**

```tsx
"use client";

/* eslint-disable @next/next/no-img-element */
import {useMutation, useQueryClient} from "@tanstack/react-query";
import {toast} from "sonner";
import {IoWarningOutline} from "react-icons/io5";
import {useAdminApi} from "@/lib/admin/api";
import {getErrorMessage} from "@/lib/admin/utils";
import type {Product} from "@/lib/types";
import {Modal} from "./Modal";

export function DeleteProductModal({
  product,
  onClose
}: {
  product: Product;
  onClose: () => void;
}) {
  const api = useAdminApi();
  const queryClient = useQueryClient();

  const remove = useMutation({
    mutationFn: () => api.products.remove(product._id),
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: ["products"]});
      queryClient.invalidateQueries({queryKey: ["dashboardStats"]});
      toast.success(`"${product.name}" was deleted`);
      onClose();
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, "Failed to delete product"));
    }
  });

  return (
    <Modal
      title="Delete Product"
      onClose={onClose}
      closeDisabled={remove.isPending}
      maxWidth="max-w-md"
    >
      <div className="space-y-4">
        <div className="flex items-center gap-4 rounded-2xl bg-background-lighter p-4">
          <img
            src={product.images[0]}
            alt={product.name}
            className="size-16 rounded-xl object-cover"
          />
          <div>
            <h3 className="font-semibold">{product.name}</h3>
            <p className="text-sm text-text-secondary">{product.category}</p>
          </div>
        </div>

        <div className="flex items-start gap-3 text-accent-red">
          <IoWarningOutline size={20} className="mt-0.5 shrink-0" />
          <p className="text-sm">
            This permanently removes the product and its images. This action
            cannot be undone.
          </p>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            className="btn-secondary"
            onClick={onClose}
            disabled={remove.isPending}
          >
            Cancel
          </button>
          <button
            type="button"
            className="inline-flex items-center justify-center rounded-2xl bg-accent-red px-6 py-3.5 font-bold text-white transition hover:opacity-90 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50"
            onClick={() => remove.mutate()}
            disabled={remove.isPending}
          >
            {remove.isPending ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
```

- [ ] **Step 7: Create `src/app/admin/products/page.tsx`**

```tsx
"use client";

/* eslint-disable @next/next/no-img-element */
import {useState} from "react";
import {useQuery} from "@tanstack/react-query";
import {IoAdd, IoPencil, IoTrashOutline} from "react-icons/io5";
import {Badge} from "@/components/admin/Badge";
import {DeleteProductModal} from "@/components/admin/DeleteProductModal";
import {ProductFormModal} from "@/components/admin/ProductFormModal";
import {Spinner} from "@/components/StateMessage";
import {useAdminApi} from "@/lib/admin/api";
import {stockStatus} from "@/lib/admin/utils";
import {formatPrice} from "@/lib/format";
import type {Product} from "@/lib/types";

export default function ProductsPage() {
  const api = useAdminApi();
  // `undefined`: form closed. `null`: creating. A product: editing it.
  const [editing, setEditing] = useState<Product | null | undefined>(undefined);
  const [deleting, setDeleting] = useState<Product | null>(null);

  const {data: products = [], isLoading} = useQuery({
    queryKey: ["products"],
    enabled: api.ready,
    queryFn: api.products.list
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Products</h2>
          <p className="mt-1 text-text-secondary">Manage your product inventory</p>
        </div>

        <button className="btn-primary" onClick={() => setEditing(null)}>
          <IoAdd size={20} />
          Add Product
        </button>
      </div>

      {isLoading ? (
        <Spinner />
      ) : products.length === 0 ? (
        <div className="card py-12 text-center">
          <p className="text-xl font-semibold">No products yet</p>
          <p className="mt-1 text-sm text-text-secondary">
            Add your first product to start selling.
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {products.map((product) => {
            const status = stockStatus(product.stock);

            return (
              <div
                key={product._id}
                className="card flex flex-wrap items-center gap-4 p-4"
              >
                <img
                  src={product.images[0]}
                  alt={product.name}
                  className="size-20 rounded-2xl object-cover"
                />

                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="truncate font-semibold">{product.name}</h3>
                      <p className="text-sm text-text-secondary">
                        {product.category}
                      </p>
                    </div>
                    <Badge tone={status.tone}>{status.text}</Badge>
                  </div>

                  <div className="mt-3 flex gap-8">
                    <div>
                      <p className="text-xs text-text-tertiary">Price</p>
                      <p className="text-lg font-bold">
                        {formatPrice(product.price)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-text-tertiary">Stock</p>
                      <p className="text-lg font-bold">{product.stock} units</p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    className="icon-btn"
                    onClick={() => setEditing(product)}
                    aria-label={`Edit ${product.name}`}
                  >
                    <IoPencil size={18} />
                  </button>
                  <button
                    className="icon-btn text-accent-red"
                    onClick={() => setDeleting(product)}
                    aria-label={`Delete ${product.name}`}
                  >
                    <IoTrashOutline size={18} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {editing !== undefined && (
        <ProductFormModal
          key={editing?._id ?? "new"}
          product={editing}
          onClose={() => setEditing(undefined)}
        />
      )}

      {deleting && (
        <DeleteProductModal
          key={deleting._id}
          product={deleting}
          onClose={() => setDeleting(null)}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 8: Verify**

Run: `npm test && npm run typecheck && npm run lint`
Expected: all pass.

- [ ] **Step 9: Commit**

```bash
git add src && git commit -m "Add the admin products page with form and delete modals"
```

---

### Task 8: Sentry, CSP, env and docs

**Files:**
- Create: `src/instrumentation-client.ts`
- Modify: `src/lib/securityHeaders.ts`, `src/lib/securityHeaders.test.ts`, `next.config.ts`, `.env.example`, `README.md`, `package.json` (via npm)

**Interfaces:**
- `buildSecurityHeaders` gains optional `sentryDsn?: string`; when set, the DSN's origin is added to `connect-src`.

- [ ] **Step 1: Write the failing CSP tests** — add to `src/lib/securityHeaders.test.ts`, inside the `describe` that tests `buildSecurityHeaders` (follow the existing `build()`/`header()` helpers):

```ts
  it("allows the Sentry ingest origin only when a DSN is configured", () => {
    const csp = (dsn?: string) =>
      header(build({sentryDsn: dsn}), "Content-Security-Policy") ?? "";

    expect(csp("https://abc123@o42.ingest.sentry.io/99")).toContain(
      "https://o42.ingest.sentry.io"
    );
    expect(csp(undefined)).not.toContain("sentry.io");
    expect(csp("not a url")).not.toContain("sentry");
  });
```
(Place it next to the existing connect-src tests; if the file groups tests under a differently named `describe`, put it in that one.)

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/lib/securityHeaders.test.ts`
Expected: FAIL (`sentryDsn` ignored / type error).

- [ ] **Step 3: Implement** — in `src/lib/securityHeaders.ts`:

Change the signature and destructuring:
```ts
export function buildSecurityHeaders({
  clerkPublishableKey,
  apiUrl,
  sentryDsn,
  isProd
}: {
  clerkPublishableKey: string | undefined;
  apiUrl: string | undefined;
  sentryDsn?: string;
  isProd: boolean;
}): Header[] {
```
After `const api = originOf(apiUrl);` add:
```ts
  const sentry = originOf(sentryDsn);
```
and in `connect-src` add after `...clerk,`:
```ts
      ...(sentry ? [sentry] : []),
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run src/lib/securityHeaders.test.ts`
Expected: PASS.

- [ ] **Step 5: Wire it into `next.config.ts`** — add to the `buildSecurityHeaders({...})` argument:

```ts
          sentryDsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
```

- [ ] **Step 6: Install and configure Sentry**

```bash
npm install @sentry/nextjs@^10.27.0
```
Create `src/instrumentation-client.ts` (Next loads it in the browser automatically; no `withSentryConfig` wrapper because source-map upload is not needed here):

```ts
import * as Sentry from "@sentry/nextjs";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

// Skipped entirely when no DSN is set (local dev, CI, e2e).
if (dsn) {
  Sentry.init({
    dsn,
    // Keep default PII (e.g. IP addresses) out of Sentry events.
    sendDefaultPii: false,
    enableLogs: true,
    integrations: [Sentry.replayIntegration()],
    replaysSessionSampleRate: Number(
      process.env.NEXT_PUBLIC_SENTRY_REPLAY_SESSION_SAMPLE_RATE ?? 0
    ),
    replaysOnErrorSampleRate: 1.0
  });
}
```

- [ ] **Step 7: Document env and admin** — append to `.env.example`:

```
# Optional: browser error reporting (same values the old admin used as VITE_SENTRY_*).
NEXT_PUBLIC_SENTRY_DSN=
NEXT_PUBLIC_SENTRY_REPLAY_SESSION_SAMPLE_RATE=0
```
In `README.md` change the intro line to `Customer storefront and admin dashboard: Next.js (App Router), Clerk, Paystack.` and add before `## Scripts`:

```
## Admin

The admin dashboard lives at `/admin` (dashboard, products, orders, customers). It uses the same Clerk app as the storefront and calls `/api/admin/*`; the backend only allows the user whose email is `ADMIN_EMAIL`. Other signed-in users see a "You don't have access" screen. `/admin` is noindex and disallowed in `robots.txt`.

Env mapping from the old Vite admin: `VITE_CLERK_PUBLISHABLE_KEY` -> `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `VITE_API_URL` -> `NEXT_PUBLIC_API_URL`, `VITE_SENTRY_DSN` -> `NEXT_PUBLIC_SENTRY_DSN`, `VITE_SENTRY_REPLAY_SESSION_SAMPLE_RATE` -> `NEXT_PUBLIC_SENTRY_REPLAY_SESSION_SAMPLE_RATE`.
```
Also update the `## Notes` last bullet from "Deploy separately (e.g. Vercel)..." to keep it but add: `Sentry runs in the browser only when NEXT_PUBLIC_SENTRY_DSN is set.`

- [ ] **Step 8: Verify**

Run: `npm test && npm run typecheck && npm run lint && npm run test:e2e`
Expected: all pass (the build still succeeds with Sentry installed and no DSN).

- [ ] **Step 9: Commit**

```bash
git add -A && git commit -m "Add Sentry, allow it in the CSP, document the admin"
```

---

### Task 9: Final verification and hand-off

**Files:** none modified unless a check fails.

- [ ] **Step 1: Full check**

Run: `npm test && npm run typecheck && npm run lint && npm run test:e2e`
Expected: unit tests pass (previous 56 plus the new ones), e2e passes (6 tests including `admin requires sign-in`), no lint or type errors.

- [ ] **Step 2: Production build sanity**

Run: `NEXT_DIST_DIR=.next-verify npx next build` and confirm the route list contains `/admin`, `/admin/dashboard`, `/admin/products`, `/admin/orders`, `/admin/customers` and still contains `/`, `/products/[id]`, `/cart`. Then `git checkout tsconfig.json` if the build touched it, and `rm -rf .next-verify`.

- [ ] **Step 3: Visual smoke check (needs the user)** — signing in requires the user's Clerk account, so hand the user this checklist after pushing nothing:
  1. `npm run dev`, sign in as the `ADMIN_EMAIL` user, open `/admin` (lands on `/admin/dashboard`).
  2. Dashboard cards and recent orders look right in light and dark mode.
  3. Products: add (with 1-3 images), edit (without re-uploading images), delete.
  4. Orders: change a status; the dashboard revenue/orders update.
  5. Customers list loads.
  6. Signed in as a different user: `/admin` shows "You don't have access".
  7. Signed out: `/admin` redirects to `/sign-in`.
  8. Mobile width: the menu button opens the sidebar.
  9. Backend `.env` `CLIENT_URL` includes the web origin (CORS) — already required by the storefront.

- [ ] **Step 4: Finish the branch** — announce "I'm using the finishing-a-development-branch skill to complete this work." and follow it. Do **not** delete `admin/` or touch `backend/server.js`.

---

## Not in this plan (after the user confirms the new admin works)

Single follow-up commit: delete `admin/`; remove the `admin/dist` static serving and the catch-all from `backend/src/server.js`; update the root `package.json` scripts and README; then restructure Sevalla deployment (the web app becomes the only front-end service).
