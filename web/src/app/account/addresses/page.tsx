"use client";

import {useState} from "react";
import {IoAdd, IoLocation, IoLocationOutline, IoTrashOutline} from "react-icons/io5";
import {AddressForm} from "@/components/AddressForm";
import {Spinner, StateMessage} from "@/components/StateMessage";
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

  if (isLoading) return <Spinner label="Loading addresses..." />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Addresses</h1>
        {!showForm && (
          <button onClick={() => setShowForm(true)} className="btn-primary !py-2.5">
            <IoAdd size={20} />
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
        <StateMessage
          icon={IoLocationOutline}
          title="No addresses yet"
          description="Add a shipping address to speed up checkout."
        />
      )}

      <ul className="grid gap-4 sm:grid-cols-2">
        {addresses.map((address) => (
          <li key={address._id} className="card p-5 text-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <IoLocation size={22} className="text-primary-text" />
                <p className="text-base font-bold">{address.label}</p>
              </div>
              {address.isDefault && (
                <span className="rounded-full bg-primary px-3 py-1 text-xs font-bold text-on-primary">
                  Default
                </span>
              )}
            </div>

            <div className="mt-3 space-y-0.5 text-text-secondary">
              <p className="font-semibold text-text-primary">{address.fullName}</p>
              <p>{address.streetAddress}</p>
              <p>
                {address.city}, {address.state} {address.zipCode}
              </p>
              <p>{address.phoneNumber}</p>
            </div>

            <div className="mt-4 flex items-center gap-3">
              {!address.isDefault && (
                <button
                  onClick={() =>
                    updateAddress({
                      addressId: address._id,
                      data: {isDefault: true}
                    })
                  }
                  className="font-semibold text-primary-text hover:underline"
                >
                  Make default
                </button>
              )}
              <button
                aria-label={`Delete ${address.label} address`}
                onClick={() => deleteAddress(address._id)}
                className="icon-btn ml-auto !bg-accent-red/10 !text-accent-red"
              >
                <IoTrashOutline size={18} />
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
