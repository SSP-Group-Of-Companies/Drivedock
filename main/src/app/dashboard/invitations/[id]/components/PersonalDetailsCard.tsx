// src/app/dashboard/invitations/[id]/components/PersonalDetailsCard.tsx
"use client";

// Reuse the styled sections from the contract personal-details page
import { PersonalInformationSection, PlaceOfBirthSection, AddressHistorySection } from "@/app/dashboard/contract/[id]/personal-details/components";

export default function PersonalDetailsCard({ personal, prequal }: { personal: any; prequal: { statusInCanada?: string } | any }) {
  const isEditMode = false; // Always read-only for invitation review
  const staged = {};
  const noop = () => {};

  return (
    <div className="rounded-xl border p-8 shadow-sm dark:shadow-none" style={{ background: "var(--color-card)", borderColor: "var(--color-outline)" }}>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold" style={{ color: "var(--color-on-surface)" }}>
          Personal Details
        </h1>
        <div className="flex items-center gap-2">
          <span className="text-sm" style={{ color: "var(--color-on-surface-variant)" }}>
            Edit Mode:
          </span>
          <span className="px-2 py-1 rounded text-xs font-medium" style={{ background: "var(--color-surface-variant)", color: "var(--color-on-surface-variant)" }}>
            DISABLED (Read-only)
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        {/* Left: Personal info (bigger) */}
        <div className="xl:col-span-7">
          <PersonalInformationSection data={personal} isEditMode={isEditMode} staged={staged} onStage={noop} prequalificationData={{ statusInCanada: prequal?.statusInCanada }} />
        </div>

        {/* Right: Place of Birth + Address history */}
        <div className="xl:col-span-5 space-y-8">
          <PlaceOfBirthSection data={personal} isEditMode={isEditMode} staged={staged} onStage={noop} />
          <AddressHistorySection data={personal} isEditMode={isEditMode} staged={staged} onStage={noop} />
        </div>
      </div>
    </div>
  );
}
