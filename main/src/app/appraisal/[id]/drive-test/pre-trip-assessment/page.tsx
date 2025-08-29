"use server";

/**
 * DriveDock Onboarding — Drive Test (Pre-Trip Assessment)
 * Server Wrapper (now also builds RHF defaultValues)
 *
 * Responsibilities
 * - Fetch saved Drive Test (pre-trip) data by tracker ID
 * - Build and pass normalized RHF/Zod defaultValues to the client
 *
 * Implementation Notes
 * - Uses fetchServerPageData (server-only) for consistent error handling and cookie forwarding (Vercel preview safe)
 * - Builds same-origin absolute URL via resolveInternalBaseUrl (works in dev and prod)
 */

import "server-only";
import PreTripClient from "./PreTripAssessmentClient";
import type { IDriveTest } from "@/types/driveTest.types";
import { makePreTripSections } from "@/types/driveTest.types";
import type { IOnboardingTrackerContext } from "@/types/onboardingTracker.types";
import type { PreTripWrapperInput } from "@/lib/zodSchemas/drive-test/preTripAssessment.schema";
import type { UploadResult } from "@/lib/utils/s3Upload";
import { resolveInternalBaseUrl } from "@/lib/utils/urlHelper.server";
import { fetchServerPageData } from "@/lib/utils/fetchServerPageData";

type PreTripResult = {
  onboardingContext: IOnboardingTrackerContext;
  driveTest?: IDriveTest;
  driverName: string;
  driverLicense: string;
};

export default async function PreTripAssessmentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: trackerId } = await params;

  // Build same-origin absolute URL (dev + Vercel preview safe)
  const base = await resolveInternalBaseUrl();
  const url = `${base}/api/v1/admin/onboarding/${trackerId}/appraisal/drive-test/pre-trip-assessment`;

  // Unified fetch pattern (handles cookies/redirects/JSON + unwraps { data })
  const { data, error } = await fetchServerPageData<PreTripResult>(url);

  if (error) {
    return <div className="p-6 text-center text-red-600 font-semibold">{error}</div>;
  }

  // ----- Build RHF defaultValues on the server -----
  const baseSections = makePreTripSections();
  const driveTest = data?.driveTest;
  const preTrip = driveTest?.preTrip;

  const defaultValues: PreTripWrapperInput = {
    powerUnitType: driveTest?.powerUnitType || "",
    trailerType: driveTest?.trailerType || "",
    preTrip: {
      sections: {
        underHood: { ...baseSections.underHood, ...(preTrip?.sections?.underHood || {}) },
        outside: { ...baseSections.outside, ...(preTrip?.sections?.outside || {}) },
        uncoupling: { ...baseSections.uncoupling, ...(preTrip?.sections?.uncoupling || {}) },
        coupling: { ...baseSections.coupling, ...(preTrip?.sections?.coupling || {}) },
        airSystem: { ...baseSections.airSystem, ...(preTrip?.sections?.airSystem || {}) },
        inCab: { ...baseSections.inCab, ...(preTrip?.sections?.inCab || {}) },
        backingUp: { ...baseSections.backingUp, ...(preTrip?.sections?.backingUp || {}) },
      },
      supervisorName: preTrip?.supervisorName || "",
      // keep empty-string as placeholder so the select can show "required" via zod refinement
      expectedStandard: (preTrip?.expectedStandard as any) || ("" as any),
      overallAssessment: (preTrip?.overallAssessment as any) || ("" as any),
      comments: preTrip?.comments || "",
      supervisorSignature: {
        s3Key: preTrip?.supervisorSignature?.s3Key ?? "",
        url: preTrip?.supervisorSignature?.url ?? "",
      },
      assessedAt: preTrip?.assessedAt ? new Date(preTrip.assessedAt) : new Date(),
    },
  };

  // Initial signature for the SignatureBox preview (UploadResult | null)
  const initialSignature: UploadResult | null = preTrip?.supervisorSignature ? (preTrip.supervisorSignature as UploadResult) : null;

  const isLocked = Boolean(driveTest?.completed) || !!preTrip;

  return (
    <PreTripClient
      onboardingContext={data!.onboardingContext}
      driverName={data!.driverName}
      driverLicense={data!.driverLicense}
      // new props
      defaultValues={defaultValues}
      initialSignature={initialSignature}
      isLocked={isLocked}
      trackerId={trackerId}
      // still pass the raw driveTest if you need it elsewhere; optional
      driveTest={driveTest}
    />
  );
}
