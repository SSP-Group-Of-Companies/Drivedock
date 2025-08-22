"use server";

/**
 * DriveDock Onboarding — Page 4 (Criminal Records, Driving History, Banking, Incorporation)
 * Server Wrapper
 *
 * Responsibilities
 * - Fetch saved Page 4 data + onboardingContext (nextUrl) by tracker ID
 * - Delegate defaults/normalization to the client mapper (Page4Client handles it)
 *
 * Implementation Notes
 * - Uses fetchServerPageData (server-only) for consistent error handling and cookie forwarding (Vercel preview safe)
 * - Builds same-origin absolute URL via resolveInternalBaseUrl (works in dev and prod)
 */

import "server-only";
import Page4Client from "./Page4Client";
import { IApplicationFormPage4 } from "@/types/applicationForm.types";
import { IOnboardingTrackerContext } from "@/types/onboardingTracker.types";
import { resolveInternalBaseUrl } from "@/lib/utils/urlHelper.server";
import { fetchServerPageData } from "@/lib/utils/fetchServerPageData";

/** API response envelope (unwrapped to `data` by fetchServerPageData) */
type Page4Result = {
  page4?: IApplicationFormPage4;
  onboardingContext?: IOnboardingTrackerContext;
};

export default async function ApplicationFormPage4({ params }: { params: Promise<{ id: string }> }) {
  const { id: trackerId } = await params;

  // Build same-origin absolute URL (dev + Vercel preview safe)
  const base = await resolveInternalBaseUrl();
  const url = `${base}/api/v1/onboarding/${trackerId}/application-form/page-4`;

  // Unified fetch pattern (handles cookies/redirects/JSON + unwraps { data })
  const { data, error } = await fetchServerPageData<Page4Result>(url);

  if (error) {
    return <div className="p-6 text-center text-red-600 font-semibold">{error}</div>;
  }

  if (!data?.onboardingContext) {
    return <div className="p-6 text-center text-red-600 font-semibold">Onboarding document missing.</div>;
  }

  // Client component performs detailed mapping/defaults
  return <Page4Client trackerId={trackerId} onboardingContext={data.onboardingContext} page4={data.page4 ?? null} />;
}
