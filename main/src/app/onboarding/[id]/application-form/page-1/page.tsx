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
import { formatInputDate } from "@/lib/utils/dateUtils";

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

/** ---------- Error-handled fetch (same style as Page 5) ---------- */
type Page1DataResponse = {
  data?: { page1?: any; onboardingContext?: any };
  error?: string;
};

async function fetchPage1Data(trackerId: string): Promise<Page1DataResponse> {
  const base = NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";
  try {
    const res = await fetch(`${base}/api/v1/onboarding/${trackerId}/application-form/page-1`, { cache: "no-store" });

    if (!res.ok) {
      // Try to read a message from the API, fall back to generic
      let message = "Failed to fetch Page 1 data.";
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

/**
 * Fallback defaults for new applications or when no data is returned
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

export default async function Page1ServerWrapper({ params }: { params: Promise<{ id: string }> }) {
  const { id: trackerId } = await params;

  const { data, error } = await fetchPage1Data(trackerId);
  if (error) {
    return <div className="p-6 text-center text-red-600 font-semibold">{error}</div>;
  }

  const pageData = data?.page1;
  // Keep your existing “empty defaults for new apps” behavior:
  const defaultValues: ApplicationFormPage1Schema = pageData
    ? {
        firstName: pageData.firstName || "",
        lastName: pageData.lastName || "",
        sin: typeof pageData.sin === "string" && /^\d{9}$/.test(pageData.sin) ? pageData.sin : "",
        sinPhoto: pageData.sinPhoto || emptyS3Photo(),
        dob: formatInputDate(pageData.dob),
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
                licenseExpiry: formatInputDate(l.licenseExpiry),
                licenseFrontPhoto:
                  index === 0
                    ? {
                        s3Key: l.licenseFrontPhoto?.s3Key || "",
                        url: l.licenseFrontPhoto?.url || "",
                      }
                    : undefined,
                licenseBackPhoto:
                  index === 0
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
                from: formatInputDate(a.from),
                to: formatInputDate(a.to),
              }))
            : [BLANK_ADDRESS],
      }
    : EMPTY_DEFAULTS;

  return <Page1Client defaultValues={defaultValues} trackerId={trackerId} />;
}
