// Dependency-free on purpose: next.config.ts imports this file directly.

export interface Header {
  key: string;
  value: string;
}

// A Clerk publishable key is "pk_<env>_" + base64("<frontend-api-host>$").
// Reading the host from it keeps the CSP right for dev instances and for
// production custom domains alike.
export function clerkHostFromKey(key: string | undefined): string | null {
  const encoded = key?.split("_")[2];
  if (!encoded) return null;

  try {
    const host = Buffer.from(encoded, "base64").toString("utf8").replace(/\$$/, "");
    return /^[a-z0-9.-]+$/i.test(host) ? host : null;
  } catch {
    return null;
  }
}

function originOf(url: string | undefined): string | null {
  try {
    return url ? new URL(url).origin : null;
  } catch {
    return null;
  }
}

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
  const clerkHost = clerkHostFromKey(clerkPublishableKey);
  const clerk = clerkHost ? [`https://${clerkHost}`] : [];
  const api = originOf(apiUrl);
  const sentry = originOf(sentryDsn);
  const turnstile = "https://challenges.cloudflare.com";

  const sources: Record<string, string[]> = {
    "default-src": ["'self'"],
    // Next.js emits inline bootstrap scripts, so 'unsafe-inline' is needed
    // unless a per-request nonce is added. The rest of the policy (no framing,
    // no foreign script hosts, no objects, no base-tag tricks) still applies.
    "script-src": [
      "'self'",
      "'unsafe-inline'",
      ...(isProd ? [] : ["'unsafe-eval'"]),
      ...clerk,
      turnstile
    ],
    "style-src": ["'self'", "'unsafe-inline'"],
    "img-src": [
      "'self'",
      "data:",
      "blob:",
      "https://images.unsplash.com",
      "https://res.cloudinary.com",
      "https://img.clerk.com"
    ],
    "font-src": ["'self'", "data:"],
    "connect-src": [
      "'self'",
      ...(api ? [api] : []),
      ...clerk,
      ...(sentry ? [sentry] : []),
      "https://clerk-telemetry.com",
      turnstile,
      ...(isProd ? [] : ["ws:", "wss:"])
    ],
    "frame-src": [turnstile, ...clerk],
    "worker-src": ["'self'", "blob:"],
    "form-action": ["'self'", ...clerk],
    "frame-ancestors": ["'none'"],
    "base-uri": ["'self'"],
    "object-src": ["'none'"]
  };

  const csp = Object.entries(sources)
    .map(([directive, values]) => `${directive} ${values.join(" ")}`)
    .join("; ");

  const headers: Header[] = [
    {key: "Content-Security-Policy", value: csp},
    {key: "X-Frame-Options", value: "DENY"},
    {key: "X-Content-Type-Options", value: "nosniff"},
    {key: "Referrer-Policy", value: "strict-origin-when-cross-origin"},
    {
      key: "Permissions-Policy",
      value: "camera=(), microphone=(), geolocation=(), payment=()"
    },
    // "allow-popups" keeps Clerk's OAuth popups working.
    {key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups"}
  ];

  // Browsers ignore HSTS over plain http, but keep it out of dev builds so a
  // local https experiment can't pin localhost.
  if (isProd) {
    headers.push({
      key: "Strict-Transport-Security",
      value: "max-age=63072000; includeSubDomains"
    });
  }

  return headers;
}
