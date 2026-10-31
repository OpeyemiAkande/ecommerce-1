"use client";

import Image from "next/image";
import Link from "next/link";
import {IoReceiptOutline} from "react-icons/io5";
import {Spinner, StateMessage} from "@/components/StateMessage";
import {useOrders} from "@/hooks/useOrders";
import {formatDate, formatPrice} from "@/lib/format";
import type {Order} from "@/lib/types";

const STATUS_STYLES: Record<Order["status"], string> = {
  pending: "bg-accent-yellow/20 text-text-primary",
  shipped: "bg-background-lighter text-text-primary",
  delivered: "bg-primary/20 text-primary-text"
};

export default function OrdersPage() {
  const {orders, isLoading} = useOrders();

  if (isLoading) return <Spinner label="Loading your orders..." />;

  if (orders.length === 0) {
    return (
      <StateMessage
        icon={IoReceiptOutline}
        title="No orders yet"
        description="When you place an order it will show up here."
      >
        <Link href="/products" className="btn-primary">
          Start shopping
        </Link>
      </StateMessage>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Orders</h1>

      {orders.map((order) => (
        <section key={order._id} className="card p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm text-text-secondary">
                Placed {formatDate(order.createdAt)}
              </p>
              <p className="text-xl font-bold text-primary-text">
                {formatPrice(order.totalPrice)}
              </p>
            </div>
            <span
              className={`rounded-full px-3 py-1 text-xs font-bold capitalize ${STATUS_STYLES[order.status]}`}
            >
              {order.status}
            </span>
          </div>

          <ul className="mt-4 divide-y divide-line">
            {order.orderItems.map((item) => (
              <li key={item._id} className="flex items-center gap-3 py-3">
                <div className="relative size-14 shrink-0 overflow-hidden rounded-2xl bg-background-lighter">
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
                <span className="flex-1 font-semibold">{item.name}</span>
                <span className="text-sm text-text-secondary">
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
