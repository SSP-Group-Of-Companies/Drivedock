"use server";

/**
 * DriveDock Onboarding — Policies & Consents
 * Server Wrapper
 *
 * Responsibilities
 * - Fetch saved Policies/Consents data + onboardingContext by tracker ID
 * - Pass payload to the client component
 *
 * Implementation Notes
 * - Uses fetchServerPageData (server-only) for consistent error handling and cookie forwarding (Vercel preview safe)
 * - Builds same-origin absolute URL via resolveInternalBaseUrl (works in dev and prod)
 */

import "server-only";
import PoliciesConsentsClient, { PoliciesConsentsClientProps } from "./PoliciesConsentsClient";
import { resolveInternalBaseUrl } from "@/lib/utils/urlHelper.server";
import { fetchServerPageData } from "@/lib/utils/fetchServerPageData";

export default async function ApplicationFormPagePoliciesConsents({ params }: { params: Promise<{ id: string }> }) {
  const { id: trackerId } = await params;

  // Build same-origin absolute URL (dev + Vercel preview safe)
  const base = await resolveInternalBaseUrl();
  const url = `${base}/api/v1/onboarding/${trackerId}/policies-consents`;

  // Unified fetch pattern (handles cookies/redirects/JSON + unwraps { data })
  const { data, error } = await fetchServerPageData<PoliciesConsentsClientProps>(url);

  if (error) {
    return <div className="p-6 text-center text-red-600 font-semibold">{error}</div>;
  }

  if (!data?.policiesConsents || !data?.onboardingContext) {
    return <div className="p-6 text-center text-red-600 font-semibold">Failed to load data. Please try again later.</div>;
  }

  return <PoliciesConsentsClient policiesConsents={data.policiesConsents} onboardingContext={data.onboardingContext} />;
}
