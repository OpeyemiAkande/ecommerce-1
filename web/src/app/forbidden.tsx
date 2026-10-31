import Link from "next/link";
import {SignOutButton} from "@clerk/nextjs";
import {IoLockClosedOutline} from "react-icons/io5";
import {StateMessage} from "@/components/StateMessage";

// Rendered with a real 403 status whenever forbidden() is called. A standalone
// page on purpose: no storefront header.
export default function Forbidden() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      {/* Nudged up 52px so it sits a little above true center. */}
      <div className="-translate-y-[52px]">
        <StateMessage
          icon={IoLockClosedOutline}
          tone="error"
          title="You don't have access"
          description="This area is only for store administrators. If you think this is a mistake, sign in with a different account."
        >
          <Link href="/" className="btn-primary">
            Back to the store
          </Link>
          {/* Sign out first: /sign-in alone would send a signed-in user straight back. */}
          <SignOutButton redirectUrl="/sign-in?redirect_url=/admin">
            <button className="btn-secondary">Use a different account</button>
          </SignOutButton>
        </StateMessage>
      </div>
    </div>
  );
}
