"use client";

import {useAuth} from "@clerk/nextjs";
import {usePathname, useRouter} from "next/navigation";
import {toast} from "sonner";
import {useCart} from "@/hooks/useCart";

// Signed-out visitors are sent to sign-in and returned to the page afterwards.
export function useAddToCart() {
  const {isSignedIn} = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const {addToCart, isAdding} = useCart();

  function add(productId: string, quantity = 1) {
    if (!isSignedIn) {
      router.push(`/sign-in?redirect_url=${encodeURIComponent(pathname ?? "/")}`);
      return;
    }

    addToCart(
      {productId, quantity},
      {onSuccess: () => toast.success("Added to cart")}
    );
  }

  return {add, isAdding};
}
