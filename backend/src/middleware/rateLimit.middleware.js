import {ipKeyGenerator, rateLimit} from "express-rate-limit";

const MINUTE = 60 * 1000;

export function createLimiter({
  windowMs,
  limit,
  keyGenerator,
  skip,
  message = "Too many requests, please try again later."
}) {
  return rateLimit({
    windowMs,
    limit,
    keyGenerator,
    skip,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    handler: (_req, res) => res.status(429).json({error: message})
  });
}

// Everything the apps call directly, counted per client IP. Mount it with
// app.use("/api", ...), so paths here are relative to /api. Deliberately
// generous: many mobile users share one carrier IP and the admin dashboard
// loads several endpoints per page, so this is an abuse backstop, not a quota.
export const apiLimiter = createLimiter({
  windowMs: 15 * MINUTE,
  limit: 1000,
  skip: (req) =>
    req.path.startsWith("/public") ||
    req.path.startsWith("/inngest") ||
    req.path === "/health"
});

// Only a backstop against someone hitting the API directly. The web
// storefront renders on its own server, so its requests all share one IP and
// need headroom; per-visitor limits for browsing belong in front of the web app.
export const publicLimiter = createLimiter({
  windowMs: 15 * MINUTE,
  limit: 3000
});

// Each call creates a pending order and calls Paystack, so keep it tight.
// Runs after protectRoute, so it can count per user rather than per IP.
export const paymentLimiter = createLimiter({
  windowMs: 15 * MINUTE,
  limit: 10,
  keyGenerator: (req) => req.user?.clerkId ?? ipKeyGenerator(req.ip),
  message: "Too many payment attempts, please try again in a few minutes."
});
