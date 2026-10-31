import {render, screen} from "@testing-library/react";
import {QueryClient, QueryClientProvider} from "@tanstack/react-query";
import {beforeEach, describe, expect, it, vi} from "vitest";
import {ApiError} from "@/lib/api/client";
import {AdminGate} from "./AdminGate";

const dashboard = vi.fn();
const refresh = vi.fn();

vi.mock("@/lib/admin/api", () => ({
  useAdminApi: () => ({ready: true, stats: {dashboard}})
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({refresh})
}));

beforeEach(() => refresh.mockClear());

const renderGate = () =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <AdminGate>
        <p>secret admin content</p>
      </AdminGate>
    </QueryClientProvider>
  );

describe("AdminGate", () => {
  it("shows the pages once the stats request succeeds", async () => {
    dashboard.mockResolvedValue({totalOrders: 1});
    renderGate();

    expect(await screen.findByText("secret admin content")).toBeInTheDocument();
    expect(refresh).not.toHaveBeenCalled();
  });

  it("asks the server to re-check once on 403, then shows a no-access screen", async () => {
    dashboard.mockRejectedValue(new ApiError(403, "Forbidden - admin access only"));
    renderGate();

    expect(await screen.findByText("You don't have access")).toBeInTheDocument();
    // The refresh re-runs the server layout, which renders the 403 page.
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(screen.queryByText("secret admin content")).not.toBeInTheDocument();
    expect(screen.getByRole("link", {name: "Back to the store"})).toHaveAttribute(
      "href",
      "/"
    );
  });

  it("still shows the pages on other errors so they can report them", async () => {
    dashboard.mockRejectedValue(new ApiError(500, "Internal server error"));
    renderGate();

    expect(await screen.findByText("secret admin content")).toBeInTheDocument();
  });
});
