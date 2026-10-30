import {describe, expect, it, vi} from "vitest";
import {checkAdminAccess} from "./access";

const respond = (status: number) =>
  vi.fn(() => Promise.resolve(new Response("{}", {status})));

const check = (fetchImpl: ReturnType<typeof respond>, token: string | null = "tok") =>
  checkAdminAccess({apiUrl: "http://api/api", token, fetchImpl});

describe("checkAdminAccess", () => {
  it("returns admin on 200 and sends the token, uncached", async () => {
    const fetchImpl = respond(200);

    expect(await check(fetchImpl)).toBe("admin");

    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("http://api/api/admin/me");
    expect((init.headers as Record<string, string>).Authorization).toBe(
      "Bearer tok"
    );
    expect(init.cache).toBe("no-store");
  });

  it("returns forbidden on 403", async () => {
    expect(await check(respond(403))).toBe("forbidden");
  });

  it("treats a missing user record (404) as forbidden", async () => {
    expect(await check(respond(404))).toBe("forbidden");
  });

  it("returns signed-out on 401, or without a token, without calling the API", async () => {
    expect(await check(respond(401))).toBe("signed-out");

    const fetchImpl = respond(200);
    expect(await check(fetchImpl, null)).toBe("signed-out");
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("throws on server errors so an outage never looks like 'not an admin'", async () => {
    await expect(check(respond(500))).rejects.toThrow(/500/);
  });

  it("throws when the API is unreachable", async () => {
    const fetchImpl = vi.fn(() => Promise.reject(new TypeError("fetch failed")));

    await expect(
      checkAdminAccess({apiUrl: "http://api/api", token: "t", fetchImpl})
    ).rejects.toThrow(/fetch failed/);
  });
});
