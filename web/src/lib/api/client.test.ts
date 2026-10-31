import {describe, expect, it, vi} from "vitest";
import {ApiError, createApiClient} from "./client";

const respond = (body: unknown, status = 200) =>
  vi.fn(() => Promise.resolve(new Response(JSON.stringify(body), {status})));

describe("createApiClient", () => {
  it("attaches the bearer token and parses JSON", async () => {
    const fetchImpl = respond({cart: {items: []}});
    const api = createApiClient({
      baseUrl: "http://api/x",
      getToken: async () => "tok",
      fetchImpl
    });

    const data = await api.get<{cart: {items: unknown[]}}>("/cart");

    expect(data.cart.items).toEqual([]);
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [
      string,
      RequestInit
    ];
    expect(url).toBe("http://api/x/cart");
    expect((init.headers as Record<string, string>).Authorization).toBe(
      "Bearer tok"
    );
  });

  it("serializes JSON bodies", async () => {
    const fetchImpl = respond({});
    const api = createApiClient({
      baseUrl: "http://api",
      getToken: async () => null,
      fetchImpl
    });

    await api.post("/cart", {productId: "p1", quantity: 2});

    const [, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(init.method).toBe("POST");
    expect(init.body).toBe(JSON.stringify({productId: "p1", quantity: 2}));
    expect((init.headers as Record<string, string>).Authorization).toBeUndefined();
  });

  it("normalizes errors from {error} and {message} bodies", async () => {
    const api = createApiClient({
      baseUrl: "http://api",
      getToken: async () => "t",
      fetchImpl: respond({error: "Insufficient stock"}, 400)
    });

    await expect(api.post("/cart", {})).rejects.toMatchObject({
      name: "ApiError",
      status: 400,
      message: "Insufficient stock"
    });

    const api2 = createApiClient({
      baseUrl: "http://api",
      getToken: async () => "t",
      fetchImpl: respond({message: "User not found"}, 404)
    });
    await expect(api2.get("/cart")).rejects.toBeInstanceOf(ApiError);
  });

  it("calls onUnauthorized on a 401", async () => {
    const onUnauthorized = vi.fn();
    const api = createApiClient({
      baseUrl: "http://api",
      getToken: async () => "t",
      onUnauthorized,
      fetchImpl: respond({message: "Unauthorized"}, 401)
    });

    await expect(api.get("/cart")).rejects.toMatchObject({status: 401});
    expect(onUnauthorized).toHaveBeenCalledOnce();
  });

  it("sends FormData as-is without a JSON content type", async () => {
    const fetchImpl = respond({});
    const api = createApiClient({
      baseUrl: "http://api",
      getToken: async () => "tok",
      fetchImpl
    });
    const form = new FormData();
    form.append("name", "Shoe");

    await api.post("/admin/products", form);

    const [, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    const headers = init.headers as Record<string, string>;
    expect(init.body).toBe(form);
    expect(headers["Content-Type"]).toBeUndefined();
    expect(headers.Authorization).toBe("Bearer tok");
  });

  it("supports PATCH with a JSON body", async () => {
    const fetchImpl = respond({});
    const api = createApiClient({
      baseUrl: "http://api",
      getToken: async () => null,
      fetchImpl
    });

    await api.patch("/admin/orders/o1/status", {status: "shipped"});

    const [, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(init.method).toBe("PATCH");
    expect(init.body).toBe(JSON.stringify({status: "shipped"}));
    expect((init.headers as Record<string, string>)["Content-Type"]).toBe(
      "application/json"
    );
  });
});
