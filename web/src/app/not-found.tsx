import Link from "next/link";
import {IoAlertCircleOutline} from "react-icons/io5";
import {StateMessage} from "@/components/StateMessage";

export default function NotFound() {
  return (
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
  );
}
