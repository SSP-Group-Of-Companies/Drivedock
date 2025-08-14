/**
 * Application Form Page 1 Server Component — DriveDock (SSP Portal)
 *
 * Description:
 * Server-side wrapper for Page 1 of the application form (Identity & Addresses).
 * Fetches existing data from the backend, normalizes it for React Hook Form,
 * and passes it to the client component. Handles data transformation and
 * provides fallback defaults for new applications.
 *
 * Features:
 * - Fetches saved Page 1 data by tracker ID
 * - Normalizes dates, addresses, and license data
 * - Provides fallback defaults for new applications
 * - Handles S3 photo objects and license arrays
 * - Passes onboarding context for navigation
 *
 * Data Flow:
 * - Fetches from /api/v1/onboarding/[id]/application-form/page-1
 * - Normalizes dates to YYYY-MM-DD format
 * - Transforms backend data to RHF-compatible format
 * - Provides empty defaults for new applications
 *
 * Author: Faruq Adebayo Atanda
 * Company: SSP Group of Companies
 * Created: 2025-01-27
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

/**
 * Creates empty S3 photo object for form initialization
 * @returns Empty photo object with s3Key and url properties
 */
function emptyS3Photo() {
  return { s3Key: "", url: "" };
}

/**
 * Default blank address template for new applications
 * Ensures at least one address field is available on first render
 */
const BLANK_ADDRESS = {
  address: "",
  city: "",
  stateOrProvince: "",
  postalCode: "",
  from: "",
  to: "",
};

/**
 * Normalizes date strings to YYYY-MM-DD format for form inputs
 * Handles timezone-safe date parsing and validation
 * @param dateish - Date string to normalize
 * @returns Normalized date string or empty string if invalid
 */
function toYMD(dateish: string): string {
  if (!dateish) return "";
  const d = parseISO(String(dateish));
  return isValidDate(d) ? formatDateFns(d, "yyyy-MM-dd") : "";
}

/**
 * Fetches Page 1 data from the backend API
 * Retrieves existing application data and onboarding context for the given tracker ID
 * @param trackerId - The onboarding tracker ID
 * @returns Object containing page1 data and tracker context, or null if fetch fails
 */
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
      trackerContext: json?.data?.onboardingContext ?? null, // Keep nextUrl for navigation
    };
  } catch (error) {
    console.error("Error fetching Page 1 data:", error);
    return null;
  }
}

/**
 * Fallback defaults for new applications or when no data is returned
 * Provides complete schema structure with empty values for form initialization
 */
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
            ? pageData.licenses.map((l: any, index: number) => ({
                licenseNumber: l.licenseNumber || "",
                licenseStateOrProvince: l.licenseStateOrProvince || "",
                licenseType: l.licenseType || ELicenseType.AZ,
                licenseExpiry: toYMD(l.licenseExpiry),
                licenseFrontPhoto: index === 0 
                  ? {
                      s3Key: l.licenseFrontPhoto?.s3Key || "",
                      url: l.licenseFrontPhoto?.url || "",
                    }
                  : undefined,
                licenseBackPhoto: index === 0
                  ? {
                      s3Key: l.licenseBackPhoto?.s3Key || "",
                      url: l.licenseBackPhoto?.url || "",
                    }
                  : undefined,
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
