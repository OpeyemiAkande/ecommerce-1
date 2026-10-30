import {render, screen} from "@testing-library/react";
import {QueryClient, QueryClientProvider} from "@tanstack/react-query";
import {describe, expect, it, vi} from "vitest";
import {ApiError} from "@/lib/api/client";
import {AdminGate} from "./AdminGate";

const dashboard = vi.fn();

vi.mock("@/lib/admin/api", () => ({
  useAdminApi: () => ({ready: true, stats: {dashboard}})
}));

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
  });

  it("shows a no-access screen on 403", async () => {
    dashboard.mockRejectedValue(new ApiError(403, "Forbidden - admin access only"));
    renderGate();

    expect(await screen.findByText("You don't have access")).toBeInTheDocument();
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
