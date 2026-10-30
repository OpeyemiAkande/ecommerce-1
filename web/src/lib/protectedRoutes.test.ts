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
