/**
 * DriveDock Onboarding — Page 3 (Accident History, Traffic Convictions, Education, Canadian Hours) Server Wrapper
 * - Fetches saved Page 3 data + onboardingContext (nextUrl) by tracker ID
 * - Normalizes into ApplicationFormPage3Schema defaultValues
 * - Passes onboardingContext into client for no-op continue jumps
 */

import { ApplicationFormPage3Schema } from "@/lib/zodSchemas/applicationFormPage3.schema";
import Page3Client from "./Page3Client";
import { redirect } from "next/navigation";
import { formatInputDate } from "@/lib/utils/dateUtils";
import { resolveBaseUrl } from "@/lib/utils/urlConstructor";

// Helper to normalize array with a minimum length (does NOT truncate existing data)
function normalizeArray<T>(arr: T[] | undefined, minimumLength: number, createEmpty: () => T): T[] {
  const normalized = Array.isArray(arr) ? [...arr] : [];
  while (normalized.length < minimumLength) {
    normalized.push(createEmpty());
  }
  return normalized;
}

/** ---------- Error-handled fetch (Page 5 style) ---------- */
type Page3DataResponse = {
  data?: { page3?: any; onboardingContext?: any };
  error?: string;
};

async function fetchPage3Data(trackerId: string): Promise<Page3DataResponse> {
  const base = resolveBaseUrl();
  try {
    const res = await fetch(`${base}/api/v1/onboarding/${trackerId}/application-form/page-3`, {
      cache: "no-store",
    });

    if (res.status === 403) {
      redirect(`/onboarding/${trackerId}/application-form/page-2`);
    }
    if (!res.ok) {
      let message = "Failed to fetch Page 3 data.";
      try {
        const errJson = await res.json();
        message = errJson?.message || message;
      } catch {}
      return { error: message };
    }

    const json = await res.json();
    return { data: json?.data };
  } catch (error) {
    console.error("Error fetching Page 3 data:", error);
    return { error: "Unexpected server error. Please try again later." };
  }
}

export default async function Page3ServerWrapper({ params }: { params: Promise<{ id: string }> }) {
  const { id: trackerId } = await params;
  const { data, error } = await fetchPage3Data(trackerId);

  if (error) {
    return <div className="p-6 text-center text-red-600 font-semibold">{error}</div>;
  }

  const pageData = data?.page3;
  const trackerContextFromGet = data?.onboardingContext ?? null;

  // Normalize the data
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
        day: (item?.day || i + 1) as number, // Ensure day is a number 1-14
        hours: item?.hours || 0,
      })),
      totalHours: pageData?.canadianHoursOfService?.totalHours ?? 0,
    },
  };

  return <Page3Client defaultValues={defaultValues} trackerId={trackerId} trackerContextFromGet={trackerContextFromGet} />;
}
