"use client";

import {useMemo} from "react";
import {useAuth} from "@clerk/nextjs";
import {API_URL} from "@/lib/config";
import {createApiClient} from "./client";

export function useApi() {
  const {getToken} = useAuth();

  return useMemo(
    () =>
      createApiClient({
        baseUrl: API_URL,
        getToken: () => getToken(),
        onUnauthorized: () => {
          const here = window.location.pathname + window.location.search;
          window.location.assign(
            `/sign-in?redirect_url=${encodeURIComponent(here)}`
          );
        }
      }),
    [getToken]
  );
}
