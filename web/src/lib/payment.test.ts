import {describe, expect, it} from "vitest";
import {parseReference} from "./payment";

describe("parseReference", () => {
  it("returns a plain reference", () => {
    expect(parseReference("order_1")).toBe("order_1");
  });

  it("takes the first value when Paystack repeats the param", () => {
    expect(parseReference(["order_1", "order_1"])).toBe("order_1");
    expect(parseReference("order_1,order_1")).toBe("order_1");
  });

  it("returns null when missing or blank", () => {
    expect(parseReference(undefined)).toBeNull();
    expect(parseReference("  ")).toBeNull();
  });
});
