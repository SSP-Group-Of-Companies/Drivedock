"use client";

/**
 * QueryProvider
 * --------------
 * Production-safe TanStack Query (v5) provider with sensible defaults.
 * - Keeps queries fresh without spamming the network.
 * - Disables noisy refetch-on-focus (admins often multitask).
 * - Centralizes retry & cache timing so all hooks behave consistently.
 *
 * Usage:
 *   <QueryProvider>
 *     {children}
 *   </QueryProvider>
 *
 * Will be mounted in /app/dashboard/layout.tsx to wrap the entire dashboard area.
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
// Optional: uncomment if you want the devtools during development
// import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

type Props = Readonly<{ children: ReactNode }>;

export default function QueryProvider({ children }: Props) {
  // Factory form creates a single stable client instance for this tab/session.
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000, // 30s
            gcTime: 5 * 60_000, // 5m
            refetchOnWindowFocus: false, // avoid surprise refreshes
            retry: 2,
          },
          mutations: { retry: 0 },
        },
      })
  );

  return (
    <QueryClientProvider client={client}>
      {children}
      {/* {process.env.NODE_ENV !== 'production' && <ReactQueryDevtools initialIsOpen={false} />} */}
    </QueryClientProvider>
  );
}
