"use client";

import {IoAdd} from "react-icons/io5";
import {useAddToCart} from "@/hooks/useAddToCart";

export function QuickAddButton({
  productId,
  name,
  disabled
}: {
  productId: string;
  name: string;
  disabled?: boolean;
}) {
  const {add, isAdding} = useAddToCart();

  return (
    <button
      aria-label={`Add ${name} to cart`}
      onClick={() => add(productId)}
      disabled={disabled || isAdding}
      className="icon-btn-primary"
    >
      {isAdding ? (
        <span className="size-4 animate-spin rounded-full border-2 border-on-primary/30 border-t-on-primary" />
      ) : (
        <IoAdd size={20} />
      )}
    </button>
  );
}
