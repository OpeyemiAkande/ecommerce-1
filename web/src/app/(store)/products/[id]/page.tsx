import type {Metadata} from "next";
import Link from "next/link";
import {notFound} from "next/navigation";
import {IoChevronBack, IoStar} from "react-icons/io5";
import {ProductGallery} from "@/components/ProductGallery";
import {PurchasePanel} from "@/components/PurchasePanel";
import {fetchProduct} from "@/lib/api/server";
import {SITE_URL} from "@/lib/config";
import {productJsonLd, serializeJsonLd} from "@/lib/seo";

export const revalidate = 60;

type Props = {params: Promise<{id: string}>};

// No pages are pre-built (the build must not depend on the API); exporting
// this opts the route into on-demand ISR, so each product is rendered on first
// request and then cached for `revalidate` seconds.
export function generateStaticParams() {
  return [];
}

export async function generateMetadata({params}: Props): Promise<Metadata> {
  const {id} = await params;
  const product = await fetchProduct(id);

  if (!product) return {title: "Product not found"};

  const description = product.description.slice(0, 160);

  return {
    title: product.name,
    description,
    alternates: {canonical: `/products/${product._id}`},
    openGraph: {
      title: product.name,
      description,
      images: product.images.slice(0, 1)
    }
  };
}

export default async function ProductPage({params}: Props) {
  const {id} = await params;
  const product = await fetchProduct(id);

  if (!product) notFound();

  const jsonLd = serializeJsonLd(productJsonLd(product, SITE_URL));

  return (
    <article className="space-y-6">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{__html: jsonLd}}
      />

      <Link
        href="/products"
        className="inline-flex items-center gap-1 text-sm font-semibold text-text-secondary hover:text-text-primary"
      >
        <IoChevronBack size={16} />
        Back to shop
      </Link>

      <div className="grid gap-8 md:grid-cols-2">
        <ProductGallery images={product.images} name={product.name} />

        <div className="space-y-5">
          <span className="inline-block rounded-full bg-primary/15 px-3 py-1 text-xs font-bold text-primary-text">
            {product.category}
          </span>

          <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
            {product.name}
          </h1>

          <div className="flex flex-wrap items-center gap-3">
            {product.totalReviews > 0 && (
              <div className="flex items-center rounded-full border border-line bg-surface px-3 py-2">
                <IoStar size={16} className="text-accent-yellow" />
                <span className="ml-1 mr-2 font-bold">
                  {product.averageRating.toFixed(1)}
                </span>
                <span className="text-sm text-text-secondary">
                  ({product.totalReviews}{" "}
                  {product.totalReviews === 1 ? "review" : "reviews"})
                </span>
              </div>
            )}

            <div className="flex items-center">
              <span
                className={`mr-2 size-2 rounded-full ${product.inStock ? "bg-primary" : "bg-accent-red"}`}
              />
              <span
                className={`text-sm font-semibold ${product.inStock ? "text-primary-text" : "text-accent-red"}`}
              >
                {product.inStock ? "In stock" : "Out of stock"}
              </span>
            </div>
          </div>

          <PurchasePanel
            productId={product._id}
            price={product.price}
            inStock={product.inStock}
          />

          <div>
            <h2 className="mb-3 text-lg font-bold">Description</h2>
            <p className="whitespace-pre-line leading-6 text-text-secondary">
              {product.description}
            </p>
          </div>
        </div>
      </div>
    </article>
  );
}
