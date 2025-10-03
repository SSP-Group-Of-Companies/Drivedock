"use server";

/**
 * DriveDock Onboarding — Drive Test (On-Road Assessment)
 * Server Wrapper (builds RHF defaultValues)
 *
 * Responsibilities
 * - Fetch saved Drive Test (on-road) data by tracker ID
 * - Build and pass normalized RHF/Zod defaultValues to the client
 * - Decide if needsFlatbedTraining control should be visible
 *
 * Implementation Notes
 * - Uses fetchServerPageData (server-only) for consistent error handling and cookie forwarding
 * - Builds same-origin absolute URL via resolveInternalBaseUrl (works in dev and prod)
 */

import "server-only";
import type { IDriveTest } from "@/types/driveTest.types";
import { EDriveTestOverall, makeOnRoadSections } from "@/types/driveTest.types";
import type { IOnboardingTrackerContext } from "@/types/onboardingTracker.types";
import type { UploadResult } from "@/lib/utils/s3Upload";
import { resolveInternalBaseUrl } from "@/lib/utils/urlHelper.server";
import { fetchServerPageData } from "@/lib/utils/fetchServerPageData";
import type { OnRoadWrapperInput } from "@/lib/zodSchemas/drive-test/onRoadAssessment.schema";
import { canHaveFlatbedTraining } from "@/constants/companies";
import OnRoadAssessmentClient from "./OnRoadAssessmentClient";

type OnRoadResult = {
  onboardingContext: IOnboardingTrackerContext;
  driveTest?: IDriveTest;
  driverName: string;
  driverLicense: string;
};

export default async function OnRoadAssessmentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: trackerId } = await params;

  const base = await resolveInternalBaseUrl();
  const url = `${base}/api/v1/admin/onboarding/${trackerId}/appraisal/drive-test/on-road-assessment`;

  const { data, error } = await fetchServerPageData<OnRoadResult>(url);
  if (error) {
    return <div className="p-6 text-center text-red-600 font-semibold">{error}</div>;
  }

  const driveTest = data?.driveTest;
  const onRoad = driveTest?.onRoad;
  const preTrip = driveTest?.preTrip;

  const preTripAssessment = preTrip?.overallAssessment;
  const completedPreTrip = preTripAssessment === EDriveTestOverall.CONDITIONAL_PASS || preTripAssessment === EDriveTestOverall.PASS;

  if (!completedPreTrip) {
    return <div className="p-6 text-center text-red-600 font-semibold">Driver hasn&apos;t completed pre-tip test yet</div>;
  }

  // can show the flatbed training toggle?
  const companyId = data!.onboardingContext.companyId;
  const applicationType = data!.onboardingContext.applicationType;
  const showFlatbedToggle = companyId ? canHaveFlatbedTraining(companyId, applicationType) : false;

  // Build RHF defaultValues
  const baseSections = makeOnRoadSections();

  const defaultValues: OnRoadWrapperInput = {
    powerUnitType: driveTest?.powerUnitType || "",
    trailerType: driveTest?.trailerType || "",
    onRoad: {
      sections: {
        placingVehicleInMotion: { ...baseSections.placingVehicleInMotion, ...(onRoad?.sections?.placingVehicleInMotion || {}) },
        highwayDriving: { ...baseSections.highwayDriving, ...(onRoad?.sections?.highwayDriving || {}) },
        rightLeftTurns: { ...baseSections.rightLeftTurns, ...(onRoad?.sections?.rightLeftTurns || {}) },
        defensiveDriving: { ...baseSections.defensiveDriving, ...(onRoad?.sections?.defensiveDriving || {}) },
        gps: { ...baseSections.gps, ...(onRoad?.sections?.gps || {}) },
        operatingInTraffic: { ...baseSections.operatingInTraffic, ...(onRoad?.sections?.operatingInTraffic || {}) },
      },
      supervisorName: onRoad?.supervisorName || "",
      expectedStandard: (onRoad?.expectedStandard as any) || ("" as any),
      overallAssessment: (onRoad?.overallAssessment as any) || ("" as any),
      // initialize to false if not possible; server will ignore if not applicable
      needsFlatbedTraining: showFlatbedToggle ? Boolean(onRoad?.needsFlatbedTraining ?? !!data?.onboardingContext?.needsFlatbedTraining) : false,
      milesKmsDriven: onRoad?.milesKmsDriven ?? 0,
      comments: onRoad?.comments || "",
      supervisorSignature: {
        s3Key: onRoad?.supervisorSignature?.s3Key ?? "",
        url: onRoad?.supervisorSignature?.url ?? "",
        mimeType: onRoad?.supervisorSignature?.mimeType ?? "",
        sizeBytes: onRoad?.supervisorSignature?.sizeBytes ?? 0,
        originalName: onRoad?.supervisorSignature?.originalName ?? "",
      },
      assessedAt: onRoad?.assessedAt ? new Date(onRoad.assessedAt) : new Date(),
    },
  };

  const initialSignature: UploadResult | null = onRoad?.supervisorSignature ? (onRoad.supervisorSignature as UploadResult) : null;

  // lock if drivetest completed (finalized) — typical for second stage
  const isLocked = Boolean(driveTest?.completed || !!onRoad);

  return (
    <OnRoadAssessmentClient
      onboardingContext={data!.onboardingContext}
      driverName={data!.driverName}
      driverLicense={data!.driverLicense}
      defaultValues={defaultValues}
      initialSignature={initialSignature}
      isLocked={isLocked}
      trackerId={trackerId}
      showFlatbedToggle={showFlatbedToggle}
      driveTest={driveTest}
    />
  );
}
