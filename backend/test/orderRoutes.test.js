import {test} from "node:test";
import assert from "node:assert/strict";
import orderRouter from "../src/routes/order.route.js";

// Orders must only ever be created by the Paystack flow (initialize-payment),
// which sets the payment status server-side. A client-callable "create order"
// endpoint would let anyone mint an order marked as paid.
test("the orders router exposes no way to create an order", () => {
  const methods = orderRouter.stack
    .filter((layer) => layer.route)
    .flatMap((layer) => Object.keys(layer.route.methods));

  assert.ok(methods.includes("get"), "GET /orders should still exist");
  assert.equal(methods.includes("post"), false);
  assert.equal(methods.includes("put"), false);
  assert.equal(methods.includes("patch"), false);
});
