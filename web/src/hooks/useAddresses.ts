"use client";

import {useAuth} from "@clerk/nextjs";
import {useMutation, useQuery, useQueryClient} from "@tanstack/react-query";
import {toast} from "sonner";
import {ApiError} from "@/lib/api/client";
import {useApi} from "@/lib/api/useApi";
import type {Address} from "@/lib/types";

export type AddressInput = Omit<Address, "_id">;

const ADDRESSES_KEY = ["addresses"];

export function useAddresses() {
  const api = useApi();
  const {isSignedIn} = useAuth();
  const queryClient = useQueryClient();

  const invalidate = () =>
    queryClient.invalidateQueries({queryKey: ADDRESSES_KEY});
  const onError = (error: unknown) =>
    toast.error(
      error instanceof ApiError ? error.message : "Something went wrong"
    );

  const query = useQuery({
    queryKey: ADDRESSES_KEY,
    enabled: Boolean(isSignedIn),
    queryFn: async () =>
      (await api.get<{addresses: Address[]}>("/users/addresses")).addresses
  });

  const add = useMutation({
    mutationFn: (data: AddressInput) => api.post("/users/addresses", data),
    onSuccess: invalidate,
    onError
  });

  const update = useMutation({
    mutationFn: ({
      addressId,
      data
    }: {
      addressId: string;
      data: Partial<AddressInput>;
    }) => api.put(`/users/addresses/${addressId}`, data),
    onSuccess: invalidate,
    onError
  });

  const remove = useMutation({
    mutationFn: (addressId: string) =>
      api.delete(`/users/addresses/${addressId}`),
    onSuccess: invalidate,
    onError
  });

  return {
    addresses: query.data ?? [],
    isLoading: query.isLoading,
    addAddress: add.mutate,
    updateAddress: update.mutate,
    deleteAddress: remove.mutate,
    isAdding: add.isPending
  };
}
