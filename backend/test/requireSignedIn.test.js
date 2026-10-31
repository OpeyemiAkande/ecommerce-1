import {test} from "node:test";
import assert from "node:assert/strict";
import express from "express";
import {requireSignedIn} from "../src/middleware/auth.middleware.js";

// Starts a tiny app whose fake Clerk `req.auth()` returns the given userId.
async function request(userId) {
  const app = express();
  app.use((req, _res, next) => {
    req.auth = () => ({userId});
    next();
  });
  app.get("/protected", requireSignedIn, (_req, res) => res.json({ok: true}));

  const server = app.listen(0);
  try {
    const {port} = server.address();
    // redirect: "manual" so a 302 would be visible instead of being followed.
    const res = await fetch(`http://127.0.0.1:${port}/protected`, {
      redirect: "manual"
    });
    return {status: res.status, body: await res.json().catch(() => null)};
  } finally {
    server.close();
  }
}

test("unauthenticated requests get a 401 JSON error, not a redirect", async () => {
  const {status, body} = await request(null);

  assert.equal(status, 401);
  assert.match(body.message, /unauthorized/i);
});

test("signed-in requests pass through", async () => {
  const {status, body} = await request("user_123");

  assert.equal(status, 200);
  assert.deepEqual(body, {ok: true});
});
