"use client";

/**
 * HomeClient
 * ----------
 * Mobile-first composer for the homepage.
 * - Keeps URL as the single source of truth
 * - Renders Tabs → OperationBar → DataGrid
 * - Adds min-w-0 so children can shrink without causing overflow on mobile
 */

import { Suspense } from "react";
import { useOnboardingList } from "@/hooks/dashboard/useOnboardingList";
import { useAdminOnboardingQueryState } from "@/hooks/dashboard/useAdminOnboardingQueryState";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import CategoriesTabs from "@/app/dashboard/components/categories/CategoriesTabs";
import DataOperationBar from "@/app/dashboard/components/operations/DataOperationBar";
import DataGrid from "@/app/dashboard/components/table/DataGrid";

import {
  COMPANY_OPTIONS,
  APPLICATION_TYPE_OPTIONS,
} from "@/constants/dashboard/filters";

function HomeClientContent() {
  // Data (React Query)
  const { data, isLoading, isFetching, isError, error, refetch, uiQuery } =
    useOnboardingList();

  // URL-driven state + setters
  const {
    setTab,
    setDriverName,
    setSort,
    setCompleted,
    setTerminated,
    setCEState,
    setDTState,
    setPagination,
    setCompanyIds,
    setApplicationTypes,
    setCreatedRange,
  } = useAdminOnboardingQueryState();

  // 🔽 single-shot clear implemented with one router.replace
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const clearAllFilters = () => {
    const sp = new URLSearchParams(searchParams.toString());

    // remove everything that's a filter/search/slice of the grid
    [
      "driverName",
      "companyId",
      "applicationType",
      "createdAtFrom",
      "createdAtTo",
      "carriersEdgeTrainingEmailSent",
      "drugTestDocumentsUploaded",
      "completed",
      "terminated",
      "page",
    ].forEach((k) => sp.delete(k));

    // optional: reset tab and sort; keep or remove these lines as you prefer
    sp.set("tab", "all");
    // sp.set("sort", "updatedAt:desc"); // uncomment if you want sort reset too

    router.replace(`${pathname}?${sp.toString()}`, { scroll: false });
  };

  if (isError) {
    return (
      <div
        className="rounded-xl border p-4"
        style={{
          borderColor: "var(--color-error)",
          backgroundColor: "var(--color-error)",
          color: "white",
        }}
        aria-live="polite"
      >
        <div className="font-semibold">Failed to load onboarding list</div>
        <div className="text-sm opacity-80">{error?.message}</div>
        <button
          onClick={() => refetch()}
          className="mt-3 inline-flex rounded-lg border px-3 py-2 text-sm transition-colors duration-200 w-full sm:w-auto justify-center"
          style={{
            borderColor: "rgba(255, 255, 255, 0.3)",
            color: "white",
            backgroundColor: "rgba(255, 255, 255, 0.1)",
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-[1400px] space-y-3 sm:space-y-4 flex h-full min-h-0 flex-col ">
      {/* Categories with counts (All / Drive Test / Carrier's Edge / Drug Test) */}
      <CategoriesTabs
        currentTab={uiQuery.currentTab}
        counts={data?.counts}
        onChangeTab={setTab}
      />

      {/* Data operation row — URL-synced controls */}
      <DataOperationBar
        query={uiQuery}
        onSearch={setDriverName}
        onSortChange={setSort}
        onCompletedToggle={setCompleted}
        onTerminatedToggle={setTerminated}
        onCEStateChange={setCEState}
        onDTStateChange={setDTState}
        companyOptions={COMPANY_OPTIONS}
        applicationTypeOptions={APPLICATION_TYPE_OPTIONS}
        onCompanyChange={setCompanyIds}
        onApplicationTypeChange={setApplicationTypes}
        onCreatedRangeChange={setCreatedRange}
        onClearAll={clearAllFilters}
      />

      {/* Data grid */}
      <DataGrid
        isLoading={isLoading}
        isFetching={isFetching}
        items={data?.items ?? []}
        page={data?.page ?? 1}
        totalPages={data?.totalPages ?? 1}
        currentTab={uiQuery.currentTab}
        onPageChange={(p) => setPagination(p)}
      />
    </div>
  );
}

export default function HomeClient() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <HomeClientContent />
    </Suspense>
  );
}
