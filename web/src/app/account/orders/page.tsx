"use client";

import Image from "next/image";
import Link from "next/link";
import {useOrders} from "@/hooks/useOrders";
import {formatDate, formatPrice} from "@/lib/format";

export default function OrdersPage() {
  const {orders, isLoading} = useOrders();

  if (isLoading) return <p>Loading your orders...</p>;

  if (orders.length === 0) {
    return (
      <div className="py-16 text-center">
        <h1 className="text-2xl font-semibold">No orders yet</h1>
        <Link href="/products" className="mt-4 inline-block underline">
          Start shopping
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Your orders</h1>

      {orders.map((order) => (
        <section
          key={order._id}
          className="rounded-lg border border-neutral-200 bg-white p-4"
        >
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <span className="text-neutral-600">
              Placed {formatDate(order.createdAt)}
            </span>
            <span className="rounded bg-neutral-100 px-2 py-0.5 capitalize">
              {order.status}
            </span>
            <span className="font-semibold">{formatPrice(order.totalPrice)}</span>
          </div>

          <ul className="mt-4 space-y-3">
            {order.orderItems.map((item) => (
              <li key={item._id} className="flex items-center gap-3">
                <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded bg-neutral-100">
                  {item.image && (
                    <Image
                      src={item.image}
                      alt={item.name}
                      fill
                      sizes="56px"
                      className="object-cover"
                    />
                  )}
                </div>
                <span className="flex-1">{item.name}</span>
                <span className="text-sm text-neutral-600">
                  {item.quantity} × {formatPrice(item.price)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
