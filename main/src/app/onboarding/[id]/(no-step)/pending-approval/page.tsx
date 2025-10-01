"use server";

/**
 * DriveDock Onboarding — Pending Approval
 * Server Wrapper
 *
 * - Fetches onboardingContext by tracker ID (from /api/v1/onboarding/[id]/invitation)
 * - Renders client UI that shows "Pending" or "Approved" states (with confetti)
 * - Intentionally NO redirect on approved; the UI itself shows the success state + CTAs
 */

import "server-only";
import { redirect } from "next/navigation";
import PendingApprovalClient, { PendingApprovalClientProps } from "./PendingApprovalClient";
import { resolveInternalBaseUrl } from "@/lib/utils/urlHelper.server";
import { fetchServerPageData } from "@/lib/utils/fetchServerPageData";
import { checkCompletionAndReturnRedirect } from "@/lib/utils/completionCheck";

export default async function PendingApprovalPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: trackerId } = await params;

  // Optional: if you still want to respect "completed" redirect logic here, keep this.
  // Otherwise, remove these two lines to *always* stay and show UI.
  const redirectPath = await checkCompletionAndReturnRedirect(trackerId);
  if (redirectPath) redirect(redirectPath);

  // Build same-origin absolute URL (works in dev + Vercel preview)
  const base = await resolveInternalBaseUrl();
  const url = `${base}/api/v1/onboarding/${trackerId}/invitation`;

  // Unified fetch (for cookies/redirects/JSON) — expects { data: { onboardingContext } }
  const { data, error } = await fetchServerPageData<Pick<PendingApprovalClientProps, "onboardingContext">>(url);

  if (error) {
    return <div className="p-6 text-center text-red-600 font-semibold">{error}</div>;
  }
  if (!data?.onboardingContext) {
    return <div className="p-6 text-center text-red-600 font-semibold">Failed to load data. Please try again later.</div>;
  }

  return <PendingApprovalClient onboardingContext={data.onboardingContext} />;
}
