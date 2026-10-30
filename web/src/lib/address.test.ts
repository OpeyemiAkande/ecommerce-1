import {describe, expect, it} from "vitest";
import {pickDefaultAddress, toShippingAddress} from "./address";
import type {Address} from "./types";

const address = (overrides: Partial<Address> = {}): Address => ({
  _id: "a1",
  label: "Home",
  fullName: "Ada Obi",
  streetAddress: "1 Main St",
  city: "Lagos",
  state: "Lagos",
  zipCode: "100001",
  phoneNumber: "0800000000",
  isDefault: false,
  ...overrides
});

describe("toShippingAddress", () => {
  it("keeps only the fields the order needs", () => {
    expect(toShippingAddress(address())).toEqual({
      fullName: "Ada Obi",
      streetAddress: "1 Main St",
      city: "Lagos",
      state: "Lagos",
      zipCode: "100001",
      phoneNumber: "0800000000"
    });
  });
});

describe("pickDefaultAddress", () => {
  it("prefers the default address", () => {
    const list = [address({_id: "a1"}), address({_id: "a2", isDefault: true})];
    expect(pickDefaultAddress(list)?._id).toBe("a2");
  });

  it("falls back to the first address", () => {
    expect(pickDefaultAddress([address({_id: "a1"})])?._id).toBe("a1");
  });

  it("returns null for an empty list", () => {
    expect(pickDefaultAddress([])).toBeNull();
  });
});
