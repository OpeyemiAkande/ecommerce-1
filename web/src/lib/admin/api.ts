"use client";

import {useMemo} from "react";
import {useAuth} from "@clerk/nextjs";
import {useApi} from "@/lib/api/useApi";
import type {Order, Product} from "@/lib/types";
import type {AdminStats, Customer, OrderStatus} from "./types";

// Endpoints under /api/admin. The backend's adminOnly check is the real gate.
export function useAdminApi() {
  const api = useApi();
  const {isSignedIn} = useAuth();

  return useMemo(
    () => ({
      ready: Boolean(isSignedIn),
      products: {
        list: () => api.get<Product[]>("/admin/products"),
        create: (form: FormData) => api.post<Product>("/admin/products", form),
        update: ({id, form}: {id: string; form: FormData}) =>
          api.put<Product>(`/admin/products/${id}`, form),
        remove: (id: string) =>
          api.delete<{message: string}>(`/admin/products/${id}`)
      },
      orders: {
        list: () => api.get<{orders: Order[]}>("/admin/orders"),
        updateStatus: ({orderId, status}: {orderId: string; status: OrderStatus}) =>
          api.patch<{message: string}>(`/admin/orders/${orderId}/status`, {status})
      },
      stats: {
        dashboard: () => api.get<AdminStats>("/admin/stats")
      },
      customers: {
        list: () => api.get<{customers: Customer[]}>("/admin/customers")
      }
    }),
    [api, isSignedIn]
  );
}
