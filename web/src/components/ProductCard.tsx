import Image from "next/image";
import Link from "next/link";
import {formatPrice} from "@/lib/format";
import type {PublicProduct} from "@/lib/types";

export function ProductCard({product}: {product: PublicProduct}) {
  return (
    <Link
      href={`/products/${product._id}`}
      className="group block overflow-hidden rounded-lg border border-neutral-200 bg-white"
    >
      <div className="relative aspect-square bg-neutral-100">
        {product.images[0] && (
          <Image
            src={product.images[0]}
            alt={product.name}
            fill
            sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
            className="object-cover transition group-hover:scale-105"
          />
        )}
        {!product.inStock && (
          <span className="absolute left-2 top-2 rounded bg-neutral-900 px-2 py-0.5 text-xs text-white">
            Sold out
          </span>
        )}
      </div>
      <div className="p-3">
        <p className="text-xs text-neutral-500">{product.category}</p>
        <h3 className="mt-0.5 line-clamp-1 font-medium">{product.name}</h3>
        <p className="mt-1">{formatPrice(product.price)}</p>
      </div>
    </Link>
  );
}
