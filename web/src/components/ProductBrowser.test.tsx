import {render, screen} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import type {PublicProduct} from "@/lib/types";
import {ProductBrowser} from "./ProductBrowser";

const router = vi.hoisted(() => ({push: vi.fn(), replace: vi.fn()}));
vi.mock("next/navigation", () => ({useRouter: () => router}));
vi.mock("@/components/ProductCard", () => ({
  ProductCard: ({product}: {product: PublicProduct}) => (
    <div data-testid="card">{product.name}</div>
  )
}));

const product = (name: string, description = ""): PublicProduct => ({
  _id: name,
  name,
  description,
  price: 10,
  category: "Misc",
  images: [],
  averageRating: 0,
  totalReviews: 0,
  inStock: true,
  createdAt: "2026-01-01",
  updatedAt: "2026-01-01"
});

const fetched = [
  product("Sneakers", "Comfortable shoes"),
  product("Mechanical Keyboard", "RGB"),
  product("Headphones", "Wireless")
];

const names = () => screen.queryAllByTestId("card").map((c) => c.textContent);

let replaceState: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  router.push.mockReset();
  router.replace.mockReset();
  replaceState = vi.spyOn(window.history, "replaceState");
});

afterEach(() => replaceState.mockRestore());

describe("ProductBrowser", () => {
  it("filters the fetched list as you type, without a request", async () => {
    const user = userEvent.setup();
    render(<ProductBrowser products={fetched} total={3} />);

    expect(names()).toEqual(["Sneakers", "Mechanical Keyboard", "Headphones"]);

    await user.type(screen.getByRole("searchbox"), "key");

    expect(names()).toEqual(["Mechanical Keyboard"]);
    expect(router.push).not.toHaveBeenCalled();
    expect(screen.getByText("1 item")).toBeInTheDocument();
  });

  it("restores the fetched list when the box is cleared or backspaced", async () => {
    const user = userEvent.setup();
    render(<ProductBrowser products={fetched} total={3} />);
    const box = screen.getByRole("searchbox");

    await user.type(box, "key");
    expect(names()).toEqual(["Mechanical Keyboard"]);

    // Deleting a character re-filters the full fetched list, so the results
    // widen again ("ke" also matches "Sneakers").
    await user.type(box, "{Backspace}");
    expect(names()).toEqual(["Sneakers", "Mechanical Keyboard"]);

    await user.clear(box);
    expect(names()).toEqual(["Sneakers", "Mechanical Keyboard", "Headphones"]);
    expect(screen.getByText("3 items")).toBeInTheDocument();
    expect(router.push).not.toHaveBeenCalled();
  });

  it("keeps the address bar in sync while typing, without navigating", async () => {
    const user = userEvent.setup();
    render(
      <ProductBrowser products={fetched} total={3} category="Sports" />
    );

    await user.type(screen.getByRole("searchbox"), "key");

    expect(replaceState).toHaveBeenLastCalledWith(
      null,
      "",
      "/products?q=key&category=Sports"
    );
    expect(router.push).not.toHaveBeenCalled();
    expect(router.replace).not.toHaveBeenCalled();
  });

  it("removes q from the address bar when the box is emptied", async () => {
    const user = userEvent.setup();
    render(<ProductBrowser products={fetched} total={3} />);

    await user.type(screen.getByRole("searchbox"), "key");
    await user.clear(screen.getByRole("searchbox"));

    expect(replaceState).toHaveBeenLastCalledWith(null, "", "/products");
    // Nothing narrowed was fetched, so there is nothing to re-fetch.
    expect(router.replace).not.toHaveBeenCalled();
  });

  it("clearing after a server search fetches the unfiltered list and drops q from the URL", async () => {
    const user = userEvent.setup();
    // The page was loaded with ?q=shoe, so the fetched list is just Sneakers.
    render(
      <ProductBrowser products={[fetched[0]]} total={1} q="shoe" category="Sports" />
    );

    expect(screen.getByRole("searchbox")).toHaveValue("shoe");

    await user.clear(screen.getByRole("searchbox"));

    // An empty query means "everything", which the narrowed list can't show.
    expect(router.replace).toHaveBeenCalledWith("/products?category=Sports");
    expect(router.push).not.toHaveBeenCalled();
  });

  it("deleting part of a server search filters locally and updates the URL", async () => {
    const user = userEvent.setup();
    render(<ProductBrowser products={[fetched[0]]} total={1} q="shoe" />);

    await user.type(screen.getByRole("searchbox"), "{Backspace}");

    expect(screen.getByRole("searchbox")).toHaveValue("sho");
    expect(replaceState).toHaveBeenLastCalledWith(null, "", "/products?q=sho");
    expect(router.replace).not.toHaveBeenCalled();
  });

  it("sends a fresh request when Search is clicked", async () => {
    const user = userEvent.setup();
    render(
      <ProductBrowser products={fetched} total={3} category="Sports" />
    );

    await user.type(screen.getByRole("searchbox"), "key");
    await user.click(screen.getByRole("button", {name: "Search"}));

    expect(router.push).toHaveBeenCalledWith("/products?q=key&category=Sports");
  });

  it("clicking Search with an empty box requests the unfiltered list", async () => {
    const user = userEvent.setup();
    render(<ProductBrowser products={[fetched[0]]} total={1} q="shoe" />);

    await user.clear(screen.getByRole("searchbox"));
    await user.click(screen.getByRole("button", {name: "Search"}));

    expect(router.push).toHaveBeenCalledWith("/products");
  });

  it("submits with Enter too", async () => {
    const user = userEvent.setup();
    render(<ProductBrowser products={fetched} total={3} />);

    await user.type(screen.getByRole("searchbox"), "head{Enter}");

    expect(router.push).toHaveBeenCalledWith("/products?q=head");
  });

  it("shows an empty state that points to the full search", async () => {
    const user = userEvent.setup();
    render(<ProductBrowser products={fetched} total={3} />);

    await user.type(screen.getByRole("searchbox"), "zzz");

    expect(names()).toEqual([]);
    expect(screen.getByText("No products found")).toBeInTheDocument();
    expect(screen.getByText(/press search/i)).toBeInTheDocument();
  });
});
