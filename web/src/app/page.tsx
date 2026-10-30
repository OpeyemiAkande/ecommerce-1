import Link from "next/link";
import {ProductCard} from "@/components/ProductCard";
import {fetchCategories, fetchProducts} from "@/lib/api/server";
import {STORE_NAME} from "@/lib/config";

export const revalidate = 60;

export default async function HomePage() {
  const [latest, categories] = await Promise.all([
    fetchProducts({limit: 8}),
    fetchCategories()
  ]);

  return (
    <div className="space-y-10">
      <section className="rounded-lg bg-neutral-900 px-6 py-12 text-white">
        <h1 className="text-3xl font-semibold">Welcome to {STORE_NAME}</h1>
        <p className="mt-2 text-neutral-300">
          Discover our latest products.
        </p>
        <Link
          href="/products"
          className="mt-6 inline-block rounded bg-white px-4 py-2 text-neutral-900"
        >
          Shop all
        </Link>
      </section>

      {categories.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-semibold">Shop by category</h2>
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <Link
                key={category}
                href={`/products?category=${encodeURIComponent(category)}`}
                className="rounded-full border border-neutral-300 bg-white px-4 py-1.5 text-sm hover:bg-neutral-100"
              >
                {category}
              </Link>
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="mb-3 text-lg font-semibold">New arrivals</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {latest.products.map((product) => (
            <ProductCard key={product._id} product={product} />
          ))}
        </div>
      </section>
    </div>
  );
}
