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
 * Why server component here?
 *   - Fetches fresh data directly from the API on each request
 *     (cache: "no-store") to avoid stale answers.
 *   - Keeps the URL-derived `trackerId` authoritative and avoids exposing
 *     fetch logic to the client unnecessarily.
 *
 * Key details:
 *   - Booleans are converted to "form.yes"/"form.no" strings for the UI.
 *   - Category fields (driverType, haulPreference, teamStatus) are passed
 *     through as their ENUM values (no "form.*" prefixes), which aligns
 *     with our single source of truth and avoids string parsing on submit.
 *   - On missing data, we throw to surface an actionable error (and log).
 *
 * Inputs:
 *   - params.id (tracker ID) – provided by the dynamic route segment.
 *
 * Outputs:
 *   - Renders <PreQualificationClient /> with:
 *       • defaultValues – RHF-friendly shape
 *       • trackerId     – used by the client to PATCH updates
 *       • trackerContext – for Zustand hydration / nav
 *
 * Owner: SSP Tech Team – Faruq Adebayo Atanda
 * ======================================================================
 */

import PreQualificationClient from "@/app/onboarding/[id]/prequalifications/PrequalificationClient";
import { IPreQualifications } from "@/types/preQualifications.types";
import { ITrackerContext } from "@/types/onboardingTracker.types";
import { resolveInternalBaseUrl } from "@/lib/utils/urlConstructor";

/**
 * Converts typed IPreQualifications to RHF-compatible defaults
 * - Booleans -> "form.yes"/"form.no"
 * - Categories -> ENUM values (no "form.*" prefixes)
 *
 * NOTE:
 *   RHF drives the UI with strings; we keep category fields as the actual
 *   enum values so the <QuestionGroup /> can compare values directly and
 *   the submit handler can cast back to enums without string munging.
 */
function transformToFormValues(data: IPreQualifications): Record<string, string> {
  return {
    // Booleans -> i18n-friendly string tokens expected by the UI
    over23Local: data.over23Local ? "form.yes" : "form.no",
    over25CrossBorder: data.over25CrossBorder ? "form.yes" : "form.no",
    canDriveManual: data.canDriveManual ? "form.yes" : "form.no",
    experienceDrivingTractorTrailer: data.experienceDrivingTractorTrailer ? "form.yes" : "form.no",
    faultAccidentIn3Years: data.faultAccidentIn3Years ? "form.yes" : "form.no",
    zeroPointsOnAbstract: data.zeroPointsOnAbstract ? "form.yes" : "form.no",
    noUnpardonedCriminalRecord: data.noUnpardonedCriminalRecord ? "form.yes" : "form.no",
    legalRightToWorkCanada: data.legalRightToWorkCanada ? "form.yes" : "form.no",

    // Canada-only fields (may be omitted for US companies)
    canCrossBorderUSA: data.canCrossBorderUSA ? "form.yes" : "form.no",
    hasFASTCard: data.hasFASTCard ? "form.yes" : "form.no",

    // Categories -> keep ENUM values (the client component options use enums)
    driverType: data.driverType,
    haulPreference: data.haulPreference,
    teamStatus: data.teamStatus,

    // More booleans -> "form.yes"/"form.no"
    preferLocalDriving: data.preferLocalDriving ? "form.yes" : "form.no",
    preferSwitching: data.preferSwitching ? "form.yes" : "form.no",
    flatbedExperience: data.flatbedExperience ? "form.yes" : "form.no",
  };
}

/**
 * Server component for loading and rendering prequalification data for
 * onboarding resume/edit.
 *
 * Flow:
 *   1) Read the tracker `id` from dynamic route params.
 *   2) Fetch saved prequalification + tracker context from the API.
 *      - `cache: "no-store"` ensures we always fetch latest values.
 *   3) Transform the payload into RHF defaults for the client form.
 *   4) Render <PreQualificationClient /> with `defaultValues`, `trackerId`,
 *      and `trackerContext` (used for Zustand hydration + navigation).
 */
export default async function PrequalificationsPage({ params }: { params: Promise<{ id: string }> }) {
  // Await the `id` from the dynamic route segment
  const { id } = await params;

  const base = await resolveInternalBaseUrl();

  // Fetch the current prequalification state for this tracker
  const res = await fetch(
    `${base}/api/v1/onboarding/${id}/prequalifications`,
    { cache: "no-store" } // avoid caching so edits elsewhere are reflected immediately
  );

  // Parse JSON payload from the API
  const result = await res.json();

  // Extract the tracker context (used for nav + status) and prequal data
  const trackerContext: ITrackerContext = result.data?.onboardingContext;
  const prequalData: IPreQualifications = result.data?.preQualifications;

  // Defensive check: if API did not return prequal data, fail early
  if (!prequalData) {
    console.error("Prequalification data missing from response:", result);
    throw new Error("Failed to load prequalification data.");
  }

  // Convert to RHF defaults for the client form
  const defaultValues = transformToFormValues(prequalData);

  // Render client component with hydrated defaults and tracker info
  return <PreQualificationClient defaultValues={defaultValues} trackerId={id} trackerContext={trackerContext} />;
}
