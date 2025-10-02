// src/app/dashboard/invitations/[id]/components/PrequalificationCard.tsx
"use client";

import { getCompanyById } from "@/constants/companies";
// Reuse the existing styled read-only sections from your contract page
import { OptionalsSection, MandatorySection, CategoriesSection } from "@/app/dashboard/contract/[id]/prequalification/components";

export default function PrequalificationCard({ prequal, companyId }: { prequal: any; companyId?: string }) {
  const company = companyId ? getCompanyById(companyId) : null;

  return (
    <div className="rounded-xl border p-8 shadow-sm dark:shadow-none" style={{ background: "var(--color-card)", borderColor: "var(--color-outline)" }}>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold" style={{ color: "var(--color-on-surface)" }}>
          Prequalification
        </h1>
        <div className="flex items-center gap-2">
          <span className="text-sm" style={{ color: "var(--color-on-surface-variant)" }}>
            Edit Mode:
          </span>
          <span className="px-2 py-1 rounded text-xs font-medium" style={{ background: "var(--color-surface-variant)", color: "var(--color-on-surface-variant)" }}>
            DISABLED (Read-only driver answers)
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-12 gap-6 lg:gap-8">
        <div className="lg:col-span-1 xl:col-span-4">
          <OptionalsSection data={prequal || {}} company={company} />
        </div>
        <div className="lg:col-span-1 xl:col-span-3">
          <MandatorySection data={prequal || {}} company={company} />
        </div>
        <div className="lg:col-span-2 xl:col-span-5">
          <CategoriesSection data={prequal || {}} />
        </div>
      </div>
    </div>
  );
}
