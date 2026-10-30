"use client";

import Link from "next/link";
import {useState} from "react";
import {AddressForm} from "@/components/AddressForm";
import {OrderSummary} from "@/components/OrderSummary";
import {useAddresses} from "@/hooks/useAddresses";
import {useCart} from "@/hooks/useCart";
import {useStartPayment} from "@/hooks/useStartPayment";
import {pickDefaultAddress} from "@/lib/address";

export default function CheckoutPage() {
  const {cart, isLoading: cartLoading, subtotal} = useCart();
  const {
    addresses,
    isLoading: addressesLoading,
    addAddress,
    isAdding
  } = useAddresses();
  const {startPayment, isStarting} = useStartPayment();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  if (cartLoading || addressesLoading) return <p>Loading checkout...</p>;

  const items = cart?.items ?? [];

  if (items.length === 0) {
    return (
      <div className="py-16 text-center">
        <h1 className="text-2xl font-semibold">Your cart is empty</h1>
        <Link href="/products" className="mt-4 inline-block underline">
          Continue shopping
        </Link>
      </div>
    );
  }

  const selected =
    addresses.find((a) => a._id === selectedId) ?? pickDefaultAddress(addresses);

  return (
    <div className="grid gap-8 lg:grid-cols-3">
      <section className="space-y-4 lg:col-span-2">
        <h1 className="text-2xl font-semibold">Checkout</h1>
        <h2 className="font-medium">Shipping address</h2>

        {addresses.map((address) => (
          <label
            key={address._id}
            className={`flex cursor-pointer gap-3 rounded-lg border bg-white p-4 text-sm ${selected?._id === address._id ? "border-neutral-900" : "border-neutral-200"}`}
          >
            <input
              type="radio"
              name="address"
              checked={selected?._id === address._id}
              onChange={() => setSelectedId(address._id)}
            />
            <span>
              <span className="block font-medium">
                {address.label} · {address.fullName}
              </span>
              {address.streetAddress}, {address.city}, {address.state}{" "}
              {address.zipCode} · {address.phoneNumber}
            </span>
          </label>
        ))}

        {showForm || addresses.length === 0 ? (
          <AddressForm
            submitting={isAdding}
            onCancel={addresses.length > 0 ? () => setShowForm(false) : undefined}
            onSubmit={(data) =>
              addAddress(data, {onSuccess: () => setShowForm(false)})
            }
          />
        ) : (
          <button
            onClick={() => setShowForm(true)}
            className="text-sm underline"
          >
            + Add a new address
          </button>
        )}
      </section>

      <aside className="space-y-4">
        <OrderSummary subtotal={subtotal} />
        <button
          disabled={!selected || isStarting}
          onClick={() => selected && startPayment(selected, items)}
          className="w-full rounded bg-neutral-900 px-4 py-3 text-white disabled:opacity-50"
        >
          {isStarting ? "Redirecting to Paystack..." : "Pay with Paystack"}
        </button>
        {!selected && (
          <p className="text-sm text-neutral-600">
            Add a shipping address to continue.
          </p>
        )}
      </aside>
    </div>
  );
}
