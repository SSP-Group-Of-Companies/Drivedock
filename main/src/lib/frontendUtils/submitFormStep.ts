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
  const id = tracker?.id || urlTrackerId;
  const isPatch = !!id;

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
