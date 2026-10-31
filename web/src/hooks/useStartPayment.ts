"use client";

import {useState} from "react";
import {toast} from "sonner";
import {ApiError} from "@/lib/api/client";
import {useApi} from "@/lib/api/useApi";
import {toShippingAddress} from "@/lib/address";
import type {Address, CartItem} from "@/lib/types";

export function useStartPayment() {
  const api = useApi();
  const [isStarting, setIsStarting] = useState(false);

  async function startPayment(address: Address, items: CartItem[]) {
    setIsStarting(true);
    try {
      const {authorization_url} = await api.post<{
        authorization_url: string;
        reference: string;
      }>("/payments/initialize-payment", {
        cartItems: items,
        shippingAddress: toShippingAddress(address),
        platform: "web"
      });

      // Leave the spinner on: the browser is navigating to Paystack.
      window.location.assign(authorization_url);
    } catch (error) {
      toast.error(
        error instanceof ApiError ? error.message : "Could not start payment"
      );
      setIsStarting(false);
    }
  }

  return {startPayment, isStarting};
}
