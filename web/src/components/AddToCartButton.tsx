"use client";

import {useAuth} from "@clerk/nextjs";
import {usePathname, useRouter} from "next/navigation";
import {toast} from "sonner";
import {useCart} from "@/hooks/useCart";

export function AddToCartButton({
  productId,
  disabled
}: {
  productId: string;
  disabled?: boolean;
}) {
  const {isSignedIn} = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const {addToCart, isAdding} = useCart();

  function handleClick() {
    if (!isSignedIn) {
      router.push(`/sign-in?redirect_url=${encodeURIComponent(pathname)}`);
      return;
    }

    addToCart(
      {productId, quantity: 1},
      {onSuccess: () => toast.success("Added to cart")}
    );
  }

  return (
    <button
      onClick={handleClick}
      disabled={disabled || isAdding}
      className="w-full rounded bg-neutral-900 px-6 py-3 text-white disabled:opacity-50 sm:w-auto"
    >
      {disabled ? "Sold out" : isAdding ? "Adding..." : "Add to cart"}
    </button>
  );
}
