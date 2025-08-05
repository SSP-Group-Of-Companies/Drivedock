import { ITrackerContext } from "@/store/useOnboardingTracker";

type SubmitFormStepParams = {
  formData: FormData;
  tracker: ITrackerContext | null;
  nextRoute: string;
  urlTrackerId?: string; // Optional tracker ID from URL
};

export async function submitFormStep({
  formData,
  tracker,
  nextRoute,
  urlTrackerId,
}: SubmitFormStepParams): Promise<{ trackerContext?: ITrackerContext }> {
  // Use URL tracker ID if Zustand tracker is null
  const effectiveTrackerId = tracker?.id || urlTrackerId;
  const isPatch = !!effectiveTrackerId;

  // Extract final segment from route (e.g., "page-2", "policies-consents")
  const pageSegment = nextRoute.split("/").pop() ?? "page-1";

  const url = isPatch
    ? `/api/v1/onboarding/${effectiveTrackerId}/application-form/${pageSegment}`
    : `/api/v1/onboarding/application-form`;

  const method = isPatch ? "PATCH" : "POST";

  const postFormKey = "applicationFormPage1";
  const jsonPages = ["page-2", "page-3", "page-5"];
  const isJsonRequest = isPatch && jsonPages.includes(pageSegment);
  const isInitialPost = !isPatch && formData.has(postFormKey);

  const options: RequestInit = {
    method,
  };

  if (isJsonRequest) {
    const jsonKey = pageSegment.replace("-", ""); // e.g., "page-2" → "page2"
    const jsonString = formData.get(jsonKey) as string;

    if (!jsonString) {
      throw new Error(`Missing JSON payload for ${jsonKey}`);
    }

    options.headers = {
      "Content-Type": "application/json",
    };
    options.body = jsonString;
  } else if (isInitialPost) {
    // ✅ Page 1 initial POST — uses multipart/form-data
    options.body = formData;
  } else {
    // ✅ PATCH with formData (e.g., Page 1 resume or file-based PATCH)
    options.body = formData;
  }

  console.log("Submitting page segment:", pageSegment);
  console.log("FormData keys:", Array.from(formData.keys()));

  const res = await fetch(url, options);

  if (!res.ok) {
    const errorText = await res.text();

    // Handle "already exists" error for POST requests
    if (
      !isPatch &&
      res.status === 400 &&
      errorText.includes("already exists")
    ) {
      try {
        const errorData = JSON.parse(errorText);
        const existingTrackerId = errorData.trackerId;

        if (existingTrackerId) {
          // Retry as PATCH with existing tracker ID
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
        // If we can't parse the error response, throw the original error
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
