"use client";

import {useEffect, useRef} from "react";
import Link from "next/link";
import {useRouter} from "next/navigation";
import {useQuery} from "@tanstack/react-query";
import {IoLockClosedOutline} from "react-icons/io5";
import {Spinner, StateMessage} from "@/components/StateMessage";
import {useAdminApi} from "@/lib/admin/api";
import {ApiError} from "@/lib/api/client";

// The server layout already checked access before rendering the admin. This
// covers access being revoked mid-session: the first admin request to answer
// 403 makes the server re-check, which renders the 403 page. If that doesn't
// resolve it, the inline message below is the fallback. The dashboard page
// reads the same query key, so the request isn't made twice.
export function AdminGate({children}: {children: React.ReactNode}) {
  const api = useAdminApi();
  const router = useRouter();
  const refreshed = useRef(false);
  const {isPending, error} = useQuery({
    queryKey: ["dashboardStats"],
    enabled: api.ready,
    retry: false,
    queryFn: api.stats.dashboard
  });

  const denied = error instanceof ApiError && error.status === 403;

  useEffect(() => {
    if (denied && !refreshed.current) {
      refreshed.current = true;
      router.refresh();
    }
  }, [denied, router]);

  if (isPending) return <Spinner label="Loading..." />;

  if (denied) {
    return (
      <StateMessage
        icon={IoLockClosedOutline}
        tone="error"
        title="You don't have access"
        description="This area is only for store administrators."
      >
        <Link href="/" className="btn-primary">
          Back to the store
        </Link>
      </StateMessage>
    );
  }

  return <>{children}</>;
}
