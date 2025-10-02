"use client";

import DashboardContentWrapper from "@/components/dashboard/DashboardContentWrapper";
import { useInvitationList } from "@/hooks/dashboard/useInvitationList";
import { useAdminInvitationQueryState } from "@/hooks/dashboard/useAdminInvitationQueryState";
import InvitationsOperationBar from "./components/InvitationsOperationBar";
import InvitationsDataGrid from "./components/InvitationsDataGrid";
import { COMPANY_OPTIONS, APPLICATION_TYPE_OPTIONS } from "@/constants/dashboard/filters";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

export default function InvitationsPageClient() {
  const {
    data,
    isLoading,
    isFetching,
    hasData,
    isDefinitelyEmpty,
    isError,
    error,
    refetch,
    uiQuery, // InvitationQueryShape
  } = useInvitationList();

  const { setDriverName, setSort, setCompanyIds, setApplicationTypes, setPagination } = useAdminInvitationQueryState();

  // Mirror Home/Terminated clear-all: remove all filters and search and reset page
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const clearFilters = () => {
    const sp = new URLSearchParams(searchParams.toString());

    [
      "driverName",
      "companyId",
      "applicationType",
      "createdAtFrom",
      "createdAtTo",
      "page",
      "sort",
    ].forEach((k) => sp.delete(k));

    router.replace(`${pathname}?${sp.toString()}`, { scroll: false });
  };

  if (isError) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
        <div className="font-semibold">Failed to load invitations</div>
        <div className="text-sm opacity-80">{error?.message}</div>
        <button onClick={() => refetch()} className="mt-3 inline-flex rounded-lg border px-3 py-1 text-sm hover:bg-white/50 dark:hover:bg-zinc-900">
          Retry
        </button>
      </div>
    );
  }

  return (
    <DashboardContentWrapper>
      <InvitationsOperationBar
        query={uiQuery}
        onSearch={setDriverName}
        onSortChange={setSort}
        companyOptions={COMPANY_OPTIONS}
        applicationTypeOptions={APPLICATION_TYPE_OPTIONS}
        onCompanyChange={setCompanyIds}
        onApplicationTypeChange={setApplicationTypes}
        onClearAll={clearFilters}
      />

      <InvitationsDataGrid
        isLoading={isLoading}
        isFetching={isFetching}
        hasData={hasData ?? false}
        isDefinitelyEmpty={isDefinitelyEmpty ?? false}
        items={data?.items ?? []}
        page={data?.page ?? 1}
        totalPages={data?.totalPages ?? 1}
        onPageChange={setPagination}
      />
    </DashboardContentWrapper>
  );
}
