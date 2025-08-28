import { IOnboardingTrackerContext } from "@/types/onboardingTracker.types";
import { buildOnboardingStepPath } from "../utils/onboardingUtils";

type Scope = "application-form" | "prequalifications" | "policies-consents";

export async function submitFormStep({
  json,
  tracker,
  submitSegment,
  urlTrackerId,
  scope = "application-form",
}: {
  json: any;
  tracker: IOnboardingTrackerContext | null;
  submitSegment: string;
  urlTrackerId?: string;
  scope?: Scope;
}): Promise<{
  trackerContext?: IOnboardingTrackerContext;
  nextUrl?: string | null;
}> {
  // For new users (no urlTrackerId), always use POST regardless of tracker state
  // For existing users (with urlTrackerId), use the tracker id or urlTrackerId
  const id = urlTrackerId || tracker?.id;
  const isPatch = !!urlTrackerId; // Only PATCH if we have a URL tracker ID (existing user)

  const url = !isPatch
    ? "/api/v1/onboarding/application-form"
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
  const trackerContext: IOnboardingTrackerContext =
    data?.data?.onboardingContext;
  const nextStep = trackerContext.nextStep || null;
  if (!trackerContext) throw new Error("trackerContext missing");
  const nextUrl = nextStep
    ? buildOnboardingStepPath(trackerContext, nextStep)
    : null;
  return {
    trackerContext,
    nextUrl,
  };
}
