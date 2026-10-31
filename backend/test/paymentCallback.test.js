import {test} from "node:test";
import assert from "node:assert/strict";
import {resolveCallbackUrl} from "../src/lib/paymentCallback.js";

const ngrokUrl = "https://abc.ngrok.app";

test("web platform returns the web success page, trimming trailing slashes", () => {
  assert.equal(
    resolveCallbackUrl({
      platform: "web",
      reference: "order_1",
      webUrl: "https://shop.example.com/",
      ngrokUrl
    }),
    "https://shop.example.com/checkout/success"
  );
});

test("web platform without WEB_URL throws", () => {
  assert.throws(
    () => resolveCallbackUrl({platform: "web", reference: "order_1", ngrokUrl}),
    /WEB_URL/
  );
});

test("no platform keeps the existing mobile callback", () => {
  assert.equal(
    resolveCallbackUrl({reference: "order_1", webUrl: "https://x.com", ngrokUrl}),
    "https://abc.ngrok.app/api/payments/payment-success?reference=order_1"
  );
});

test("unknown platforms fall back to the mobile callback", () => {
  assert.equal(
    resolveCallbackUrl({
      platform: "https://evil.example",
      reference: "order_1",
      webUrl: "https://x.com",
      ngrokUrl
    }),
    "https://abc.ngrok.app/api/payments/payment-success?reference=order_1"
  );
});
