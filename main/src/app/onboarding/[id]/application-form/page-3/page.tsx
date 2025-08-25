"use server";

/**
 * DriveDock Onboarding — Page 3 (Accident History, Traffic Convictions, Education, Canadian Hours)
 * Server Wrapper
 *
 * Responsibilities
 * - Fetch saved Page 3 data + onboardingContext (nextUrl) by tracker ID
 * - Normalize payload into ApplicationFormPage3Schema defaultValues
 * - Pass onboardingContext into client for no-op continue jumps
 *
 * Implementation Notes
 * - Uses fetchServerPageData (server-only) for consistent error handling and cookie forwarding (Vercel preview safe)
 * - Builds same-origin absolute URL via resolveInternalBaseUrl (works in dev and prod)
 */

import "server-only";
import Page3Client from "./Page3Client";
import { ApplicationFormPage3Schema } from "@/lib/zodSchemas/applicationFormPage3.schema";
import { formatInputDate } from "@/lib/utils/dateUtils";
import { resolveInternalBaseUrl } from "@/lib/utils/urlHelper.server";
import { fetchServerPageData } from "@/lib/utils/fetchServerPageData";

/** API response envelope (unwrapped by fetchServerPageData to the `data` field) */
type Page3Result = {
  page3?: any;
  onboardingContext?: any;
};

/** Normalize an array to a minimum length without truncating existing items */
function normalizeArray<T>(arr: T[] | undefined, minimumLength: number, createEmpty: () => T): T[] {
  const normalized = Array.isArray(arr) ? [...arr] : [];
  while (normalized.length < minimumLength) normalized.push(createEmpty());
  return normalized;
}

export default async function Page3ServerWrapper({ params }: { params: Promise<{ id: string }> }) {
  const { id: trackerId } = await params;

  // Build same-origin absolute URL (dev + Vercel preview safe)
  const base = await resolveInternalBaseUrl();
  const url = `${base}/api/v1/onboarding/${trackerId}/application-form/page-3`;

  // Unified fetch pattern (handles cookies/redirects/JSON + unwraps { data })
  const { data, error } = await fetchServerPageData<Page3Result>(url);

  if (error) {
    return <div className="p-6 text-center text-red-600 font-semibold">{error}</div>;
  }

  const pageData = data?.page3;
  const trackerContextFromGet = data?.onboardingContext ?? null;

  // ---------- Normalization to RHF-friendly defaults ----------
  const defaultValues: ApplicationFormPage3Schema = {
    accidentHistory: normalizeArray(pageData?.accidentHistory, 4, () => ({
      date: "",
      natureOfAccident: "",
      fatalities: 0,
      injuries: 0,
    })).map((item) => ({
      ...item,
      date: formatInputDate(item?.date),
    })),

    trafficConvictions: normalizeArray(pageData?.trafficConvictions, 4, () => ({
      date: "",
      location: "",
      charge: "",
      penalty: "",
    })).map((item) => ({
      ...item,
      date: formatInputDate(item?.date),
    })),

    education: {
      gradeSchool: pageData?.education?.gradeSchool ?? 0,
      college: pageData?.education?.college ?? 0,
      postGraduate: pageData?.education?.postGraduate ?? 0,
    },

    canadianHoursOfService: {
      dayOneDate: formatInputDate(pageData?.canadianHoursOfService?.dayOneDate),
      dailyHours: normalizeArray(pageData?.canadianHoursOfService?.dailyHours, 14, () => ({ day: 1, hours: 0 })).map((item, i) => ({
        ...item,
        day: (item?.day || i + 1) as number, // ensure numeric day 1..14
        hours: item?.hours || 0,
      })),
      totalHours: pageData?.canadianHoursOfService?.totalHours ?? 0,
    },
  };

  return <Page3Client defaultValues={defaultValues} trackerId={trackerId} trackerContextFromGet={trackerContextFromGet} />;
}
