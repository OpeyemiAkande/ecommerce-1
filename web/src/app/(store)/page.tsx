import Link from "next/link";
import {IoArrowForward} from "react-icons/io5";
import {CategoryTiles} from "@/components/CategoryTiles";
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
      <section className="card relative overflow-hidden px-6 py-12 sm:px-10 sm:py-16">
        <div
          aria-hidden
          className="absolute -right-16 -top-16 size-64 rounded-full bg-primary/20 blur-2xl"
        />
        <div
          aria-hidden
          className="absolute -bottom-24 right-24 size-56 rounded-full bg-primary/10 blur-3xl"
        />
        <div className="relative max-w-xl">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            Welcome to {STORE_NAME}
          </h1>
          <p className="mt-3 text-lg text-text-secondary">
            Discover our latest products, picked for you.
          </p>
          <Link href="/products" className="btn-primary mt-8">
            Shop all
            <IoArrowForward size={20} />
          </Link>
        </div>
      </section>

      {categories.length > 0 && (
        <section>
          <h2 className="mb-4 text-lg font-bold">Shop by category</h2>
          <CategoryTiles
            categories={categories}
            hrefFor={(category) =>
              category
                ? `/products?category=${encodeURIComponent(category)}`
                : "/products"
            }
          />
        </section>
      )}

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">New arrivals</h2>
          <Link
            href="/products"
            className="text-sm font-semibold text-primary-text hover:underline"
          >
            View all
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
          {latest.products.map((product) => (
            <ProductCard key={product._id} product={product} />
          ))}
        </div>
      </section>
    </div>
  );
}
