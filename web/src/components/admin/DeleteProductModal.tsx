"use client";

/* eslint-disable @next/next/no-img-element */
import {useMutation, useQueryClient} from "@tanstack/react-query";
import {toast} from "sonner";
import {IoWarningOutline} from "react-icons/io5";
import {useAdminApi} from "@/lib/admin/api";
import {getErrorMessage} from "@/lib/admin/utils";
import type {Product} from "@/lib/types";
import {Modal} from "./Modal";

export function DeleteProductModal({
  product,
  onClose
}: {
  product: Product;
  onClose: () => void;
}) {
  const api = useAdminApi();
  const queryClient = useQueryClient();

  const remove = useMutation({
    mutationFn: () => api.products.remove(product._id),
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: ["products"]});
      queryClient.invalidateQueries({queryKey: ["dashboardStats"]});
      toast.success(`"${product.name}" was deleted`);
      onClose();
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, "Failed to delete product"));
    }
  });

  return (
    <Modal
      title="Delete Product"
      onClose={onClose}
      closeDisabled={remove.isPending}
      maxWidth="max-w-md"
    >
      <div className="space-y-4">
        <div className="flex items-center gap-4 rounded-2xl bg-background-lighter p-4">
          <img
            src={product.images[0]}
            alt={product.name}
            className="size-16 rounded-xl object-cover"
          />
          <div>
            <h3 className="font-semibold">{product.name}</h3>
            <p className="text-sm text-text-secondary">{product.category}</p>
          </div>
        </div>

        <div className="flex items-start gap-3 text-accent-red">
          <IoWarningOutline size={20} className="mt-0.5 shrink-0" />
          <p className="text-sm">
            This permanently removes the product and its images. This action
            cannot be undone.
          </p>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            className="btn-secondary"
            onClick={onClose}
            disabled={remove.isPending}
          >
            Cancel
          </button>
          <button
            type="button"
            className="inline-flex items-center justify-center rounded-2xl bg-accent-red px-6 py-3.5 font-bold text-white transition hover:opacity-90 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50"
            onClick={() => remove.mutate()}
            disabled={remove.isPending}
          >
            {remove.isPending ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
