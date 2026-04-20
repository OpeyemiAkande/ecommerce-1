import {useMutation, useQuery, useQueryClient} from "@tanstack/react-query";
import {useApi} from "@/lib/api";
import {Cart} from "@/types";
import {Alert} from "react-native";

const useCart = () => {
  const api = useApi();
  const queryClient = useQueryClient();

  const {
    data: cart,
    isLoading,
    isError
  } = useQuery({
    queryKey: ["cart"],
    queryFn: async () => {
      const {data} = await api.get<{cart: Cart}>("/cart");
      return data.cart;
    }
  });

  const addToCartMutation = useMutation({
    mutationFn: async ({
      productId,
      quantity = 1
    }: {
      productId: string;
      quantity?: number;
    }) => {
      const {data} = await api.post<{cart: Cart}>("/cart", {
        productId,
        quantity
      });
      return data.cart;
    },
    onSuccess: () => queryClient.invalidateQueries({queryKey: ["cart"]}),
    onError: (error: any) => {
      Alert.alert("Error", "Failed to add item to cart");
      console.log("Error adding to cart: ", error.response.data);
    }
  });

  const updateQuantityMutation = useMutation({
    mutationFn: async ({
      productId,
      quantity
    }: {
      productId: string;
      quantity: number;
    }) => {
      const {data} = await api.put<{cart: Cart}>(`/cart/${productId}`, {
        quantity
      });
      return data.cart;
    },
    onSuccess: () => queryClient.invalidateQueries({queryKey: ["cart"]}),
    onError: (error: any) => {
      Alert.alert("Error", "Failed to update quantity");
      console.log("Error updating quantity: ", error.response.data);
    }
  });

  const removeFromCartMutation = useMutation({
    mutationFn: async (productId: string) => {
      const {data} = await api.delete<{cart: Cart}>(`/cart/${productId}`);
      return data.cart;
    },
    onSuccess: () => queryClient.invalidateQueries({queryKey: ["cart"]}),
    onError: (error: any) => {
      Alert.alert("Error", "Failed to remove item from cart");
      console.log("Error removing from cart: ", error.response.data);
    }
  });

  const clearCartMutation = useMutation({
    mutationFn: async () => {
      const {data} = await api.delete<{cart: Cart}>("/cart");

      return data.cart;
    },
    onSuccess: () => queryClient.invalidateQueries({queryKey: ["cart"]}),
    onError: (error: any) => {
      Alert.alert("Error", "Failed to clear cart");
      console.log("Error clearing cart: ", error.response.data);
    }
  });

  const cartTotal =
    cart?.items.reduce(
      (sum, item) => sum + item.product.price * item.quantity,
      0
    ) ?? 0;

  const cartItemCount =
    cart?.items.reduce((sum, item) => sum + item.quantity, 0) ?? 0;

  return {
    cart,
    isLoading,
    isError,
    cartTotal,
    cartItemCount,
    addToCart: addToCartMutation.mutate,
    updateQuantity: updateQuantityMutation.mutate,
    removeFromCart: removeFromCartMutation.mutate,
    clearCart: clearCartMutation.mutate,
    isAddingToCart: addToCartMutation.isPending,
    isUpdating: updateQuantityMutation.isPending,
    isRemoving: removeFromCartMutation.isPending,
    isClearing: clearCartMutation.isPending
  };
};

export default useCart;
