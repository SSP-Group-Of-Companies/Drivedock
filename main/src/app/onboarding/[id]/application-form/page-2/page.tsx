/**
 * DriveDock Onboarding — Page 2 (Employment History) Server Wrapper
 * - Fetches saved Page 2 data + onboardingContext (nextUrl) by tracker ID
 * - Normalizes into ApplicationFormPage2Schema defaultValues
 * - Passes onboardingContext into client for no-op continue jumps
 */

import { ApplicationFormPage2Schema } from "@/lib/zodSchemas/applicationFormPage2.schema";
import Page2Client from "./Page2Client";
import { NEXT_PUBLIC_BASE_URL } from "@/config/env";
import { redirect } from "next/navigation";
import { formatInputDate } from "@/lib/utils/dateUtils";

/** ---------- Error-handled fetch (Page 5 style) ---------- */
type Page2DataResponse = {
  data?: { page2?: any; onboardingContext?: any };
  error?: string;
};

async function fetchPage2Data(trackerId: string): Promise<Page2DataResponse> {
  const base = NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
  try {
    const res = await fetch(`${base}/api/v1/onboarding/${trackerId}/application-form/page-2`, {
      cache: "no-store",
    });

    if (res.status === 403) {
      redirect(`/onboarding/${trackerId}/application-form/page-1`);
    }
    if (!res.ok) {
      let message = "Failed to fetch Page 2 data.";
      try {
        const errJson = await res.json();
        message = errJson?.message || message;
      } catch {}
      return { error: message };
    }

    const json = await res.json();
    return { data: json?.data };
  } catch {
    return { error: "Unexpected server error. Please try again later." };
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
    subjectToFMCSR: undefined as boolean | undefined,
    safetySensitiveFunction: undefined as boolean | undefined,
    gapExplanationBefore: "",
  };
}

export default async function ApplicationFormPage2({ params }: { params: Promise<{ id: string }> }) {
  const { id: trackerId } = await params;

  const { data, error } = await fetchPage2Data(trackerId);
  if (error) {
    return <div className="p-6 text-center text-red-600 font-semibold">{error}</div>;
  }

  const page2 = data?.page2;
  const trackerContextFromGet = data?.onboardingContext ?? null;

  const defaultValues: ApplicationFormPage2Schema = page2
    ? {
        employments:
          page2.employments?.length > 0
            ? page2.employments.map((e: any) => ({
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
                from: formatInputDate(e.from),
                to: formatInputDate(e.to),
                salary: e.salary ?? "",
                reasonForLeaving: e.reasonForLeaving ?? "",
                subjectToFMCSR: Boolean(e.subjectToFMCSR),
                safetySensitiveFunction: Boolean(e.safetySensitiveFunction),
                gapExplanationBefore: e.gapExplanationBefore ?? "",
              }))
            : [emptyEmploymentRow()],
      }
    : { employments: [emptyEmploymentRow()] };

  return <Page2Client defaultValues={defaultValues} trackerId={trackerId} trackerContextFromGet={trackerContextFromGet} />;
}
