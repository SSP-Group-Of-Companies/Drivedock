"use client";

import type { ReactNode } from "react";
import { Suspense } from "react";

import QueryProvider from "@/lib/dashboard/providers/QueryProvider";
import AdminHeader from "../dashboard/components/layout/AdminHeader";

export default function AdminOnlyLayout({ children }: { children: ReactNode }) {
  return (
    <QueryProvider>
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[100] focus:rounded-lg focus:bg-white focus:px-3 focus:py-2">
        Skip to content
      </a>

      <div className="flex flex-col">
        <Suspense fallback={null}>
          <AdminHeader />
        </Suspense>

        <main id="main" role="main">
          <div className="mx-auto w-full max-w-3xl px-3 sm:px-4 md:px-6 lg:px-8 pt-4 pb-8">
            <Suspense fallback={null}>{children}</Suspense>
          </div>
        </main>
      </div>
    </QueryProvider>
  );
}
