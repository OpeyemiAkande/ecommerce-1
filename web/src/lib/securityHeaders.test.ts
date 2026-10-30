import {describe, expect, it} from "vitest";
import {buildSecurityHeaders, clerkHostFromKey} from "./securityHeaders";

// A Clerk publishable key is "pk_<env>_" + base64("<frontend-api-host>$").
const keyFor = (host: string) =>
  `pk_test_${Buffer.from(`${host}$`).toString("base64")}`;

const header = (headers: {key: string; value: string}[], name: string) =>
  headers.find((h) => h.key.toLowerCase() === name.toLowerCase())?.value;

const build = (overrides: Partial<Parameters<typeof buildSecurityHeaders>[0]> = {}) =>
  buildSecurityHeaders({
    clerkPublishableKey: keyFor("example-app-12.clerk.accounts.dev"),
    apiUrl: "https://api.example.com/api",
    isProd: true,
    ...overrides
  });

describe("clerkHostFromKey", () => {
  it("decodes the frontend API host from the publishable key", () => {
    expect(clerkHostFromKey(keyFor("clerk.shop.example.com"))).toBe(
      "clerk.shop.example.com"
    );
  });

  it("returns null for a missing or malformed key", () => {
    expect(clerkHostFromKey(undefined)).toBeNull();
    expect(clerkHostFromKey("nonsense")).toBeNull();
  });
});

describe("buildSecurityHeaders", () => {
  it("forbids framing and sniffing, and limits referrers and browser features", () => {
    const h = build();

    expect(header(h, "X-Frame-Options")).toBe("DENY");
    expect(header(h, "X-Content-Type-Options")).toBe("nosniff");
    expect(header(h, "Referrer-Policy")).toBe("strict-origin-when-cross-origin");
    expect(header(h, "Permissions-Policy")).toContain("camera=()");
    expect(header(h, "Cross-Origin-Opener-Policy")).toBe(
      "same-origin-allow-popups"
    );
  });

  it("builds a CSP that allows Clerk, the API and the image hosts, and nothing broader", () => {
    const csp = header(build(), "Content-Security-Policy")!;

    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("base-uri 'self'");
    expect(csp).toContain("https://example-app-12.clerk.accounts.dev");
    expect(csp).toMatch(/connect-src[^;]*https:\/\/api\.example\.com/);
    expect(csp).toMatch(/img-src[^;]*https:\/\/res\.cloudinary\.com/);
    expect(csp).toMatch(/img-src[^;]*https:\/\/images\.unsplash\.com/);
    expect(csp).not.toMatch(/\*(?!\.)/); // no bare wildcard sources
  });

  it("only allows eval and websockets in development", () => {
    const prod = header(build({isProd: true}), "Content-Security-Policy")!;
    const dev = header(build({isProd: false}), "Content-Security-Policy")!;

    expect(prod).not.toContain("'unsafe-eval'");
    expect(prod).not.toContain("ws:");
    expect(dev).toContain("'unsafe-eval'");
    expect(dev).toContain("ws:");
  });

  it("sends HSTS only in production", () => {
    expect(header(build({isProd: true}), "Strict-Transport-Security")).toMatch(
      /max-age=\d+/
    );
    expect(header(build({isProd: false}), "Strict-Transport-Security")).toBeUndefined();
  });

  it("still builds a CSP when the key or API URL is missing", () => {
    const csp = header(
      build({clerkPublishableKey: undefined, apiUrl: undefined}),
      "Content-Security-Policy"
    )!;

    expect(csp).toContain("default-src 'self'");
  });
});
