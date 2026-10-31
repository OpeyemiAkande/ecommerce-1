import {afterEach, describe, expect, it, vi} from "vitest";
import {
  fetchAllProducts,
  fetchCategories,
  fetchProduct,
  fetchProducts
} from "./server";

const json = (body: unknown, status = 200) =>
  Promise.resolve(new Response(JSON.stringify(body), {status}));

afterEach(() => vi.unstubAllGlobals());

describe("fetchProducts", () => {
  it("builds the query string and skips empty params", async () => {
    const fetchMock = vi.fn(() => json({products: [], total: 0, page: 1, pages: 0}));
    vi.stubGlobal("fetch", fetchMock);

    await fetchProducts({q: "shoe", category: "", page: 2});

    const url = (fetchMock.mock.calls[0] as unknown as [string])[0];
    expect(url).toContain("/public/products?");
    expect(url).toContain("q=shoe");
    expect(url).toContain("page=2");
    expect(url).not.toContain("category=");
  });

  it("throws on a server error", async () => {
    vi.stubGlobal("fetch", vi.fn(() => json({}, 500)));
    await expect(fetchProducts()).rejects.toThrow(/500/);
  });
});

describe("fetchProduct", () => {
  it("returns null for a 404", async () => {
    vi.stubGlobal("fetch", vi.fn(() => json({message: "nope"}, 404)));
    expect(await fetchProduct("abc")).toBeNull();
  });

  it("returns the product", async () => {
    vi.stubGlobal("fetch", vi.fn(() => json({_id: "abc", name: "Shoe"})));
    expect((await fetchProduct("abc"))?.name).toBe("Shoe");
  });
});

describe("fetchCategories", () => {
  it("unwraps the categories array", async () => {
    vi.stubGlobal("fetch", vi.fn(() => json({categories: ["A", "B"]})));
    expect(await fetchCategories()).toEqual(["A", "B"]);
  });
});

describe("fetchAllProducts", () => {
  it("walks every page", async () => {
    const fetchMock = vi
      .fn()
      .mockImplementationOnce(() =>
        json({products: [{_id: "1"}], total: 2, page: 1, pages: 2})
      )
      .mockImplementationOnce(() =>
        json({products: [{_id: "2"}], total: 2, page: 2, pages: 2})
      );
    vi.stubGlobal("fetch", fetchMock);

    const all = await fetchAllProducts();

    expect(all.map((p) => p._id)).toEqual(["1", "2"]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
