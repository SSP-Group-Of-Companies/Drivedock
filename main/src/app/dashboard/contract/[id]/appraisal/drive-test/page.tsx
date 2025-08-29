// src/app/dashboard/contract/appraisal/[id]/drive-test/page.tsx
"use server";

/**
 * DriveDock Onboarding — Drive Test (Page Wrapper)
 * Server Wrapper
 *
 * Responsibilities
 * - Fetch Drive Test shell data by tracker ID
 * - Pass the API payload directly to the client (no transformation)
 *
 * Implementation Notes
 * - Uses fetchServerPageData (server-only) for consistent error handling and cookie forwarding (Vercel preview safe)
 * - Builds same-origin absolute URL via resolveInternalBaseUrl (works in dev and prod)
 */

import "server-only";
import AdminDriveTestClient from "./AdminDriveTestClient";

import type { IDriveTest } from "@/types/driveTest.types";
import type { IOnboardingTrackerContext } from "@/types/onboardingTracker.types";
import { resolveInternalBaseUrl } from "@/lib/utils/urlHelper.server";
import { fetchServerPageData } from "@/lib/utils/fetchServerPageData";

type DriveTestResult = {
  onboardingContext: IOnboardingTrackerContext;
  driveTest?: IDriveTest | null;
  driverName: string;
  driverLicense: string;
};

export default async function DriveTestPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: trackerId } = await params;

  // Build same-origin absolute URL (dev + Vercel preview safe)
  const base = await resolveInternalBaseUrl();
  const url = `${base}/api/v1/admin/onboarding/${trackerId}/appraisal/drive-test`;

  // Unified fetch pattern (handles cookies/redirects/JSON + unwraps { data })
  const { data, error } = await fetchServerPageData<DriveTestResult>(url);

  if (error) {
    return <div className="p-6 text-center text-red-600 font-semibold">{error}</div>;
  }

  // Pass through exactly what the API returned
  return <AdminDriveTestClient onboardingContext={data!.onboardingContext} driveTest={data!.driveTest ?? undefined} driverName={data!.driverName} driverLicense={data!.driverLicense} />;
}
