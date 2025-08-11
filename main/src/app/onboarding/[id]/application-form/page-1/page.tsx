// main/src/app/onboarding/[id]/application-form/page-1/page.tsx
/**
 * DriveDock Onboarding — Page 1 (Identity & Addresses) Server Wrapper
 * - Fetches saved Page 1 data + onboardingContext (nextUrl) by tracker ID
 * - Normalizes into ApplicationFormPage1Schema defaultValues
 * - Passes onboardingContext into client for no-op continue jumps
 */

import { ApplicationFormPage1Schema } from "@/lib/zodSchemas/applicationFormPage1.schema";
import { ELicenseType } from "@/types/shared.types";
import Page1Client from "./Page1Client";
import { NEXT_PUBLIC_BASE_URL } from "@/config/env";
import {
  parseISO,
  isValid as isValidDate,
  format as formatDateFns,
} from "date-fns";

// Minimal placeholders that satisfy the zod/photo shape
function emptyS3Photo() {
  return { s3Key: "", url: "" };
}

// Single blank address row so only "Current Address" shows on first render
const BLANK_ADDRESS = {
  address: "",
  city: "",
  stateOrProvince: "",
  postalCode: "",
  from: "",
  to: "",
};

// Normalize any date-ish string into YYYY-MM-DD; return "" if invalid (timezone-safe).
function toYMD(dateish: string): string {
  if (!dateish) return "";
  const d = parseISO(String(dateish));
  return isValidDate(d) ? formatDateFns(d, "yyyy-MM-dd") : "";
}

async function fetchPage1Data(trackerId: string) {
  const base = NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";
  try {
    const res = await fetch(
      `${base}/api/v1/onboarding/${trackerId}/application-form/page-1`,
      { cache: "no-store" }
    );

    if (!res.ok) {
      console.warn("Page 1 fetch failed:", res.status);
      return null;
    }

    const json = await res.json();
    return {
      page1: json?.data?.page1 ?? null,
      trackerContext: json?.data?.onboardingContext ?? null, // 👈 keep nextUrl handy
    };
  } catch (error) {
    console.error("Error fetching Page 1 data:", error);
    return null;
  }
}

// Fallback defaults (used if no data is returned)
const EMPTY_DEFAULTS: ApplicationFormPage1Schema = {
  firstName: "",
  lastName: "",
  sin: "",
  sinPhoto: emptyS3Photo(),
  dob: "",
  phoneHome: "",
  phoneCell: "",
  canProvideProofOfAge: false,
  email: "",
  emergencyContactName: "",
  emergencyContactPhone: "",
  birthCity: "",
  birthCountry: "",
  birthStateOrProvince: "",
  licenses: [
    {
      licenseNumber: "",
      licenseStateOrProvince: "",
      licenseType: ELicenseType.AZ,
      licenseExpiry: "",
      licenseFrontPhoto: emptyS3Photo(),
      licenseBackPhoto: emptyS3Photo(),
    },
  ],
  addresses: [BLANK_ADDRESS],
};

export default async function Page1ServerWrapper({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: trackerId } = await params;
  const fetched = await fetchPage1Data(trackerId);
  const pageData = fetched?.page1;
  const trackerContextFromGet = fetched?.trackerContext ?? null;

  const defaultValues: ApplicationFormPage1Schema = pageData
    ? {
        firstName: pageData.firstName || "",
        lastName: pageData.lastName || "",
        // If server ever returns clear SIN (first-time POST), show it; otherwise require re-entry.
        sin:
          typeof pageData.sin === "string" && /^\d{9}$/.test(pageData.sin)
            ? pageData.sin
            : "",
        sinPhoto: pageData.sinPhoto || emptyS3Photo(),
        dob: toYMD(pageData.dob),
        phoneHome: pageData.phoneHome || "",
        phoneCell: pageData.phoneCell || "",
        canProvideProofOfAge: !!pageData.canProvideProofOfAge,
        email: pageData.email || "",
        emergencyContactName: pageData.emergencyContactName || "",
        emergencyContactPhone: pageData.emergencyContactPhone || "",
        birthCity: pageData.birthCity || "",
        birthCountry: pageData.birthCountry || "",
        birthStateOrProvince: pageData.birthStateOrProvince || "",
        licenses:
          Array.isArray(pageData.licenses) && pageData.licenses.length
            ? pageData.licenses.map((l: any) => ({
                licenseNumber: l.licenseNumber || "",
                licenseStateOrProvince: l.licenseStateOrProvince || "",
                licenseType: l.licenseType || ELicenseType.AZ,
                licenseExpiry: toYMD(l.licenseExpiry),
                licenseFrontPhoto: {
                  s3Key: l.licenseFrontPhoto?.s3Key || "",
                  url: l.licenseFrontPhoto?.url || "",
                },
                licenseBackPhoto: {
                  s3Key: l.licenseBackPhoto?.s3Key || "",
                  url: l.licenseBackPhoto?.url || "",
                },
              }))
            : EMPTY_DEFAULTS.licenses,
        addresses:
          Array.isArray(pageData.addresses) && pageData.addresses.length
            ? pageData.addresses.map((a: any) => ({
                address: a.address || "",
                city: a.city || "",
                stateOrProvince: a.stateOrProvince || "",
                postalCode: a.postalCode || "",
                from: toYMD(a.from),
                to: toYMD(a.to),
              }))
            : [BLANK_ADDRESS],
      }
    : EMPTY_DEFAULTS;

  return (
    <Page1Client
      defaultValues={defaultValues}
      trackerId={trackerId}
      trackerContextFromGet={trackerContextFromGet}
    />
  );
}
