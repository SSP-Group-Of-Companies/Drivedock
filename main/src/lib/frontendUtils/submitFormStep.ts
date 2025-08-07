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

type SubmitFormStepParams = {
  json: any;
  tracker: ITrackerContext | null;
  submitSegment: string;
  urlTrackerId?: string;
};

export async function submitFormStep({
  json,
  tracker,
  submitSegment,
  urlTrackerId,
}: SubmitFormStepParams): Promise<{ trackerContext?: ITrackerContext }> {
  const effectiveTrackerId = tracker?.id || urlTrackerId;
  const isPatch = !!effectiveTrackerId;

  const url = isPatch
    ? `/api/v1/onboarding/${effectiveTrackerId}/application-form/${submitSegment}`
    : `/api/v1/onboarding/application-form`;

  const options: RequestInit = {
    method: isPatch ? "PATCH" : "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(json),
  };

  const res = await fetch(url, options);

  if (!res.ok) {
    const errorText = await res.text();

    // Handle "already exists" error on POST → Retry as PATCH
    if (
      !isPatch &&
      res.status === 400 &&
      errorText.includes("already exists")
    ) {
      try {
        const errorData = JSON.parse(errorText);
        const existingTrackerId = errorData.trackerId;

        if (existingTrackerId) {
          const patchUrl = `/api/v1/onboarding/${existingTrackerId}/application-form/${submitSegment}`;
          const patchRes = await fetch(patchUrl, {
            ...options,
            method: "PATCH",
          });

          if (!patchRes.ok) {
            throw new Error(await patchRes.text());
          }

          const patchData = await patchRes.json();
          return {
            trackerContext: patchData?.data?.onboardingContext,
          };
        }
      } catch {
        throw new Error(errorText);
      }
    }

    throw new Error(errorText);
  }

  const data = await res.json();
  return {
    trackerContext: data?.data?.onboardingContext,
  };
}
