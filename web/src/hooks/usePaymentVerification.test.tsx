import {QueryClient, QueryClientProvider} from "@tanstack/react-query";
import {act, renderHook, waitFor} from "@testing-library/react";
import {beforeEach, describe, expect, it, vi} from "vitest";
import {ApiError} from "@/lib/api/client";
import {usePaymentVerification} from "./usePaymentVerification";

// vi.mock is hoisted above imports, so the shared mock must be hoisted too.
const api = vi.hoisted(() => ({get: vi.fn(), delete: vi.fn()}));
vi.mock("@/lib/api/useApi", () => ({useApi: () => api}));

// One client per test: a new client on every render would change the hook's
// effect dependencies and re-run verification.
let client: QueryClient;

function wrapper({children}: {children: React.ReactNode}) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  client = new QueryClient();
  api.get.mockReset();
  api.delete.mockReset();
});

describe("usePaymentVerification", () => {
  it("verifies the payment, clears the cart and reports success", async () => {
    api.get.mockResolvedValue({message: "Payment verified successfully"});
    api.delete.mockResolvedValue({});

    const {result} = renderHook(() => usePaymentVerification("order_1"), {
      wrapper
    });

    expect(result.current.status).toBe("verifying");
    await waitFor(() => expect(result.current.status).toBe("success"));
    expect(api.get).toHaveBeenCalledWith("/payments/verify-payment/order_1");
    expect(api.delete).toHaveBeenCalledWith("/cart");
  });

  it("reports failure with the server message and keeps the cart", async () => {
    api.get.mockRejectedValue(new ApiError(400, "Payment not successful"));

    const {result} = renderHook(() => usePaymentVerification("order_1"), {
      wrapper
    });

    await waitFor(() => expect(result.current.status).toBe("failed"));
    expect(result.current.message).toBe("Payment not successful");
    expect(api.delete).not.toHaveBeenCalled();
  });

  it("fails immediately without a reference", async () => {
    const {result} = renderHook(() => usePaymentVerification(null), {wrapper});

    await waitFor(() => expect(result.current.status).toBe("failed"));
    expect(api.get).not.toHaveBeenCalled();
  });

  it("retries verification", async () => {
    api.get.mockRejectedValueOnce(new ApiError(400, "Payment not successful"));
    api.get.mockResolvedValueOnce({});
    api.delete.mockResolvedValue({});

    const {result} = renderHook(() => usePaymentVerification("order_1"), {
      wrapper
    });
    await waitFor(() => expect(result.current.status).toBe("failed"));

    act(() => result.current.retry());

    await waitFor(() => expect(result.current.status).toBe("success"));
    expect(api.get).toHaveBeenCalledTimes(2);
  });
});
