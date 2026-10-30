"use client";

import {useRouter} from "next/navigation";
import {useState, type FormEvent} from "react";
import {IoSearchOutline} from "react-icons/io5";
import {ProductCard} from "@/components/ProductCard";
import {SearchForm} from "@/components/SearchForm";
import {filterProducts, productsUrl} from "@/lib/search";
import type {PublicProduct} from "@/lib/types";

// Typing filters the products already fetched for this page (no request).
// Submitting the form (Search button or Enter) asks the server for a fresh
// result. Clearing the box shows the list from the last fetch again.
export function ProductBrowser({
  products,
  total,
  q = "",
  category
}: {
  products: PublicProduct[];
  total: number;
  q?: string;
  category?: string;
}) {
  const router = useRouter();
  const [query, setQuery] = useState(q);

  // Until the text differs from what the server was last asked for, the
  // fetched list is already the right answer.
  const isFiltering = query.trim() !== q.trim();
  const visible = isFiltering ? filterProducts(products, query) : products;
  const count = isFiltering ? visible.length : total;

  function handleChange(next: string) {
    setQuery(next);

    // Emptying the box after a server search: the fetched list is a narrowed
    // result, but an empty query means "everything", so fetch that instead.
    if (next.trim() === "" && q.trim() !== "") {
      router.replace(productsUrl({category}));
      return;
    }

    // Otherwise keep the address bar in step with the box, so a reload shows
    // what is typed. replaceState neither fetches nor adds history entries.
    window.history.replaceState(null, "", productsUrl({q: next, category}));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    router.push(productsUrl({q: query, category}));
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <SearchForm
          value={query}
          onChange={handleChange}
          onSubmit={handleSubmit}
          category={category}
        />
        {isFiltering && (
          <p className="text-sm text-text-secondary">
            Filtering the products on this page. Press Search to search the
            whole catalog.
          </p>
        )}
      </div>

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">Products</h2>
        <span className="text-sm text-text-secondary">
          {count} {count === 1 ? "item" : "items"}
        </span>
      </div>

      {visible.length === 0 ? (
        <div className="flex flex-col items-center py-20 text-center">
          <IoSearchOutline size={48} className="text-text-tertiary" />
          <p className="mt-4 font-semibold">No products found</p>
          <p className="mt-2 text-sm text-text-secondary">
            Try adjusting your filters
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
          {visible.map((product) => (
            <ProductCard key={product._id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
}
