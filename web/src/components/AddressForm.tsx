"use client";

import {useState} from "react";
import type {AddressInput} from "@/hooks/useAddresses";

const FIELDS: {name: keyof AddressInput; label: string; wide?: boolean}[] = [
  {name: "label", label: "Label (e.g. Home)"},
  {name: "fullName", label: "Full name"},
  {name: "streetAddress", label: "Street address", wide: true},
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
      className="card grid gap-4 p-5 sm:grid-cols-2"
    >
      {FIELDS.map(({name, label, wide}) => (
        <label
          key={name}
          className={`text-sm font-medium text-text-secondary ${wide ? "sm:col-span-2" : ""}`}
        >
          {label}
          <input
            required
            value={values[name] ?? ""}
            onChange={(event) =>
              setValues((prev) => ({...prev, [name]: event.target.value}))
            }
            className="input mt-1.5 !bg-background-lighter text-base"
          />
        </label>
      ))}

      <label className="flex items-center gap-3 text-sm sm:col-span-2">
        <input
          type="checkbox"
          checked={isDefault}
          onChange={(event) => setIsDefault(event.target.checked)}
          className="size-5 accent-primary"
        />
        Make this my default address
      </label>

      <div className="flex gap-3 sm:col-span-2">
        <button disabled={submitting} className="btn-primary">
          {submitting ? "Saving..." : "Save address"}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} className="btn-secondary">
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
