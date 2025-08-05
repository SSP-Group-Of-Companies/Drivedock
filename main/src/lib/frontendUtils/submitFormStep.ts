import { ITrackerContext } from "@/store/useOnboardingTracker";

type SubmitFormStepParams = {
  formData: FormData;
  tracker: ITrackerContext | null;
  nextRoute: string;
};

export async function submitFormStep({
  formData,
  tracker,
  nextRoute,
}: SubmitFormStepParams): Promise<{ trackerContext?: ITrackerContext }> {
  const isPatch = !!tracker?.id;

  // Extract final segment from route (e.g., "page-2", "policies-consents")
  const pageSegment = nextRoute.split("/").pop() ?? "page-1";

  const url = isPatch
    ? `/api/v1/onboarding/${tracker.id}/application-form/${pageSegment}`
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
    throw new Error(errorText);
  }

  const data = await res.json();

  return {
    trackerContext: data?.data?.onboardingContext,
  };
}
