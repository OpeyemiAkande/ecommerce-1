import {render, screen} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {beforeEach, describe, expect, it, vi} from "vitest";
import type {PublicProduct} from "@/lib/types";
import {ProductBrowser} from "./ProductBrowser";

const push = vi.hoisted(() => vi.fn());
vi.mock("next/navigation", () => ({useRouter: () => ({push})}));
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

beforeEach(() => push.mockReset());

describe("ProductBrowser", () => {
  it("filters the fetched list as you type, without a request", async () => {
    const user = userEvent.setup();
    render(<ProductBrowser products={fetched} total={3} />);

    expect(names()).toEqual(["Sneakers", "Mechanical Keyboard", "Headphones"]);

    await user.type(screen.getByRole("searchbox"), "key");

    expect(names()).toEqual(["Mechanical Keyboard"]);
    expect(push).not.toHaveBeenCalled();
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
    expect(push).not.toHaveBeenCalled();
  });

  it("clearing after a server search shows that search's fetched list again", async () => {
    const user = userEvent.setup();
    // The page was loaded with ?q=shoe, so the fetched list is just Sneakers.
    render(
      <ProductBrowser products={[fetched[0]]} total={1} q="shoe" />
    );

    expect(screen.getByRole("searchbox")).toHaveValue("shoe");

    await user.clear(screen.getByRole("searchbox"));

    expect(names()).toEqual(["Sneakers"]);
    expect(push).not.toHaveBeenCalled();
  });

  it("sends a fresh request when Search is clicked", async () => {
    const user = userEvent.setup();
    render(
      <ProductBrowser products={fetched} total={3} category="Sports" />
    );

    await user.type(screen.getByRole("searchbox"), "key");
    await user.click(screen.getByRole("button", {name: "Search"}));

    expect(push).toHaveBeenCalledWith("/products?q=key&category=Sports");
  });

  it("clicking Search with an empty box requests the unfiltered list", async () => {
    const user = userEvent.setup();
    render(<ProductBrowser products={[fetched[0]]} total={1} q="shoe" />);

    await user.clear(screen.getByRole("searchbox"));
    await user.click(screen.getByRole("button", {name: "Search"}));

    expect(push).toHaveBeenCalledWith("/products");
  });

  it("submits with Enter too", async () => {
    const user = userEvent.setup();
    render(<ProductBrowser products={fetched} total={3} />);

    await user.type(screen.getByRole("searchbox"), "head{Enter}");

    expect(push).toHaveBeenCalledWith("/products?q=head");
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
