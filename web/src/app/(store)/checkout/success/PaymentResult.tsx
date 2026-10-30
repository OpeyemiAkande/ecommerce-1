"use client";

import Link from "next/link";
import {IoCheckmarkCircle, IoCloseCircle} from "react-icons/io5";
import {Spinner, StateMessage} from "@/components/StateMessage";
import {usePaymentVerification} from "@/hooks/usePaymentVerification";

export function PaymentResult({reference}: {reference: string | null}) {
  const {status, message, retry} = usePaymentVerification(reference);

  if (status === "verifying") {
    return <Spinner label="Confirming your payment... Please don't close this page." />;
  }

  if (status === "success") {
    return (
      <StateMessage
        icon={IoCheckmarkCircle}
        tone="success"
        title="Thank you for your order!"
        description="Your payment was successful."
      >
        <Link href="/account/orders" className="btn-primary">
          View my orders
        </Link>
        <Link href="/products" className="btn-secondary">
          Keep shopping
        </Link>
      </StateMessage>
    );
  }

  return (
    <StateMessage
      icon={IoCloseCircle}
      tone="error"
      title="We couldn't confirm your payment"
      description={`${message ?? ""} If you were charged, your order will still be processed automatically.`.trim()}
    >
      <button onClick={retry} className="btn-primary">
        Try again
      </button>
      <Link href="/cart" className="btn-secondary">
        Back to cart
      </Link>
    </StateMessage>
  );
}
