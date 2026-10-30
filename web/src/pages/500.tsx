import Link from "next/link";
import {IoAlertCircleOutline} from "react-icons/io5";
import {StateMessage} from "@/components/StateMessage";

// App Router error boundaries don't cover a failed first render of an ISR
// route (e.g. the API is down), so Next falls back to this static page.
export default function ServerError() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <StateMessage
        icon={IoAlertCircleOutline}
        tone="error"
        title="Something went wrong"
        description="We couldn't load this page. Please try again in a moment."
      >
        <Link href="/" className="btn-primary">
          Back to home
        </Link>
      </StateMessage>
    </main>
  );
}
