import type {Order} from "@/lib/types";

export type OrderStatus = Order["status"];

export const ORDER_STATUSES: OrderStatus[] = ["pending", "shipped", "delivered"];

export interface AdminStats {
  totalRevenue: number;
  totalOrders: number;
  totalCustomers: number;
  totalProducts: number;
}

export interface Customer {
  _id: string;
  name: string;
  email: string;
  imageUrl: string;
  addresses?: unknown[];
  wishlist?: unknown[];
  createdAt: string;
}
