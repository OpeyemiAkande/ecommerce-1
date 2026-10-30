import {describe, expect, it} from "vitest";
import {ApiError} from "@/lib/api/client";
import {
  capitalizeText,
  getErrorMessage,
  orderStatusTone,
  stockStatus
} from "./utils";

describe("capitalizeText", () => {
  it("uppercases the first letter", () => {
    expect(capitalizeText("pending")).toBe("Pending");
    expect(capitalizeText("")).toBe("");
  });
});

describe("orderStatusTone", () => {
  it("maps order statuses to badge tones", () => {
    expect(orderStatusTone("delivered")).toBe("success");
    expect(orderStatusTone("shipped")).toBe("info");
    expect(orderStatusTone("pending")).toBe("warning");
    expect(orderStatusTone("other")).toBe("ghost");
    expect(orderStatusTone(undefined)).toBe("ghost");
  });
});

describe("stockStatus", () => {
  it("flags out of stock, low stock and in stock", () => {
    expect(stockStatus(0)).toEqual({text: "Out of Stock", tone: "error"});
    expect(stockStatus(19)).toEqual({text: "Low Stock", tone: "warning"});
    expect(stockStatus(20)).toEqual({text: "In Stock", tone: "success"});
  });
});

describe("getErrorMessage", () => {
  it("uses the error message, else the fallback", () => {
    expect(getErrorMessage(new ApiError(400, "Bad input"), "x")).toBe("Bad input");
    expect(getErrorMessage(new Error(""), "fallback")).toBe("fallback");
    expect(getErrorMessage("boom", "fallback")).toBe("fallback");
  });
});
