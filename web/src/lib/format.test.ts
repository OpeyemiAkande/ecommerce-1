import {describe, expect, it} from "vitest";
import {formatDate, formatPrice} from "./format";

describe("formatPrice", () => {
  it("formats with thousands separators and two decimals", () => {
    expect(formatPrice(1234.5)).toContain("1,234.50");
  });
});

describe("formatDate", () => {
  it("formats an ISO date", () => {
    expect(formatDate("2026-03-05T10:00:00.000Z")).toContain("2026");
  });
});
