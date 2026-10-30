import type {Metadata} from "next";
import Image from "next/image";
import {notFound} from "next/navigation";
import {AddToCartButton} from "@/components/AddToCartButton";
import {fetchProduct} from "@/lib/api/server";
import {SITE_URL} from "@/lib/config";
import {formatPrice} from "@/lib/format";
import {productJsonLd} from "@/lib/seo";

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

  // "<" is escaped so product text can never close the script tag.
  const jsonLd = JSON.stringify(productJsonLd(product, SITE_URL)).replace(
    /</g,
    "\u003c"
  );

  return (
    <article className="grid gap-8 md:grid-cols-2">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{__html: jsonLd}}
      />

      <div className="space-y-3">
        <div className="relative aspect-square overflow-hidden rounded-lg bg-neutral-100">
          {product.images[0] && (
            <Image
              src={product.images[0]}
              alt={product.name}
              fill
              priority
              sizes="(min-width: 768px) 50vw, 100vw"
              className="object-cover"
            />
          )}
        </div>
        {product.images.length > 1 && (
          <div className="grid grid-cols-4 gap-2">
            {product.images.slice(1, 5).map((src) => (
              <div
                key={src}
                className="relative aspect-square overflow-hidden rounded bg-neutral-100"
              >
                <Image
                  src={src}
                  alt={product.name}
                  fill
                  sizes="12vw"
                  className="object-cover"
                />
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-4">
        <p className="text-sm text-neutral-500">{product.category}</p>
        <h1 className="text-3xl font-semibold">{product.name}</h1>
        <p className="text-2xl">{formatPrice(product.price)}</p>

        {product.totalReviews > 0 && (
          <p className="text-sm text-neutral-600">
            ★ {product.averageRating.toFixed(1)} ({product.totalReviews}{" "}
            {product.totalReviews === 1 ? "review" : "reviews"})
          </p>
        )}

        <p className="whitespace-pre-line text-neutral-700">
          {product.description}
        </p>

        <p className={product.inStock ? "text-green-700" : "text-red-700"}>
          {product.inStock ? "In stock" : "Out of stock"}
        </p>

        <AddToCartButton productId={product._id} disabled={!product.inStock} />
      </div>
    </article>
  );
}
