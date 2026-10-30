import Link from "next/link";
import {IoLockClosedOutline} from "react-icons/io5";
import {StateMessage} from "@/components/StateMessage";
import {StoreChrome} from "@/components/StoreChrome";

// Rendered with a real 403 status whenever forbidden() is called.
export default function Forbidden() {
  return (
    <StoreChrome>
      <StateMessage
        icon={IoLockClosedOutline}
        tone="error"
        title="You don't have access"
        description="This area is only for store administrators. If you think this is a mistake, sign in with a different account."
      >
        <Link href="/" className="btn-primary">
          Back to the store
        </Link>
        <Link href="/sign-in?redirect_url=/admin" className="btn-secondary">
          Use a different account
        </Link>
      </StateMessage>
    </StoreChrome>
  );
}
