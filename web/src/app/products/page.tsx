import type {Metadata} from "next";
import Link from "next/link";
import {IoChevronBack, IoChevronForward, IoSearchOutline} from "react-icons/io5";
import {CategoryTiles} from "@/components/CategoryTiles";
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
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Shop</h1>
        <p className="mt-1 text-sm text-text-secondary">Browse all products</p>
      </div>

      <SearchForm defaultValue={q} category={category} />

      <CategoryTiles
        categories={categories}
        selected={category}
        hrefFor={(name) => href({q, category: name})}
      />

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">Products</h2>
        <span className="text-sm text-text-secondary">
          {data.total} {data.total === 1 ? "item" : "items"}
        </span>
      </div>

      {data.products.length === 0 ? (
        <div className="flex flex-col items-center py-20 text-center">
          <IoSearchOutline size={48} className="text-text-tertiary" />
          <p className="mt-4 font-semibold">No products found</p>
          <p className="mt-2 text-sm text-text-secondary">
            Try adjusting your filters
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
          {data.products.map((product) => (
            <ProductCard key={product._id} product={product} />
          ))}
        </div>
      )}

      {data.pages > 1 && (
        <nav
          aria-label="Pagination"
          className="flex items-center justify-center gap-3 pt-2 text-sm"
        >
          {page > 1 && (
            <Link
              href={href({q, category, page: String(page - 1)})}
              className="btn-secondary !px-4 !py-2"
            >
              <IoChevronBack size={16} />
              Previous
            </Link>
          )}
          <span className="text-text-secondary">
            Page {data.page} of {data.pages}
          </span>
          {page < data.pages && (
            <Link
              href={href({q, category, page: String(page + 1)})}
              className="btn-secondary !px-4 !py-2"
            >
              Next
              <IoChevronForward size={16} />
            </Link>
          )}
        </nav>
      )}
    </div>
  );
}
