"use client";

/* eslint-disable @next/next/no-img-element */
import {useState} from "react";
import {useQuery} from "@tanstack/react-query";
import {IoAdd, IoPencil, IoTrashOutline} from "react-icons/io5";
import {Badge} from "@/components/admin/Badge";
import {DeleteProductModal} from "@/components/admin/DeleteProductModal";
import {ProductFormModal} from "@/components/admin/ProductFormModal";
import {Spinner} from "@/components/StateMessage";
import {useAdminApi} from "@/lib/admin/api";
import {stockStatus} from "@/lib/admin/utils";
import {formatPrice} from "@/lib/format";
import type {Product} from "@/lib/types";

export default function ProductsPage() {
  const api = useAdminApi();
  // `undefined`: form closed. `null`: creating. A product: editing it.
  const [editing, setEditing] = useState<Product | null | undefined>(undefined);
  const [deleting, setDeleting] = useState<Product | null>(null);

  const {data: products = [], isLoading} = useQuery({
    queryKey: ["products"],
    enabled: api.ready,
    queryFn: api.products.list
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Products</h2>
          <p className="mt-1 text-text-secondary">Manage your product inventory</p>
        </div>

        <button className="btn-primary" onClick={() => setEditing(null)}>
          <IoAdd size={20} />
          Add Product
        </button>
      </div>

      {isLoading ? (
        <Spinner />
      ) : products.length === 0 ? (
        <div className="card py-12 text-center">
          <p className="text-xl font-semibold">No products yet</p>
          <p className="mt-1 text-sm text-text-secondary">
            Add your first product to start selling.
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {products.map((product) => {
            const status = stockStatus(product.stock);

            return (
              <div
                key={product._id}
                className="card flex flex-wrap items-center gap-4 p-4"
              >
                <img
                  src={product.images[0]}
                  alt={product.name}
                  className="size-20 rounded-2xl object-cover"
                />

                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="truncate font-semibold">{product.name}</h3>
                      <p className="text-sm text-text-secondary">
                        {product.category}
                      </p>
                    </div>
                    <Badge tone={status.tone}>{status.text}</Badge>
                  </div>

                  <div className="mt-3 flex gap-8">
                    <div>
                      <p className="text-xs text-text-tertiary">Price</p>
                      <p className="text-lg font-bold">
                        {formatPrice(product.price)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-text-tertiary">Stock</p>
                      <p className="text-lg font-bold">{product.stock} units</p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    className="icon-btn"
                    onClick={() => setEditing(product)}
                    aria-label={`Edit ${product.name}`}
                  >
                    <IoPencil size={18} />
                  </button>
                  <button
                    className="icon-btn text-accent-red"
                    onClick={() => setDeleting(product)}
                    aria-label={`Delete ${product.name}`}
                  >
                    <IoTrashOutline size={18} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {editing !== undefined && (
        <ProductFormModal
          key={editing?._id ?? "new"}
          product={editing}
          onClose={() => setEditing(undefined)}
        />
      )}

      {deleting && (
        <DeleteProductModal
          key={deleting._id}
          product={deleting}
          onClose={() => setDeleting(null)}
        />
      )}
    </div>
  );
}
