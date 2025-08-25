"use server";

/**
 * DriveDock Onboarding — Drug Test
 * Server Wrapper
 *
 * Responsibilities
 * - Fetch saved Drug Test data + onboardingContext by tracker ID
 * - Pass payload to the client component
 *
 * Implementation Notes
 * - Uses fetchServerPageData (server-only) for consistent error handling and cookie forwarding (Vercel preview safe)
 * - Builds same-origin absolute URL via resolveInternalBaseUrl (works in dev and prod)
 */

import "server-only";
import DrugTestClient, { DrugTestClientProps } from "./DrugTestClient";
import { resolveInternalBaseUrl } from "@/lib/utils/urlHelper.server";
import { fetchServerPageData } from "@/lib/utils/fetchServerPageData";

export default async function OnboardingDrugTestPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: trackerId } = await params;

  // Build same-origin absolute URL (dev + Vercel preview safe)
  const base = await resolveInternalBaseUrl();
  const url = `${base}/api/v1/onboarding/${trackerId}/drug-test`;

  // Unified fetch pattern (handles cookies/redirects/JSON + unwraps { data })
  const { data, error } = await fetchServerPageData<DrugTestClientProps>(url);

  if (error) {
    return <div className="p-6 text-center text-red-600 font-semibold">{error}</div>;
  }

  if (!data?.drugTest || !data?.onboardingContext) {
    return <div className="p-6 text-center text-red-600 font-semibold">Failed to load data. Please try again later.</div>;
  }

  return <DrugTestClient drugTest={data.drugTest} onboardingContext={data.onboardingContext} />;
}
