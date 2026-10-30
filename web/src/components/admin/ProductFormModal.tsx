"use client";

/* eslint-disable @next/next/no-img-element */
import {useEffect, useState} from "react";
import {useMutation, useQueryClient} from "@tanstack/react-query";
import {toast} from "sonner";
import {IoImageOutline} from "react-icons/io5";
import {useAdminApi} from "@/lib/admin/api";
import {PRODUCT_CATEGORIES, getErrorMessage} from "@/lib/admin/utils";
import {CURRENCY} from "@/lib/config";
import type {Product} from "@/lib/types";
import {Modal} from "./Modal";

const MAX_IMAGES = 3;

// Mount with a `key` per product so the form starts fresh each time.
// `product` null means "create".
export function ProductFormModal({
  product,
  onClose
}: {
  product: Product | null;
  onClose: () => void;
}) {
  const api = useAdminApi();
  const queryClient = useQueryClient();

  const [form, setForm] = useState({
    name: product?.name ?? "",
    category: product?.category ?? "",
    price: product?.price.toString() ?? "",
    stock: product?.stock.toString() ?? "",
    description: product?.description ?? ""
  });
  const [images, setImages] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>(product?.images ?? []);

  // Object URLs for newly picked files are released when replaced or on close.
  useEffect(
    () => () =>
      previews.forEach((url) => {
        if (url.startsWith("blob:")) URL.revokeObjectURL(url);
      }),
    [previews]
  );

  const save = useMutation({
    mutationFn: (data: FormData) =>
      product
        ? api.products.update({id: product._id, form: data})
        : api.products.create(data),
    onSuccess: (saved) => {
      queryClient.invalidateQueries({queryKey: ["products"]});
      queryClient.invalidateQueries({queryKey: ["dashboardStats"]});
      toast.success(`"${saved.name}" was ${product ? "updated" : "added"}`);
      onClose();
    },
    onError: (error) => {
      toast.error(
        getErrorMessage(
          error,
          product ? "Failed to update product" : "Failed to add product"
        )
      );
    }
  });

  const set =
    (field: keyof typeof form) =>
    (
      e: React.ChangeEvent<
        HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
      >
    ) =>
      setForm({...form, [field]: e.target.value});

  const handleImages = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length > MAX_IMAGES) {
      toast.error(`Maximum ${MAX_IMAGES} images allowed`);
      e.target.value = "";
      return;
    }
    setImages(files);
    setPreviews(files.map((file) => URL.createObjectURL(file)));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!product && previews.length === 0) {
      toast.error("Please upload at least one image");
      return;
    }

    const data = new FormData();
    Object.entries(form).forEach(([key, value]) => data.append(key, value));
    images.forEach((image) => data.append("images", image));
    save.mutate(data);
  };

  return (
    <Modal
      title={product ? "Edit Product" : "Add New Product"}
      onClose={onClose}
      closeDisabled={save.isPending}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block space-y-1.5 text-sm font-medium">
            Product Name
            <input
              className="input"
              placeholder="Enter product name"
              value={form.name}
              onChange={set("name")}
              required
            />
          </label>

          <label className="block space-y-1.5 text-sm font-medium">
            Category
            <select
              className="select"
              value={form.category}
              onChange={set("category")}
              required
            >
              <option value="">Select category</option>
              {PRODUCT_CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block space-y-1.5 text-sm font-medium">
            Price ({CURRENCY})
            <input
              type="number"
              step="0.01"
              min="0"
              className="input"
              placeholder="0.00"
              value={form.price}
              onChange={set("price")}
              required
            />
          </label>

          <label className="block space-y-1.5 text-sm font-medium">
            Stock
            <input
              type="number"
              min="0"
              className="input"
              placeholder="0"
              value={form.stock}
              onChange={set("stock")}
              required
            />
          </label>
        </div>

        <label className="block space-y-1.5 text-sm font-medium">
          Description
          <textarea
            className="textarea h-28"
            placeholder="Enter product description"
            value={form.description}
            onChange={set("description")}
            required
          />
        </label>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm font-medium">
            <span className="flex items-center gap-2">
              <IoImageOutline size={20} />
              Product Images
            </span>
            <span className="text-xs text-text-tertiary">
              Max {MAX_IMAGES} images
            </span>
          </div>

          <input
            type="file"
            accept="image/*"
            multiple
            aria-label="Product images"
            onChange={handleImages}
            className="input"
            required={!product}
          />
          {product && (
            <p className="text-xs text-text-tertiary">
              Leave empty to keep the current images.
            </p>
          )}

          {previews.length > 0 && (
            <div className="flex gap-2">
              {previews.map((src, index) => (
                <img
                  key={src}
                  src={src}
                  alt={`Preview ${index + 1}`}
                  className="size-20 rounded-xl object-cover"
                />
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            className="btn-secondary"
            onClick={onClose}
            disabled={save.isPending}
          >
            Cancel
          </button>
          <button type="submit" className="btn-primary" disabled={save.isPending}>
            {save.isPending
              ? "Saving..."
              : product
                ? "Update Product"
                : "Add Product"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
