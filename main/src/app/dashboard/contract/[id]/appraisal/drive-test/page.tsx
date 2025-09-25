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
import StepNotReachedMessage from "../../components/StepNotReachedMessage";

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
    // If it's a 403 error, it means the driver hasn't reached the drive test step yet
    if (error.includes("403") || error.includes("hasn't reached this step")) {
      return (
        <StepNotReachedMessage 
          stepName="Drive Test"
          stepDescription="This page requires the driver to reach the drive test step in their onboarding process. The drive test is typically available after completing the application form and safety processing steps."
        />
      );
    }
    
    // For other errors, show the error message
    return <div className="p-6 text-center text-red-600 font-semibold">{error}</div>;
  }

  // Pass through exactly what the API returned
  return <AdminDriveTestClient onboardingContext={data!.onboardingContext} driveTest={data!.driveTest ?? undefined} driverName={data!.driverName} driverLicense={data!.driverLicense} />;
}
