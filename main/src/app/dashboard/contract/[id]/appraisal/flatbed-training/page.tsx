// src/app/dashboard/contract/appraisal/[id]/flatbed-training/page.tsx
"use server";

/**
 * DriveDock Admin — Flatbed Training (Server Wrapper)
 *
 * Responsibilities
 * - Fetch flatbed-training state for a tracker
 * - Pass payload directly to the client
 *
 * Notes
 * - Uses resolveInternalBaseUrl + fetchServerPageData for same-origin and cookies
 */

import "server-only";
import AdminFlatbedTrainingClient from "./AdminFlatbedTrainingClient";

import type { IFlatbedTraining } from "@/types/flatbedTraining.types";
import type { IOnboardingTrackerContext } from "@/types/onboardingTracker.types";
import { resolveInternalBaseUrl } from "@/lib/utils/urlHelper.server";
import { fetchServerPageData } from "@/lib/utils/fetchServerPageData";

type FlatbedResult = {
  onboardingContext: IOnboardingTrackerContext;
  flatbedTraining: IFlatbedTraining | null;
};

export default async function FlatbedTrainingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: trackerId } = await params;

  const base = await resolveInternalBaseUrl();
  const url = `${base}/api/v1/admin/onboarding/${trackerId}/appraisal/flatbed-training`;

  const { data, error } = await fetchServerPageData<FlatbedResult>(url);

  if (error) {
    return (
      <div className="rounded-xl border p-4 text-red-700 dark:text-red-200" style={{ background: "var(--color-card)", borderColor: "var(--color-outline)" }}>
        {error}
      </div>
    );
  }

  return <AdminFlatbedTrainingClient trackerId={trackerId} onboardingContext={data!.onboardingContext} flatbedTraining={data!.flatbedTraining} />;
}
