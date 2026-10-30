"use client";

import {useState} from "react";
import type {AddressInput} from "@/hooks/useAddresses";

const FIELDS: {name: keyof AddressInput; label: string}[] = [
  {name: "label", label: "Label (e.g. Home)"},
  {name: "fullName", label: "Full name"},
  {name: "streetAddress", label: "Street address"},
  {name: "city", label: "City"},
  {name: "state", label: "State"},
  {name: "zipCode", label: "Postal code"},
  {name: "phoneNumber", label: "Phone number"}
];

export function AddressForm({
  onSubmit,
  submitting,
  onCancel
}: {
  onSubmit: (data: AddressInput) => void;
  submitting: boolean;
  onCancel?: () => void;
}) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [isDefault, setIsDefault] = useState(false);

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit({...(values as Omit<AddressInput, "isDefault">), isDefault});
      }}
      className="grid gap-3 rounded-lg border border-neutral-200 bg-white p-4 sm:grid-cols-2"
    >
      {FIELDS.map(({name, label}) => (
        <label key={name} className="text-sm">
          {label}
          <input
            required
            value={values[name] ?? ""}
            onChange={(event) =>
              setValues((prev) => ({...prev, [name]: event.target.value}))
            }
            className="mt-1 w-full rounded border border-neutral-300 px-3 py-2"
          />
        </label>
      ))}

      <label className="flex items-center gap-2 text-sm sm:col-span-2">
        <input
          type="checkbox"
          checked={isDefault}
          onChange={(event) => setIsDefault(event.target.checked)}
        />
        Make this my default address
      </label>

      <div className="flex gap-2 sm:col-span-2">
        <button
          disabled={submitting}
          className="rounded bg-neutral-900 px-4 py-2 text-white disabled:opacity-50"
        >
          {submitting ? "Saving..." : "Save address"}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="rounded border px-4 py-2"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
