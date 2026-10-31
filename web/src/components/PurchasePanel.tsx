"use client";

import {useState} from "react";
import {IoAdd, IoCart, IoRemove} from "react-icons/io5";
import {useAddToCart} from "@/hooks/useAddToCart";
import {formatPrice} from "@/lib/format";

export function PurchasePanel({
  productId,
  price,
  inStock
}: {
  productId: string;
  price: number;
  inStock: boolean;
}) {
  const [quantity, setQuantity] = useState(1);
  const {add, isAdding} = useAddToCart();

  return (
    <div className="card space-y-5 p-5">
      <div>
        <p className="mb-3 text-lg font-bold">Quantity</p>
        <div className="flex items-center">
          <button
            aria-label="Decrease quantity"
            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
            disabled={!inStock || quantity <= 1}
            className="icon-btn !size-12"
          >
            <IoRemove size={24} />
          </button>
          <span className="mx-6 min-w-6 text-center text-xl font-bold">
            {quantity}
          </span>
          <button
            aria-label="Increase quantity"
            onClick={() => setQuantity((q) => q + 1)}
            disabled={!inStock}
            className="icon-btn-primary !size-12"
          >
            <IoAdd size={24} />
          </button>
        </div>
      </div>

      <div className="flex items-center gap-4 border-t border-line pt-5">
        <div className="flex-1">
          <p className="mb-1 text-sm text-text-secondary">Total price</p>
          <p className="text-2xl font-bold text-primary-text">
            {formatPrice(price * quantity)}
          </p>
        </div>
        <button
          onClick={() => add(productId, quantity)}
          disabled={!inStock || isAdding}
          className="btn-primary"
        >
          {isAdding ? (
            <span className="size-5 animate-spin rounded-full border-2 border-on-primary/30 border-t-on-primary" />
          ) : (
            <IoCart size={22} />
          )}
          {inStock ? "Add to cart" : "Sold out"}
        </button>
      </div>
    </div>
  );
}
