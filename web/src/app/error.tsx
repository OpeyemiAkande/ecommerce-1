"use client";

import {IoAlertCircleOutline} from "react-icons/io5";
import {StateMessage} from "@/components/StateMessage";

export default function ErrorPage({reset}: {error: Error; reset: () => void}) {
  return (
    <StateMessage
      icon={IoAlertCircleOutline}
      tone="error"
      title="Something went wrong"
      description="We couldn't load this page. Please try again."
    >
      <button onClick={reset} className="btn-primary">
        Try again
      </button>
    </StateMessage>
  );
}
