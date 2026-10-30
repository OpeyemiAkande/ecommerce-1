import Link from "next/link";
import {IoAlertCircleOutline} from "react-icons/io5";
import {StateMessage} from "@/components/StateMessage";
import {StoreChrome} from "@/components/StoreChrome";

export default function NotFound() {
  return (
    <StoreChrome>
      <StateMessage
        icon={IoAlertCircleOutline}
        tone="error"
        title="Page not found"
        description="That page doesn't exist or is no longer available."
      >
        <Link href="/products" className="btn-primary">
          Browse products
        </Link>
      </StateMessage>
    </StoreChrome>
  );
}
