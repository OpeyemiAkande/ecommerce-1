import type {Metadata} from "next";
import Link from "next/link";
import {ProductCard} from "@/components/ProductCard";
import {SearchForm} from "@/components/SearchForm";
import {fetchCategories, fetchProducts} from "@/lib/api/server";

export const metadata: Metadata = {
  title: "Shop all products",
  alternates: {canonical: "/products"}
};

type SearchParams = {q?: string; category?: string; page?: string};

function href({q, category, page}: SearchParams) {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (category) params.set("category", category);
  if (page && page !== "1") params.set("page", page);
  const query = params.toString();

  return `/products${query ? `?${query}` : ""}`;
}

export default async function ProductsPage({
  searchParams
}: {
  searchParams: Promise<SearchParams>;
}) {
  const {q, category, page: pageParam} = await searchParams;
  const page = Math.max(1, Number.parseInt(pageParam ?? "1", 10) || 1);

  const [data, categories] = await Promise.all([
    fetchProducts({q, category, page, limit: 12}),
    fetchCategories()
  ]);

  return (
    <div className="space-y-6">
      <SearchForm defaultValue={q} category={category} />

      <div className="flex flex-wrap gap-2 text-sm">
        <Link
          href={href({q})}
          className={`rounded-full border px-3 py-1 ${!category ? "bg-neutral-900 text-white" : "bg-white"}`}
        >
          All
        </Link>
        {categories.map((name) => (
          <Link
            key={name}
            href={href({q, category: name})}
            className={`rounded-full border px-3 py-1 ${category === name ? "bg-neutral-900 text-white" : "bg-white"}`}
          >
            {name}
          </Link>
        ))}
      </div>

      {data.products.length === 0 ? (
        <p className="py-12 text-center text-neutral-600">
          No products found.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {data.products.map((product) => (
            <ProductCard key={product._id} product={product} />
          ))}
        </div>
      )}

      {data.pages > 1 && (
        <nav className="flex items-center justify-center gap-4 text-sm">
          {page > 1 && (
            <Link href={href({q, category, page: String(page - 1)})}>
              ← Previous
            </Link>
          )}
          <span>
            Page {data.page} of {data.pages}
          </span>
          {page < data.pages && (
            <Link href={href({q, category, page: String(page + 1)})}>
              Next →
            </Link>
          )}
        </nav>
      )}
    </div>
  );
}
