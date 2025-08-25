"use server";

/**
 * DriveDock Onboarding — Page 5 (Competency Questions)
 * Server Wrapper
 *
 * Responsibilities
 * - Fetch saved Page 5 data by tracker ID
 * - Pass normalized payload to the client component
 *
 * Implementation Notes
 * - Uses fetchServerPageData (server-only) for consistent error handling and cookie forwarding (Vercel preview safe)
 * - Builds same-origin absolute URL via resolveInternalBaseUrl (works in dev and prod)
 */

import "server-only";
import Page5Client from "./Page5Client";
import { IApplicationFormPage5 } from "@/types/applicationForm.types";
import { resolveInternalBaseUrl } from "@/lib/utils/urlHelper.server";
import { fetchServerPageData } from "@/lib/utils/fetchServerPageData";

type Page5Result = { page5?: IApplicationFormPage5 };

export default async function ApplicationFormPage5({ params }: { params: Promise<{ id: string }> }) {
  const { id: trackerId } = await params;

  // Build same-origin absolute URL (dev + Vercel preview safe)
  const base = await resolveInternalBaseUrl();
  const url = `${base}/api/v1/onboarding/${trackerId}/application-form/page-5`;

  // Unified fetch pattern (handles cookies/redirects/JSON + unwraps { data })
  const { data, error } = await fetchServerPageData<Page5Result>(url);

  if (error) {
    return <div className="p-6 text-center text-red-600 font-semibold">{error}</div>;
  }

  const pageData = data?.page5;
  if (!pageData) {
    return <div className="p-6 text-center text-red-600 font-semibold">Failed to load competency test data.</div>;
  }

  return <Page5Client data={pageData} trackerId={trackerId} />;
}
