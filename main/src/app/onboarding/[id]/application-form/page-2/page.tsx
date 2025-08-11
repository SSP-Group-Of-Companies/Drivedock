// main/src/app/onboarding/[id]/application-form/page-2/page.tsx
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
import {
  parseISO,
  isValid as isValidDate,
  format as formatDateFns,
} from "date-fns";

// Normalize any date-ish string into YYYY-MM-DD; return "" if invalid (timezone-safe).
function toYMD(dateish: string): string {
  if (!dateish) return "";
  const d = parseISO(String(dateish));
  return isValidDate(d) ? formatDateFns(d, "yyyy-MM-dd") : "";
}

async function fetchPage2Data(trackerId: string) {
  const base = NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
  const res = await fetch(
    `${base}/api/v1/onboarding/${trackerId}/application-form/page-2`,
    { cache: "no-store" }
  );

  if (res.status === 403) {
    redirect(`/onboarding/${trackerId}/application-form/page-1`);
  }
  if (!res.ok) return null;

  const json = await res.json();
  return {
    page2: json?.data?.page2 ?? null,
    trackerContext: json?.data?.onboardingContext ?? null, // 👈 keep nextUrl handy
  };
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

export default async function ApplicationFormPage2({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: trackerId } = await params;

  const fetched = await fetchPage2Data(trackerId);
  const page2 = fetched?.page2;
  const trackerContextFromGet = fetched?.trackerContext ?? null;

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
                from: toYMD(e.from),
                to: toYMD(e.to),
                salary: e.salary ?? "",
                reasonForLeaving: e.reasonForLeaving ?? "",
                subjectToFMCSR: Boolean(e.subjectToFMCSR),
                safetySensitiveFunction: Boolean(e.safetySensitiveFunction),
                gapExplanationBefore: e.gapExplanationBefore ?? "",
              }))
            : [emptyEmploymentRow()],
      }
    : { employments: [emptyEmploymentRow()] };

  return (
    <Page2Client
      defaultValues={defaultValues}
      trackerId={trackerId}
      trackerContextFromGet={trackerContextFromGet}
    />
  );
}
