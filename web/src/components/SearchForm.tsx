"use client";

import type {FormEvent} from "react";
import {IoSearch} from "react-icons/io5";

// Controlled: the parent decides what typing does (filter) and what submitting
// does (fetch). The action/method keep it working as a plain GET form too.
export function SearchForm({
  value,
  onChange,
  onSubmit,
  category
}: {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  category?: string;
}) {
  return (
    <form
      action="/products"
      method="get"
      role="search"
      onSubmit={onSubmit}
      className="flex gap-2"
    >
      <div className="relative flex-1">
        <IoSearch
          size={22}
          className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-text-tertiary"
        />
        <input
          type="search"
          name="q"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="Search for products"
          aria-label="Search for products"
          className="input pl-14"
        />
      </div>
      {category && <input type="hidden" name="category" value={category} />}
      <button type="submit" className="btn-primary hidden sm:inline-flex">
        Search
      </button>
    </form>
  );
}
