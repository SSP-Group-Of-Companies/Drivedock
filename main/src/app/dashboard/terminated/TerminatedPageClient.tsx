"use client";

import { useEffect } from "react";
import { useOnboardingList } from "@/hooks/dashboard/useOnboardingList";
import { useAdminOnboardingQueryState } from "@/hooks/dashboard/useAdminOnboardingQueryState";
import DataOperationBar from "@/app/dashboard/components/operations/DataOperationBar";
import DataGrid from "@/app/dashboard/components/table/DataGrid";
import {
  COMPANY_OPTIONS,
  APPLICATION_TYPE_OPTIONS,
} from "@/constants/dashboard/filters";

export default function TerminatedPageClient() {
  const { data, isLoading, isFetching, isError, error, refetch, uiQuery } =
    useOnboardingList();
  const {
    setDriverName,
    setSort,
    setCompleted,
    setTerminated,
    setCompanyIds,
    setApplicationTypes,
    setPagination,
  } = useAdminOnboardingQueryState();

  // Ensure we are scoped to terminated=true (once). Guarded by the no-op protection in setMany.
  useEffect(() => {
    if (uiQuery.terminated !== true) {
      setTerminated(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uiQuery.terminated]);

  if (isError) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
        <div className="font-semibold">Failed to load terminated list</div>
        <div className="text-sm opacity-80">{error?.message}</div>
        <button
          onClick={() => refetch()}
          className="mt-3 inline-flex rounded-lg border px-3 py-1 text-sm hover:bg-white/50 dark:hover:bg-zinc-900"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Operation bar: search/sort/filters; terminated is locked */}
      <DataOperationBar
        query={uiQuery}
        onSearch={setDriverName}
        onSortChange={setSort}
        onCompletedToggle={setCompleted}
        onTerminatedToggle={setTerminated}
        onCEStateChange={() => {
          /* hidden on this page */
        }}
        onDTStateChange={() => {
          /* hidden on this page */
        }}
        companyOptions={COMPANY_OPTIONS}
        applicationTypeOptions={APPLICATION_TYPE_OPTIONS}
        onCompanyChange={setCompanyIds}
        onApplicationTypeChange={setApplicationTypes}
        lockedTerminated //  keep the page scoped to terminated
        showCompletedToggle={false} // optional: hide completed on terminated view
      />

      <DataGrid
        isLoading={isLoading}
        isFetching={isFetching}
        items={data?.items ?? []}
        page={data?.page ?? 1}
        totalPages={data?.totalPages ?? 1}
        currentTab={"all"}
        onPageChange={(p) => setPagination(p)}
        mode="terminated" //  tells the grid to show "Restore"
      />
    </div>
  );
}
