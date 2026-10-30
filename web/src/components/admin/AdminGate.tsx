"use client";

import Link from "next/link";
import {useQuery} from "@tanstack/react-query";
import {IoLockClosedOutline} from "react-icons/io5";
import {Spinner, StateMessage} from "@/components/StateMessage";
import {useAdminApi} from "@/lib/admin/api";
import {ApiError} from "@/lib/api/client";

// One cheap admin request decides whether to show the admin at all. The
// dashboard page reads the same query key, so it isn't fetched twice.
export function AdminGate({children}: {children: React.ReactNode}) {
  const api = useAdminApi();
  const {isPending, error} = useQuery({
    queryKey: ["dashboardStats"],
    enabled: api.ready,
    retry: false,
    queryFn: api.stats.dashboard
  });

  if (isPending) return <Spinner label="Loading..." />;

  if (error instanceof ApiError && error.status === 403) {
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
