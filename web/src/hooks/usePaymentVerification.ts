"use client";

import {useEffect, useState} from "react";
import {useQueryClient} from "@tanstack/react-query";
import {ApiError} from "@/lib/api/client";
import {useApi} from "@/lib/api/useApi";
import {CART_KEY} from "@/hooks/useCart";

type State = {status: "verifying" | "success" | "failed"; message?: string};

// verify-payment is idempotent on the server, so re-running it (retry button,
// React strict-mode double effects) is safe.
export function usePaymentVerification(reference: string | null) {
  const api = useApi();
  const queryClient = useQueryClient();
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<State>({status: "verifying"});

  useEffect(() => {
    if (!reference) {
      setState({status: "failed", message: "Missing payment reference"});
      return;
    }

    let cancelled = false;
    setState({status: "verifying"});

    (async () => {
      try {
        await api.get(`/payments/verify-payment/${encodeURIComponent(reference)}`);
        await api.delete("/cart");
        await Promise.all([
          queryClient.invalidateQueries({queryKey: CART_KEY}),
          queryClient.invalidateQueries({queryKey: ["orders"]})
        ]);
        if (!cancelled) setState({status: "success"});
      } catch (error) {
        if (cancelled) return;
        setState({
          status: "failed",
          message:
            error instanceof ApiError ? error.message : "Verification failed"
        });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [api, reference, attempt, queryClient]);

  return {...state, retry: () => setAttempt((n) => n + 1)};
}
