import { ITrackerContext } from "@/store/useOnboardingTracker";

type SubmitFormStepParams = {
  json: any;
  tracker: ITrackerContext | null;
  nextRoute: string;
  urlTrackerId?: string;
};

export async function submitFormStep({
  json,
  tracker,
  nextRoute,
  urlTrackerId,
}: SubmitFormStepParams): Promise<{ trackerContext?: ITrackerContext }> {
  const effectiveTrackerId = tracker?.id || urlTrackerId;
  const isPatch = !!effectiveTrackerId;

  const pageSegment = nextRoute.split("/").pop() ?? "page-1";

  const url = isPatch
    ? `/api/v1/onboarding/${effectiveTrackerId}/application-form/${pageSegment}`
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

    // Handle "already exists" error for POST
    if (!isPatch && res.status === 400 && errorText.includes("already exists")) {
      try {
        const errorData = JSON.parse(errorText);
        const existingTrackerId = errorData.trackerId;

        if (existingTrackerId) {
          const patchUrl = `/api/v1/onboarding/${existingTrackerId}/application-form/${pageSegment}`;
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
