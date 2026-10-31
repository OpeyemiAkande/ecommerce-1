import {test} from "node:test";
import assert from "node:assert/strict";
import express from "express";
import {securityHeaders} from "../src/config/security.js";
import {parseTrustProxy} from "../src/lib/trustProxy.js";

test("sets the baseline security headers and hides the framework", async () => {
  const app = express();
  app.use(securityHeaders());
  app.get("/", (_req, res) => res.json({ok: true}));

  const server = app.listen(0);
  try {
    const res = await fetch(`http://127.0.0.1:${server.address().port}/`);
    const h = res.headers;

    assert.equal(h.get("x-content-type-options"), "nosniff");
    assert.ok(h.get("x-frame-options"), "clickjacking protection");
    assert.ok(h.get("referrer-policy"));
    assert.ok(h.get("strict-transport-security"));
    assert.equal(h.get("x-powered-by"), null);

    // Cross-origin apps (web, mobile, admin) must still be able to read responses.
    assert.equal(h.get("cross-origin-resource-policy"), "cross-origin");
    // Clerk's OAuth popups need window.opener, so COOP stays off.
    assert.equal(h.get("cross-origin-opener-policy"), null);
  } finally {
    server.close();
  }
});

test("parseTrustProxy turns the env value into an Express setting", () => {
  assert.equal(parseTrustProxy(undefined), false);
  assert.equal(parseTrustProxy(""), false);
  assert.equal(parseTrustProxy("1"), 1);
  assert.equal(parseTrustProxy("2"), 2);
  assert.equal(parseTrustProxy("loopback"), "loopback");
  assert.equal(parseTrustProxy("false"), false);
});
