import type {Metadata} from "next";
import Link from "next/link";
import {IoChevronBack, IoChevronForward} from "react-icons/io5";
import {CategoryTiles} from "@/components/CategoryTiles";
import {ProductBrowser} from "@/components/ProductBrowser";
import {fetchCategories, fetchProducts} from "@/lib/api/server";
import {productsUrl} from "@/lib/search";

export const metadata: Metadata = {
  title: "Shop all products",
  alternates: {canonical: "/products"}
};

type SearchParams = {q?: string; category?: string; page?: string};

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

      <CategoryTiles
        categories={categories}
        selected={category}
        hrefFor={(name) => productsUrl({q, category: name})}
      />

      {/* The key resets the search box whenever a new server result arrives. */}
      <ProductBrowser
        key={`${q ?? ""}|${category ?? ""}|${page}`}
        products={data.products}
        total={data.total}
        q={q}
        category={category}
      />

      {data.pages > 1 && (
        <nav
          aria-label="Pagination"
          className="flex items-center justify-center gap-3 pt-2 text-sm"
        >
          {page > 1 && (
            <Link
              href={productsUrl({q, category, page: String(page - 1)})}
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
              href={productsUrl({q, category, page: String(page + 1)})}
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
