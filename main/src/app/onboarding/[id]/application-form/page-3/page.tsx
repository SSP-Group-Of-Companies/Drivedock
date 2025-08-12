// main/src/app/onboarding/[id]/application-form/page-3/page.tsx
/**
 * DriveDock Onboarding — Page 3 (Accident History, Traffic Convictions, Education, Canadian Hours) Server Wrapper
 * - Fetches saved Page 3 data + onboardingContext (nextUrl) by tracker ID
 * - Normalizes into ApplicationFormPage3Schema defaultValues
 * - Passes onboardingContext into client for no-op continue jumps
 */

import { ApplicationFormPage3Schema } from "@/lib/zodSchemas/applicationFormPage3.schema";
import Page3Client from "./Page3Client";
import { NEXT_PUBLIC_BASE_URL } from "@/config/env";
import { redirect } from "next/navigation";
import { parseISO, isValid as isValidDate, format as formatDateFns } from "date-fns";

// Helper to normalize date to YYYY-MM-DD
function toYMD(dateish: string) {
  if (!dateish) return "";
  const d = parseISO(String(dateish));
  return isValidDate(d) ? formatDateFns(d, "yyyy-MM-dd") : "";
}

// Helper to normalize array with a minimum length (does NOT truncate existing data)
function normalizeArray<T>(
  arr: T[] | undefined,
  minimumLength: number,
  createEmpty: () => T
): T[] {
  const normalized = Array.isArray(arr) ? [...arr] : [];
  while (normalized.length < minimumLength) {
    normalized.push(createEmpty());
  }
  return normalized;
}

async function fetchPage3Data(trackerId: string) {
  const base = NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
  try {
    const res = await fetch(
      `${base}/api/v1/onboarding/${trackerId}/application-form/page-3`,
      { cache: "no-store" }
    );

    if (res.status === 403) {
      redirect(`/onboarding/${trackerId}/application-form/page-2`);
    }
    if (!res.ok) {
      console.warn("Page 3 fetch failed:", res.status);
      return null;
    }

    const json = await res.json();
    return {
      page3: json?.data?.page3 ?? null,
      trackerContext: json?.data?.onboardingContext ?? null, // 👈 keep nextUrl handy
    };
  } catch (error) {
    console.error("Error fetching Page 3 data:", error);
    return null;
  }
}

export default async function Page3ServerWrapper({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: trackerId } = await params;
  const fetched = await fetchPage3Data(trackerId);
  const pageData = fetched?.page3;
  const trackerContextFromGet = fetched?.trackerContext ?? null;

  // Normalize the data
  const defaultValues: ApplicationFormPage3Schema = {
    accidentHistory: normalizeArray(
      pageData?.accidentHistory,
      4,
      () => ({ date: "", natureOfAccident: "", fatalities: 0, injuries: 0 })
    ).map(item => ({
      ...item,
      date: toYMD(item.date),
    })),
    trafficConvictions: normalizeArray(
      pageData?.trafficConvictions,
      4,
      () => ({ date: "", location: "", charge: "", penalty: "" })
    ).map(item => ({
      ...item,
      date: toYMD(item.date),
    })),
    education: {
      gradeSchool: pageData?.education?.gradeSchool ?? 0,
      college: pageData?.education?.college ?? 0,
      postGraduate: pageData?.education?.postGraduate ?? 0,
    },
    canadianHoursOfService: {
      dayOneDate: toYMD(pageData?.canadianHoursOfService?.dayOneDate),
      dailyHours: normalizeArray(
        pageData?.canadianHoursOfService?.dailyHours,
        14,
        () => ({ day: 1, hours: 0 })
      ).map((item, i) => ({
        ...item,
        day: (item.day || i + 1) as number, // Ensure day is a number 1-14
        hours: item.hours || 0,
      })),
      totalHours: pageData?.canadianHoursOfService?.totalHours ?? 0,
    },
  };

  return (
    <Page3Client
      defaultValues={defaultValues}
      trackerId={trackerId}
      trackerContextFromGet={trackerContextFromGet}
    />
  );
}
