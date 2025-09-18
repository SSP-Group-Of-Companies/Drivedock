import { IOnboardingTrackerContext } from "@/types/onboardingTracker.types";
import { buildOnboardingStepPath } from "../utils/onboardingUtils";
import { apiClient } from "../onboarding/apiClient";
import { ErrorManager } from "../onboarding/errorManager";

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

  // Set retry callback for error handling
  const errorManager = ErrorManager.getInstance();
  errorManager.setRetryCallback(() => {
    return submitFormStep({ json, tracker, submitSegment, urlTrackerId, scope });
  });

  const response = isPatch 
    ? await apiClient.patch(url, json)
    : await apiClient.post(url, json);

  // Clear retry callback after successful response
  errorManager.clearRetryCallback();

  if (!response.success) {
    throw new Error("Submission failed");
  }

  const trackerContext: IOnboardingTrackerContext = (response.data as any)?.onboardingContext;
  const nextStep = trackerContext?.nextStep || null;
  
  if (!trackerContext) {
    throw new Error("trackerContext missing");
  }

  const nextUrl = nextStep
    ? buildOnboardingStepPath(trackerContext, nextStep)
    : null;
    
  return {
    trackerContext,
    nextUrl,
  };
}
