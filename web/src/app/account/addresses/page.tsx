"use client";

import {useState} from "react";
import {AddressForm} from "@/components/AddressForm";
import {useAddresses} from "@/hooks/useAddresses";

export default function AddressesPage() {
  const {
    addresses,
    isLoading,
    addAddress,
    updateAddress,
    deleteAddress,
    isAdding
  } = useAddresses();
  const [showForm, setShowForm] = useState(false);

  if (isLoading) return <p>Loading addresses...</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Your addresses</h1>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="rounded bg-neutral-900 px-4 py-2 text-white"
          >
            Add address
          </button>
        )}
      </div>

      {showForm && (
        <AddressForm
          submitting={isAdding}
          onCancel={() => setShowForm(false)}
          onSubmit={(data) =>
            addAddress(data, {onSuccess: () => setShowForm(false)})
          }
        />
      )}

      {addresses.length === 0 && !showForm && (
        <p className="text-neutral-600">You haven&apos;t saved any addresses.</p>
      )}

      <ul className="grid gap-4 sm:grid-cols-2">
        {addresses.map((address) => (
          <li
            key={address._id}
            className="rounded-lg border border-neutral-200 bg-white p-4 text-sm"
          >
            <div className="flex items-center justify-between">
              <p className="font-medium">{address.label}</p>
              {address.isDefault && (
                <span className="rounded bg-neutral-900 px-2 py-0.5 text-xs text-white">
                  Default
                </span>
              )}
            </div>
            <p className="mt-2">{address.fullName}</p>
            <p>{address.streetAddress}</p>
            <p>
              {address.city}, {address.state} {address.zipCode}
            </p>
            <p>{address.phoneNumber}</p>

            <div className="mt-3 flex gap-3">
              {!address.isDefault && (
                <button
                  onClick={() =>
                    updateAddress({
                      addressId: address._id,
                      data: {isDefault: true}
                    })
                  }
                  className="hover:underline"
                >
                  Make default
                </button>
              )}
              <button
                onClick={() => deleteAddress(address._id)}
                className="text-red-700 hover:underline"
              >
                Delete
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
