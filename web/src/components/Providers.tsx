"use client";

import {useState} from "react";
import {QueryClient, QueryClientProvider} from "@tanstack/react-query";
import {Toaster} from "sonner";

export function Providers({children}: {children: React.ReactNode}) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {queries: {staleTime: 30_000, retry: 1}}
      })
  );

  return (
    <QueryClientProvider client={client}>
      {children}
      <Toaster
        theme="system"
        position="top-right"
        style={
          {
            "--normal-bg": "var(--surface)",
            "--normal-text": "var(--text-primary)",
            "--normal-border": "var(--line)",
            "--border-radius": "1rem"
          } as React.CSSProperties
        }
      />
    </QueryClientProvider>
  );
}
