"use client";

import Link from "next/link";
import {usePaymentVerification} from "@/hooks/usePaymentVerification";

export function PaymentResult({reference}: {reference: string | null}) {
  const {status, message, retry} = usePaymentVerification(reference);

  if (status === "verifying") {
    return (
      <div className="py-16 text-center">
        <h1 className="text-2xl font-semibold">Confirming your payment...</h1>
        <p className="mt-2 text-neutral-600">Please don&apos;t close this page.</p>
      </div>
    );
  }

  if (status === "success") {
    return (
      <div className="py-16 text-center">
        <h1 className="text-2xl font-semibold">Thank you for your order!</h1>
        <p className="mt-2 text-neutral-600">Your payment was successful.</p>
        <Link
          href="/account/orders"
          className="mt-6 inline-block rounded bg-neutral-900 px-4 py-2 text-white"
        >
          View my orders
        </Link>
      </div>
    );
  }

  return (
    <div className="py-16 text-center">
      <h1 className="text-2xl font-semibold">We couldn&apos;t confirm your payment</h1>
      <p className="mt-2 text-neutral-600">{message}</p>
      <p className="mt-1 text-sm text-neutral-500">
        If you were charged, your order will still be processed automatically.
      </p>
      <div className="mt-6 flex justify-center gap-3">
        <button onClick={retry} className="rounded bg-neutral-900 px-4 py-2 text-white">
          Try again
        </button>
        <Link href="/cart" className="rounded border px-4 py-2">
          Back to cart
        </Link>
      </div>
    </div>
  );
}
