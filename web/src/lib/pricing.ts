import type {CartItem} from "./types";

// Mirrors backend/src/lib/pricing.js. The server is authoritative; this is
// for display only, so keep both in sync.
export const SHIPPING_FEE = 10;
export const TAX_RATE = 0.08;

export function computeTotals(subtotal: number) {
  const shipping = subtotal > 0 ? SHIPPING_FEE : 0;
  const tax = subtotal * TAX_RATE;

  return {subtotal, shipping, tax, total: subtotal + shipping + tax};
}

export const cartSubtotal = (items: CartItem[]) =>
  items.reduce((sum, item) => sum + item.product.price * item.quantity, 0);

export const cartItemCount = (items: CartItem[]) =>
  items.reduce((sum, item) => sum + item.quantity, 0);
