import {render, screen} from "@testing-library/react";
import {describe, expect, it} from "vitest";
import {formatPrice} from "@/lib/format";
import {OrderSummary} from "./OrderSummary";

describe("OrderSummary", () => {
  it("shows subtotal, shipping, tax and total", () => {
    render(<OrderSummary subtotal={100} />);

    expect(screen.getByText("Subtotal").parentElement).toHaveTextContent(
      formatPrice(100)
    );
    expect(screen.getByText("Shipping").parentElement).toHaveTextContent(
      formatPrice(10)
    );
    expect(screen.getByText("Tax").parentElement).toHaveTextContent(
      formatPrice(8)
    );
    expect(screen.getByText("Total").parentElement).toHaveTextContent(
      formatPrice(118)
    );
  });
});
