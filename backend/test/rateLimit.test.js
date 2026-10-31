import {test} from "node:test";
import assert from "node:assert/strict";
import express from "express";
import {createLimiter} from "../src/middleware/rateLimit.middleware.js";

// Runs `fn(baseUrl)` against a throwaway app that uses the given limiter.
async function withApp(limiter, fn, {setup} = {}) {
  const app = express();
  setup?.(app);
  app.use(limiter);
  app.get("/ping", (_req, res) => res.json({ok: true}));

  const server = app.listen(0);
  try {
    return await fn(`http://127.0.0.1:${server.address().port}`);
  } finally {
    server.close();
  }
}

test("allows requests up to the limit, then answers 429 with a JSON error", async () => {
  const limiter = createLimiter({windowMs: 60_000, limit: 3});

  await withApp(limiter, async (base) => {
    const statuses = [];
    for (let i = 0; i < 5; i++) statuses.push((await fetch(`${base}/ping`)).status);
    assert.deepEqual(statuses, [200, 200, 200, 429, 429]);

    const blocked = await fetch(`${base}/ping`);
    assert.match((await blocked.json()).error, /too many requests/i);
    assert.ok(blocked.headers.get("retry-after"), "tells the client when to retry");
  });
});

test("counts each key separately", async () => {
  let who = "alice";
  const limiter = createLimiter({
    windowMs: 60_000,
    limit: 1,
    keyGenerator: () => who
  });

  await withApp(limiter, async (base) => {
    assert.equal((await fetch(`${base}/ping`)).status, 200);
    assert.equal((await fetch(`${base}/ping`)).status, 429);

    who = "bob";
    assert.equal((await fetch(`${base}/ping`)).status, 200);
  });
});

test("skipped requests are never limited", async () => {
  const limiter = createLimiter({
    windowMs: 60_000,
    limit: 1,
    skip: () => true
  });

  await withApp(limiter, async (base) => {
    for (let i = 0; i < 4; i++) {
      assert.equal((await fetch(`${base}/ping`)).status, 200);
    }
  });
});
