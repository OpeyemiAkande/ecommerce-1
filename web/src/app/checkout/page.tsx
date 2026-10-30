"use client";

import Link from "next/link";
import {useState} from "react";
import {IoCartOutline, IoLocation, IoLockClosed} from "react-icons/io5";
import {AddressForm} from "@/components/AddressForm";
import {OrderSummary} from "@/components/OrderSummary";
import {Spinner, StateMessage} from "@/components/StateMessage";
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

  if (cartLoading || addressesLoading) return <Spinner label="Loading checkout..." />;

  const items = cart?.items ?? [];

  if (items.length === 0) {
    return (
      <StateMessage
        icon={IoCartOutline}
        title="Your cart is empty"
        description="Add some products before checking out."
      >
        <Link href="/products" className="btn-primary">
          Continue shopping
        </Link>
      </StateMessage>
    );
  }

  const selected =
    addresses.find((a) => a._id === selectedId) ?? pickDefaultAddress(addresses);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Checkout</h1>

      <div className="grid gap-8 lg:grid-cols-3">
        <section className="space-y-3 lg:col-span-2">
          <h2 className="text-lg font-bold">Shipping address</h2>

          {addresses.map((address) => {
            const isSelected = selected?._id === address._id;

            return (
              <label
                key={address._id}
                className={`card flex cursor-pointer items-start gap-3 p-4 text-sm transition ${
                  isSelected ? "!border-primary ring-1 ring-primary" : ""
                }`}
              >
                <input
                  type="radio"
                  name="address"
                  checked={isSelected}
                  onChange={() => setSelectedId(address._id)}
                  className="mt-1 size-4 accent-primary"
                />
                <IoLocation size={22} className="mt-0.5 shrink-0 text-primary-text" />
                <span className="text-text-secondary">
                  <span className="block text-base font-bold text-text-primary">
                    {address.label} · {address.fullName}
                  </span>
                  {address.streetAddress}, {address.city}, {address.state}{" "}
                  {address.zipCode} · {address.phoneNumber}
                </span>
              </label>
            );
          })}

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
              className="text-sm font-semibold text-primary-text hover:underline"
            >
              + Add a new address
            </button>
          )}
        </section>

        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <OrderSummary subtotal={subtotal} />
          <button
            disabled={!selected || isStarting}
            onClick={() => selected && startPayment(selected, items)}
            className="btn-primary w-full !py-4 text-lg"
          >
            <IoLockClosed size={20} />
            {isStarting ? "Redirecting to Paystack..." : "Pay with Paystack"}
          </button>
          {!selected && (
            <p className="text-center text-sm text-text-secondary">
              Add a shipping address to continue.
            </p>
          )}
        </aside>
      </div>
    </div>
  );
}
