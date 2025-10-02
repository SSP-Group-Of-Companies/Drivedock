"use server";

/**
 * ======================================================================
 * DriveDock – [id]/prequalifications (Server Component)
 * ----------------------------------------------------------------------
 * Purpose:
 *   Server-rendered page that loads a driver's saved *Pre-Qualifications*
 *   for a specific onboarding tracker (via URL param `[id]`), transforms
 *   them into React Hook Form–compatible defaults, and renders the client
 *   form (`PreQualificationClient`) to allow review/edits (PATCH flow).
 *
 * Implementation Notes
 * - Uses `fetchServerPageData` (server-only) for consistent JSON handling,
 *   cookie forwarding (Vercel preview safe), and error messaging.
 * - Builds a same-origin absolute URL via `resolveInternalBaseUrl` to work
 *   across dev and preview/prod.
 * - Category fields are kept as ENUM values; booleans map to "form.yes/no".
 *
 * Owner: SSP Tech Team – Faruq Adebayo Atanda
 * ======================================================================
 */

import "server-only";
import PreQualificationClient from "@/app/onboarding/[id]/(has-step)/prequalifications/PrequalificationClient";
import { IPreQualifications } from "@/types/preQualifications.types";
import { IOnboardingTrackerContext } from "@/types/onboardingTracker.types";
import { resolveInternalBaseUrl } from "@/lib/utils/urlHelper.server";
import { fetchServerPageData } from "@/lib/utils/fetchServerPageData";

/** API response envelope (unwrapped to `data` by fetchServerPageData) */
type PrequalResult = {
  preQualifications?: IPreQualifications;
  onboardingContext?: IOnboardingTrackerContext;
};

/**
 * Converts typed IPreQualifications to RHF-compatible defaults
 * - Booleans -> "form.yes"/"form.no"
 * - Categories -> ENUM values (no "form.*" prefixes)
 *
 * NOTE:
 * RHF drives the UI with strings; we keep category fields as the actual
 * enum values so the <QuestionGroup /> can compare values directly and
 * the submit handler can cast back to enums without string munging.
 */
function transformToFormValues(
  data: IPreQualifications
): Record<string, string> {
  return {
    // Booleans -> i18n tokens expected by the UI
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

    // Canada-only fields (may be omitted for US companies)
    canCrossBorderUSA: data.canCrossBorderUSA ? "form.yes" : "form.no",
    hasFASTCard:
      data.hasFASTCard !== undefined
        ? data.hasFASTCard
          ? "form.yes"
          : "form.no"
        : "",
    statusInCanada: data.statusInCanada || "",
    eligibleForFASTCard:
      data.eligibleForFASTCard !== undefined
        ? data.eligibleForFASTCard
          ? "form.yes"
          : "form.no"
        : "",

    // Categories -> keep ENUM values (the client component options use enums)
    driverType: data.driverType,
    haulPreference: data.haulPreference,
    teamStatus: data.teamStatus,

    // Preferences / additional booleans
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
  const { id: trackerId } = await params;

  // Build same-origin absolute URL (dev + Vercel preview safe)
  const base = await resolveInternalBaseUrl();
  const url = `${base}/api/v1/onboarding/${trackerId}/prequalifications`;

  // Unified fetch pattern (handles cookies/redirects/JSON + unwraps { data })
  const { data, error } = await fetchServerPageData<PrequalResult>(url);

  if (error) {
    return (
      <div className="p-6 text-center text-red-600 font-semibold">{error}</div>
    );
  }

  const trackerContext = data?.onboardingContext ?? null;
  const prequalData = data?.preQualifications;

  // Defensive check: if API did not return prequal data, fail gracefully
  if (!prequalData) {
    return (
      <div className="p-6 text-center text-red-600 font-semibold">
        Failed to load prequalification data.
      </div>
    );
  }

  // Convert to RHF defaults for the client form
  const defaultValues = transformToFormValues(prequalData);

  // Render client component with hydrated defaults and tracker info
  return (
    <PreQualificationClient
      defaultValues={defaultValues}
      trackerId={trackerId}
      trackerContext={trackerContext}
    />
  );
}
