"use server";

/**
 * DriveDock Onboarding — Flatbed Training
 * Server Wrapper
 *
 * Responsibilities
 * - Fetch saved Flatbed Training data + onboardingContext by tracker ID
 * - Pass payload to the client component
 *
 * Implementation Notes
 * - Uses fetchServerPageData (server-only) for consistent error handling and cookie forwarding (Vercel preview safe)
 * - Builds same-origin absolute URL via resolveInternalBaseUrl (works in dev and prod)
 */

import "server-only";
import FlatbedTrainingClient, { FlatbedTrainingClientProps } from "./FlatbedTrainingClient";
import { resolveInternalBaseUrl } from "@/lib/utils/urlHelper.server";
import { fetchServerPageData } from "@/lib/utils/fetchServerPageData";
import { checkCompletionAndReturnRedirect } from "@/lib/utils/completionCheck";
import { redirect } from "next/navigation";

export default async function OnboardingFlatbedTrainingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: trackerId } = await params;

  // Check if onboarding is completed and redirect if needed
  const redirectPath = await checkCompletionAndReturnRedirect(trackerId);
  if (redirectPath) {
    redirect(redirectPath);
  }

  // Build same-origin absolute URL (dev + Vercel preview safe)
  const base = await resolveInternalBaseUrl();
  const url = `${base}/api/v1/onboarding/${trackerId}/flatbed-training`;

  // Unified fetch pattern (handles cookies/redirects/JSON + unwraps { data })
  const { data, error } = await fetchServerPageData<FlatbedTrainingClientProps>(url);

  if (error) {
    return <div className="p-6 text-center text-red-600 font-semibold">{error}</div>;
  }

  if (!data?.flatbedTraining || !data?.onboardingContext) {
    return <div className="p-6 text-center text-red-600 font-semibold">Failed to load data. Please try again later.</div>;
  }

  return <FlatbedTrainingClient flatbedTraining={data.flatbedTraining} onboardingContext={data.onboardingContext} />;
}
