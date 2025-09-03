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
import StepNotReachedMessage from "../../components/StepNotReachedMessage";

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
    // If it's a 403 error, it means the driver hasn't reached the flatbed training step yet
    if (error.includes("403") || error.includes("hasn't reached this step")) {
      return (
        <StepNotReachedMessage 
          stepName="Flatbed Training"
          stepDescription="This page requires the driver to reach the flatbed training step in their onboarding process. Flatbed training is typically available after completing the drive test and is only required for certain application types."
        />
      );
    }
    
    // For other errors, show the error message
    return (
      <div className="rounded-xl border p-4 text-red-700 dark:text-red-200" style={{ background: "var(--color-card)", borderColor: "var(--color-outline)" }}>
        {error}
      </div>
    );
  }

  return <AdminFlatbedTrainingClient trackerId={trackerId} onboardingContext={data!.onboardingContext} flatbedTraining={data!.flatbedTraining} />;
}
