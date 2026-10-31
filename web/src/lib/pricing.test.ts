import {describe, expect, it} from "vitest";
import {
  cartItemCount,
  cartSubtotal,
  computeTotals,
  liveItems
} from "./pricing";
import type {ApiCartItem, CartItem} from "./types";

const item = (price: number, quantity: number): CartItem =>
  ({_id: "i", quantity, product: {price}}) as unknown as CartItem;

describe("computeTotals", () => {
  it("adds shipping and 8% tax, mirroring the backend", () => {
    expect(computeTotals(100)).toEqual({
      subtotal: 100,
      shipping: 10,
      tax: 8,
      total: 118
    });
  });

  it("charges nothing for an empty cart", () => {
    expect(computeTotals(0)).toEqual({
      subtotal: 0,
      shipping: 0,
      tax: 0,
      total: 0
    });
  });
});

describe("cart helpers", () => {
  const items = [item(10, 2), item(5, 3)];

  it("sums price times quantity", () => {
    expect(cartSubtotal(items)).toBe(35);
  });

  it("counts units", () => {
    expect(cartItemCount(items)).toBe(5);
  });
});

describe("liveItems", () => {
  it("drops items whose product was deleted (populated as null)", () => {
    const live = item(10, 1) as ApiCartItem;
    const dead = {_id: "d", quantity: 2, product: null} as ApiCartItem;

    const result = liveItems([live, dead]);

    expect(result).toHaveLength(1);
    expect(cartSubtotal(result)).toBe(10);
    expect(cartItemCount(result)).toBe(1);
  });
});
