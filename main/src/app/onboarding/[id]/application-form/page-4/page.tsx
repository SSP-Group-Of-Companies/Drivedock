"use server";

import { NEXT_PUBLIC_BASE_URL } from "@/config/env";
import Page4Client from "./Page4Client";
import { IApplicationFormPage4 } from "@/types/applicationForm.types";
import { ITrackerContext } from "@/types/onboardingTracker.type";

// ---- Types for server fetch ----
type Page4DataResponse = {
  data?: { page4?: IApplicationFormPage4; onboardingContext: ITrackerContext };
  error?: string;
};

// ---- Server Fetcher (Page5-style error handling) ----
async function fetchPage4Data(trackerId: string): Promise<Page4DataResponse> {
  try {
    const base = NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
    const res = await fetch(`${base}/api/v1/onboarding/${trackerId}/application-form/page-4`, { cache: "no-store" });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return { error: err?.message || "Failed to fetch Page 4 data." };
    }

    const json = await res.json();
    return { data: json.data };
  } catch {
    return { error: "Unexpected server error. Please try again later." };
  }
}

export default async function ApplicationFormPage4({ params }: { params: Promise<{ id: string }> }) {
  const { id: trackerId } = await params;
  const { data, error } = await fetchPage4Data(trackerId);

  if (error) {
    return <div className="p-6 text-center text-red-600 font-semibold">{error}</div>;
  }

  if (!data?.onboardingContext) {
    return <div className="p-6 text-center text-red-600 font-semibold">Onboarding context missing.</div>;
  }

  // The client handles defaults via its own mapper; pass raw data here.
  return <Page4Client trackerId={trackerId} onboardingContext={data.onboardingContext} page4={data.page4 ?? null} />;
}
