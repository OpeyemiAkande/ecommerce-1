import Image from "next/image";
import Link from "next/link";
import {IoStar} from "react-icons/io5";
import {QuickAddButton} from "@/components/QuickAddButton";
import {formatPrice} from "@/lib/format";
import type {PublicProduct} from "@/lib/types";

export function ProductCard({product}: {product: PublicProduct}) {
  return (
    <div className="card group flex flex-col overflow-hidden">
      <Link href={`/products/${product._id}`} className="block flex-1">
        <div className="relative aspect-square bg-background-lighter">
          {product.images[0] && (
            <Image
              src={product.images[0]}
              alt={product.name}
              fill
              sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
              className="object-cover transition duration-300 group-hover:scale-105"
            />
          )}
          {!product.inStock && (
            <span className="absolute left-3 top-3 rounded-full bg-black/60 px-3 py-1 text-xs font-bold text-white backdrop-blur">
              Sold out
            </span>
          )}
        </div>

        <div className="px-3 pt-3">
          <p className="mb-1 text-xs text-text-secondary">{product.category}</p>
          <h3 className="mb-2 line-clamp-2 min-h-10 text-sm font-bold">
            {product.name}
          </h3>

          {product.totalReviews > 0 && (
            <div className="mb-2 flex items-center text-xs">
              <IoStar size={12} className="text-accent-yellow" />
              <span className="ml-1 font-semibold">
                {product.averageRating.toFixed(1)}
              </span>
              <span className="ml-1 text-text-secondary">
                ({product.totalReviews})
              </span>
            </div>
          )}
        </div>
      </Link>

      <div className="flex items-center justify-between px-3 pb-3">
        <span className="text-lg font-bold text-primary-text">
          {formatPrice(product.price)}
        </span>
        <QuickAddButton
          productId={product._id}
          name={product.name}
          disabled={!product.inStock}
        />
      </div>
    </div>
  );
}
