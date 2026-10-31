"use client";

import {useAuth} from "@clerk/nextjs";
import {useQuery} from "@tanstack/react-query";
import {useApi} from "@/lib/api/useApi";
import type {Order} from "@/lib/types";

export function useOrders() {
  const api = useApi();
  const {isSignedIn} = useAuth();

  const query = useQuery({
    queryKey: ["orders"],
    enabled: Boolean(isSignedIn),
    queryFn: async () => (await api.get<{orders: Order[]}>("/orders")).orders
  });

  // Orders are created as "pending" before the Paystack redirect; hide the
  // ones that were never paid.
  const orders = (query.data ?? []).filter(
    (order) => order.paymentResult.status === "succeeded"
  );

  return {orders, isLoading: query.isLoading};
}
