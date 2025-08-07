import PreQualificationClient from "@/app/onboarding/[id]/prequalifications/PrequalificationClient";
import { IPreQualifications } from "@/types/preQualifications.types";
import { ITrackerContext } from "@/types/onboardingTracker.type";

// ✅ Transform prequalification object → RHF-compatible string form
function transformToFormValues(
  data: IPreQualifications
): Record<string, string> {
  return {
    over23Local: data.over23Local ? "form.yes" : "form.no",
    over25CrossBorder: data.over25CrossBorder ? "form.yes" : "form.no",
    canDriveManual: data.canDriveManual ? "form.yes" : "form.no",
    experienceDrivingTractorTrailer: data.experienceDrivingTractorTrailer
      ? "form.yes"
      : "form.no",
    faultAccidentIn3Years: data.faultAccidentIn3Years ? "form.yes" : "form.no",
    zeroPointsOnAbstract: data.zeroPointsOnAbstract ? "form.yes" : "form.no",
    noUnpardonedCriminalRecord: data.noUnpardonedCriminalRecord
      ? "form.yes"
      : "form.no",
    legalRightToWorkCanada: data.legalRightToWorkCanada
      ? "form.yes"
      : "form.no",
    canCrossBorderUSA: data.canCrossBorderUSA ? "form.yes" : "form.no",
    hasFASTCard: data.hasFASTCard ? "form.yes" : "form.no",
    driverType:
      "form." + (data.driverType?.replace(" ", "").toLowerCase() || "company"),
    haulPreference:
      "form." +
      (data.haulPreference?.replace(" ", "").toLowerCase() || "longhaul"),
    teamStatus: "form." + (data.teamStatus?.toLowerCase() || "single"),
    preferLocalDriving: data.preferLocalDriving ? "form.yes" : "form.no",
    preferSwitching: data.preferSwitching ? "form.yes" : "form.no",
    flatbedExperience: data.flatbedExperience ? "form.yes" : "form.no",
  };
}

export default async function PrequalificationsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const res = await fetch(
    `${
      process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000"
    }/api/v1/onboarding/${id}/prequalifications`,
    { cache: "no-store" }
  );

  const result = await res.json();
  const trackerContext: ITrackerContext = result.data?.onboardingContext;
  const prequalData = result.data?.preQualifications;

  // Fail-safe: Ensure we have data
  if (!prequalData) {
    console.error("Prequalification data missing from response:", result);
    throw new Error("Failed to load prequalification data.");
  }

  const defaultValues = transformToFormValues(prequalData);

  return (
    <PreQualificationClient
      defaultValues={defaultValues}
      trackerId={id}
      trackerContext={trackerContext}
    />
  );
}
