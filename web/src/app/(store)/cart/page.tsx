"use client";

import Image from "next/image";
import Link from "next/link";
import {
  IoAdd,
  IoArrowForward,
  IoCartOutline,
  IoRemove,
  IoTrashOutline
} from "react-icons/io5";
import {OrderSummary} from "@/components/OrderSummary";
import {Spinner, StateMessage} from "@/components/StateMessage";
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

  if (isLoading) return <Spinner label="Loading cart..." />;

  const items = cart?.items ?? [];

  if (items.length === 0) {
    return (
      <StateMessage
        icon={IoCartOutline}
        title="Your cart is empty"
        description="Add some products to get started."
      >
        <Link href="/products" className="btn-primary">
          Continue shopping
        </Link>
      </StateMessage>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Cart</h1>

      <div className="grid gap-8 lg:grid-cols-3">
        <section className="space-y-3 lg:col-span-2">
          {items.map(({_id, product, quantity}) => (
            <div key={_id} className="card flex gap-4 p-4">
              <Link
                href={`/products/${product._id}`}
                className="relative size-24 shrink-0 overflow-hidden rounded-2xl bg-background-lighter sm:size-28"
              >
                {product.images[0] && (
                  <Image
                    src={product.images[0]}
                    alt={product.name}
                    fill
                    sizes="112px"
                    className="object-cover"
                  />
                )}
              </Link>

              <div className="flex flex-1 flex-col justify-between">
                <div>
                  <Link
                    href={`/products/${product._id}`}
                    className="text-lg font-bold leading-tight hover:underline"
                  >
                    {product.name}
                  </Link>
                  <div className="mt-1 flex items-baseline gap-2">
                    <span className="text-xl font-bold text-primary-text">
                      {formatPrice(product.price * quantity)}
                    </span>
                    {quantity > 1 && (
                      <span className="text-sm text-text-secondary">
                        {formatPrice(product.price)} each
                      </span>
                    )}
                  </div>
                </div>

                <div className="mt-3 flex items-center">
                  <button
                    aria-label="Decrease quantity"
                    disabled={quantity <= 1 || isUpdating}
                    onClick={() =>
                      updateQuantity({
                        productId: product._id,
                        quantity: quantity - 1
                      })
                    }
                    className="icon-btn-primary"
                  >
                    <IoRemove size={18} />
                  </button>
                  <span className="mx-4 min-w-6 text-center text-lg font-bold">
                    {quantity}
                  </span>
                  <button
                    aria-label="Increase quantity"
                    disabled={quantity >= product.stock || isUpdating}
                    onClick={() =>
                      updateQuantity({
                        productId: product._id,
                        quantity: quantity + 1
                      })
                    }
                    className="icon-btn-primary"
                  >
                    <IoAdd size={18} />
                  </button>

                  <button
                    aria-label={`Remove ${product.name}`}
                    disabled={isRemoving}
                    onClick={() => removeFromCart(product._id)}
                    className="icon-btn ml-auto !bg-accent-red/10 !text-accent-red"
                  >
                    <IoTrashOutline size={18} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </section>

        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <OrderSummary subtotal={subtotal} />
          <Link href="/checkout" className="btn-primary w-full !py-4 text-lg">
            Proceed to checkout
            <IoArrowForward size={22} />
          </Link>
        </aside>
      </div>
    </div>
  );
}
