import {Product} from "../models/product.model.js";

const SHIPPING_FEE = 10.0;
const TAX_RATE = 0.08;

export function calculateTotal(subtotal) {
  return subtotal + SHIPPING_FEE + subtotal * TAX_RATE;
}

export function isValidQuantity(quantity) {
  return Number.isInteger(quantity) && quantity >= 1;
}

// Atomically take `quantity` units out of stock; returns false if there isn't enough.
export async function reserveStock(productId, quantity) {
  const updated = await Product.findOneAndUpdate(
    {_id: productId, stock: {$gte: quantity}},
    {$inc: {stock: -quantity}}
  );
  return Boolean(updated);
}

export async function releaseStock(items) {
  await Promise.all(
    items.map((item) =>
      Product.findByIdAndUpdate(item.product, {$inc: {stock: item.quantity}})
    )
  );
}
