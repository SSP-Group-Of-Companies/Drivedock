/**
 * submitFormStep.ts
 *
 * Submits a form step (POST or PATCH) to the appropriate API endpoint.
 * Automatically detects whether it's an initial submission or a resume/update.
 *
 * Features:
 * - POST to `/api/v1/onboarding/application-form` for new applicants
 * - PATCH to `/api/v1/onboarding/[trackerId]/application-form/page-X` for resumes
 * - Automatically handles file vs JSON payload formats
 * - Handles "resume with tracker" flow if record already exists
 *
 * Returns:
 * - `trackerContext` from server response (used to update Zustand + route forward)
 *
 * Used in:
 * - <ContinueButton /> component
 * - All form pages (Page 1–5, Policies, etc.)
 */

import { ITrackerContext } from "@/types/onboardingTracker.type";

type Scope = "application-form" | "prequalifications" | "policies-consents";

export async function submitFormStep({
  json,
  tracker,
  submitSegment,
  urlTrackerId,
  scope = "application-form",
}: {
  json: any;
  tracker: ITrackerContext | null;
  submitSegment: string; // e.g. "page-1", "page-2"
  urlTrackerId?: string;
  scope?: Scope;
}): Promise<{ trackerContext?: ITrackerContext; nextUrl?: string }> {
  const id = tracker?.id || urlTrackerId;
  const isPatch = !!id;

  const url = !isPatch
    ? `/api/v1/onboarding/application-form` // only scope that supports POST
    : scope === "application-form"
    ? `/api/v1/onboarding/${id}/application-form/${submitSegment}`
    : `/api/v1/onboarding/${id}/${scope}`;

  const res = await fetch(url, {
    method: isPatch ? "PATCH" : "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(json),
  });

  if (!res.ok) throw new Error((await res.text()) || "Submission failed");
  const data = await res.json();
  return {
    trackerContext: data?.data?.onboardingContext,
    nextUrl: data?.data?.onboardingContext?.nextUrl,
  };
}
