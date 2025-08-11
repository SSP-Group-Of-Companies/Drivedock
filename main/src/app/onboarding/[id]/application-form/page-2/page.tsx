// main/src/app/onboarding/[id]/application-form/page-2/page.tsx
/**
 * ===============================================================
 * DriveDock Onboarding — Page 2 (Employment History) Server Wrapper
 * ---------------------------------------------------------------
 * - Fetches saved Page 2 data by tracker ID
 * - Normalizes into ApplicationFormPage2Schema defaultValues
 * - Passes to the client component for PATCH flow
 *
 * Backend contract:
 *   GET /api/v1/onboarding/[id]/application-form/page-2
 *   -> { data: { page2: { employments: [...] } } }
 *
 * Owner: SSP Tech Team — Faruq Adebayo Atanda
 * ===============================================================
 */

import { ApplicationFormPage2Schema } from "@/lib/zodSchemas/applicationFormPage2.schema";
import Page2Client from "./Page2Client";
import { NEXT_PUBLIC_BASE_URL } from "@/config/env";

// Normalize any date-ish string into YYYY-MM-DD; return "" if invalid.
function formatDate(dateString: string): string {
  if (!dateString) return "";
  const d = new Date(dateString);
  return Number.isNaN(d.getTime()) ? "" : d.toISOString().split("T")[0];
}

async function fetchPage2Data(trackerId: string) {
  try {
    const res = await fetch(
      `${
        NEXT_PUBLIC_BASE_URL || "http://localhost:3000"
      }/api/v1/onboarding/${trackerId}/application-form/page-2`,
      { cache: "no-store" }
    );
    if (!res.ok) return null;
    const json = await res.json();
    return json?.data?.page2 ?? null;
  } catch (err) {
    console.error("Error fetching Page 2 data:", err);
    return null;
  }
}

// Single source of truth for an empty employment row
function emptyEmploymentRow() {
  return {
    employerName: "",
    supervisorName: "",
    address: "",
    postalCode: "",
    city: "",
    stateOrProvince: "",
    phone1: "",
    phone2: "",
    email: "",
    positionHeld: "",
    from: "",
    to: "",
    salary: "",
    reasonForLeaving: "",
    subjectToFMCSR: undefined,
    safetySensitiveFunction: undefined,
    gapExplanationBefore: "",
  };
}

export default async function ApplicationFormPage2({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: trackerId } = await params;

  const pageData = await fetchPage2Data(trackerId);

  const defaultValues: ApplicationFormPage2Schema = pageData
    ? {
        employments:
          pageData.employments?.length > 0
            ? pageData.employments.map((e: any) => ({
                employerName: e.employerName ?? "",
                supervisorName: e.supervisorName ?? "",
                address: e.address ?? "",
                postalCode: e.postalCode ?? "",
                city: e.city ?? "",
                stateOrProvince: e.stateOrProvince ?? "",
                phone1: e.phone1 ?? "",
                phone2: e.phone2 ?? "",
                email: e.email ?? "",
                positionHeld: e.positionHeld ?? "",
                from: formatDate(e.from),
                to: formatDate(e.to),
                salary: e.salary ?? "",
                reasonForLeaving: e.reasonForLeaving ?? "",
                subjectToFMCSR: Boolean(e.subjectToFMCSR),
                safetySensitiveFunction: Boolean(e.safetySensitiveFunction),
                gapExplanationBefore: e.gapExplanationBefore ?? "",
              }))
            : [emptyEmploymentRow()],
      }
    : {
        employments: [emptyEmploymentRow()],
      };

  return <Page2Client defaultValues={defaultValues} trackerId={trackerId} />;
}
