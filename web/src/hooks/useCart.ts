"use client";

import {useAuth} from "@clerk/nextjs";
import {useMutation, useQuery, useQueryClient} from "@tanstack/react-query";
import {toast} from "sonner";
import {ApiError} from "@/lib/api/client";
import {useApi} from "@/lib/api/useApi";
import {cartItemCount, cartSubtotal, liveItems} from "@/lib/pricing";
import type {ApiCart, Cart} from "@/lib/types";

export const CART_KEY = ["cart"];

export function useCart() {
  const api = useApi();
  const {isSignedIn} = useAuth();
  const queryClient = useQueryClient();

  const invalidate = () => queryClient.invalidateQueries({queryKey: CART_KEY});
  const onError = (error: unknown) =>
    toast.error(
      error instanceof ApiError ? error.message : "Something went wrong"
    );

  const query = useQuery({
    queryKey: CART_KEY,
    enabled: Boolean(isSignedIn),
    queryFn: async (): Promise<Cart> => {
      const {cart} = await api.get<{cart: ApiCart}>("/cart");

      return {...cart, items: liveItems(cart.items)};
    }
  });

  const add = useMutation({
    mutationFn: ({
      productId,
      quantity = 1
    }: {
      productId: string;
      quantity?: number;
    }) => api.post("/cart", {productId, quantity}),
    onSuccess: invalidate,
    onError
  });

  const update = useMutation({
    mutationFn: ({productId, quantity}: {productId: string; quantity: number}) =>
      api.put(`/cart/${productId}`, {quantity}),
    onSuccess: invalidate,
    onError
  });

  const remove = useMutation({
    mutationFn: (productId: string) => api.delete(`/cart/${productId}`),
    onSuccess: invalidate,
    onError
  });

  const items = query.data?.items ?? [];

  return {
    cart: query.data,
    isLoading: query.isLoading,
    subtotal: cartSubtotal(items),
    itemCount: cartItemCount(items),
    addToCart: add.mutate,
    updateQuantity: update.mutate,
    removeFromCart: remove.mutate,
    isAdding: add.isPending,
    isUpdating: update.isPending,
    isRemoving: remove.isPending
  };
}
