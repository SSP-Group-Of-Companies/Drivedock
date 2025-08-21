"use server";

import PoliciesConsentsClient, { PoliciesConsentsClientProps } from "./PoliciesConsentsClient";
import { resolveInternalBaseUrl } from "@/lib/utils/urlConstructor";

type PageDataResponse = {
  data?: PoliciesConsentsClientProps;
  error?: string;
};

// Server-side data fetching function
async function fetchPageData(trackerId: string): Promise<PageDataResponse> {
  try {
    const base = await resolveInternalBaseUrl();

    const response = await fetch(`${base}/api/v1/onboarding/${trackerId}/policies-consents`, {
      cache: "no-store",
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Failed to fetch policies-consents:", errorData);
      return { error: errorData?.message || "Failed to fetch data." };
    }

    const json = await response.json();
    return { data: json.data };
  } catch (err) {
    console.log(err);
    return { error: "Unexpected server error. Please try again later." };
  }
}

export default async function ApplicationFormPagePoliciesConsents({ params }: { params: Promise<{ id: string }> }) {
  const { id: trackerId } = await params;

  const { data, error } = await fetchPageData(trackerId);

  if (error) {
    return <div className="p-6 text-center text-red-600 font-semibold">{error}</div>;
  }

  if (!data?.policiesConsents || !data?.onboardingContext) {
    return <div className="p-6 text-center text-red-600 font-semibold">Failed to load data. Please try again later.</div>;
  }

  return <PoliciesConsentsClient policiesConsents={data.policiesConsents} onboardingContext={data.onboardingContext} />;
}
