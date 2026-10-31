"use client";

import {IoAlertCircleOutline} from "react-icons/io5";
import {StateMessage} from "@/components/StateMessage";

export default function AdminError({reset}: {error: Error; reset: () => void}) {
  return (
    <StateMessage
      icon={IoAlertCircleOutline}
      tone="error"
      title="Something went wrong"
      description="This admin page failed to load."
    >
      <button onClick={reset} className="btn-primary">
        Try again
      </button>
    </StateMessage>
  );
}
