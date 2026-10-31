import {test, mock, beforeEach, afterEach} from "node:test";
import assert from "node:assert/strict";
import express from "express";
import {adminOnly} from "../src/middleware/auth.middleware.js";
import adminRoutes from "../src/routes/admin.route.js";
import {User} from "../src/models/user.model.js";
import {ENV} from "../src/config/env.js";

const ADMIN = "boss@shop.com";
let originalAdminEmail;

beforeEach(() => {
  originalAdminEmail = ENV.ADMIN_EMAIL;
  ENV.ADMIN_EMAIL = ADMIN;
});

afterEach(() => {
  ENV.ADMIN_EMAIL = originalAdminEmail;
  mock.restoreAll();
});

function runAdminOnly(user) {
  const out = {status: null, body: null, nextCalled: false};
  const res = {
    status(code) {
      out.status = code;
      return this;
    },
    json(body) {
      out.body = body;
      return this;
    }
  };
  adminOnly({user}, res, () => {
    out.nextCalled = true;
  });
  return out;
}

test("the admin gets through", () => {
  assert.equal(runAdminOnly({email: ADMIN}).nextCalled, true);
});

test("the email match ignores case and surrounding spaces", () => {
  assert.equal(runAdminOnly({email: "Boss@Shop.com "}).nextCalled, true);
});

test("any other signed-in user gets 403", () => {
  const out = runAdminOnly({email: "shopper@shop.com"});

  assert.equal(out.status, 403);
  assert.equal(out.nextCalled, false);
});

test("a request with no user gets 401", () => {
  const out = runAdminOnly(undefined);

  assert.equal(out.status, 401);
  assert.equal(out.nextCalled, false);
});

test("fails closed when ADMIN_EMAIL is not configured", () => {
  for (const unset of [undefined, "", "   "]) {
    ENV.ADMIN_EMAIL = unset;

    // A user record without an email must not match an unset ADMIN_EMAIL.
    assert.equal(runAdminOnly({email: undefined}).status, 403);
    assert.equal(runAdminOnly({email: ""}).status, 403);
    assert.equal(runAdminOnly({email: "shopper@shop.com"}).status, 403);
  }
});

// Every admin route, through the real router with a fake Clerk session.
const USERS = {
  admin_id: {email: ADMIN},
  shopper_id: {email: "shopper@shop.com"}
};

async function withAdminApp(fn) {
  mock.method(User, "findOne", async ({clerkId}) => USERS[clerkId] ?? null);

  const app = express();
  app.use((req, _res, next) => {
    req.auth = () => ({userId: req.get("x-test-user") || null});
    next();
  });
  app.use("/api/admin", adminRoutes);

  const server = app.listen(0);
  try {
    return await fn(`http://127.0.0.1:${server.address().port}/api/admin`);
  } finally {
    server.close();
  }
}

const adminRouteList = adminRoutes.stack
  .filter((layer) => layer.route)
  .flatMap((layer) =>
    Object.keys(layer.route.methods).map((method) => ({
      method: method.toUpperCase(),
      path: layer.route.path.replace(/:\w+/g, "abc123")
    }))
  );

test("the admin router exposes the expected routes", () => {
  assert.equal(adminRouteList.length, 9);
});

test("GET /me tells the admin they have access and nobody else", async () => {
  await withAdminApp(async (base) => {
    const admin = await fetch(`${base}/me`, {headers: {"x-test-user": "admin_id"}});
    assert.equal(admin.status, 200);
    assert.deepEqual(await admin.json(), {ok: true});

    const shopper = await fetch(`${base}/me`, {headers: {"x-test-user": "shopper_id"}});
    assert.equal(shopper.status, 403);

    const signedOut = await fetch(`${base}/me`);
    assert.equal(signedOut.status, 401);
  });
});

test("no admin route answers a signed-out request", async () => {
  await withAdminApp(async (base) => {
    for (const {method, path} of adminRouteList) {
      const res = await fetch(base + path, {method});
      assert.equal(res.status, 401, `${method} ${path}`);
    }
  });
});

test("no admin route answers a signed-in non-admin", async () => {
  await withAdminApp(async (base) => {
    for (const {method, path} of adminRouteList) {
      const res = await fetch(base + path, {
        method,
        headers: {"x-test-user": "shopper_id"}
      });
      assert.equal(res.status, 403, `${method} ${path}`);
    }
  });
});

test("no admin route answers a session with no user record", async () => {
  await withAdminApp(async (base) => {
    for (const {method, path} of adminRouteList) {
      const res = await fetch(base + path, {
        method,
        headers: {"x-test-user": "ghost_id"}
      });
      assert.equal(res.status, 404, `${method} ${path}`);
    }
  });
});
