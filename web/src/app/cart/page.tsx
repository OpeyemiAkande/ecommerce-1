"use client";

import Image from "next/image";
import Link from "next/link";
import {OrderSummary} from "@/components/OrderSummary";
import {useCart} from "@/hooks/useCart";
import {formatPrice} from "@/lib/format";

export default function CartPage() {
  const {
    cart,
    isLoading,
    subtotal,
    updateQuantity,
    removeFromCart,
    isUpdating,
    isRemoving
  } = useCart();

  if (isLoading) return <p>Loading your cart...</p>;

  const items = cart?.items ?? [];

  if (items.length === 0) {
    return (
      <div className="py-16 text-center">
        <h1 className="text-2xl font-semibold">Your cart is empty</h1>
        <Link
          href="/products"
          className="mt-6 inline-block rounded bg-neutral-900 px-4 py-2 text-white"
        >
          Continue shopping
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-8 lg:grid-cols-3">
      <section className="space-y-4 lg:col-span-2">
        <h1 className="text-2xl font-semibold">Your cart</h1>

        {items.map(({_id, product, quantity}) => (
          <div
            key={_id}
            className="flex gap-4 rounded-lg border border-neutral-200 bg-white p-4"
          >
            <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded bg-neutral-100">
              {product.images[0] && (
                <Image
                  src={product.images[0]}
                  alt={product.name}
                  fill
                  sizes="96px"
                  className="object-cover"
                />
              )}
            </div>

            <div className="flex flex-1 flex-col justify-between">
              <div className="flex justify-between gap-2">
                <Link
                  href={`/products/${product._id}`}
                  className="font-medium hover:underline"
                >
                  {product.name}
                </Link>
                <span>{formatPrice(product.price * quantity)}</span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button
                    aria-label="Decrease quantity"
                    disabled={quantity <= 1 || isUpdating}
                    onClick={() =>
                      updateQuantity({
                        productId: product._id,
                        quantity: quantity - 1
                      })
                    }
                    className="h-8 w-8 rounded border disabled:opacity-40"
                  >
                    −
                  </button>
                  <span className="w-6 text-center">{quantity}</span>
                  <button
                    aria-label="Increase quantity"
                    disabled={quantity >= product.stock || isUpdating}
                    onClick={() =>
                      updateQuantity({
                        productId: product._id,
                        quantity: quantity + 1
                      })
                    }
                    className="h-8 w-8 rounded border disabled:opacity-40"
                  >
                    +
                  </button>
                </div>

                <button
                  disabled={isRemoving}
                  onClick={() => removeFromCart(product._id)}
                  className="text-sm text-red-700 hover:underline disabled:opacity-50"
                >
                  Remove
                </button>
              </div>
            </div>
          </div>
        ))}
      </section>

      <aside className="space-y-4">
        <OrderSummary subtotal={subtotal} />
        <Link
          href="/checkout"
          className="block rounded bg-neutral-900 px-4 py-3 text-center text-white"
        >
          Proceed to checkout
        </Link>
      </aside>
    </div>
  );
}
