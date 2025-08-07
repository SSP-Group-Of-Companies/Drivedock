/**
 * DriveDock Onboarding - Page 1 Server Wrapper
 *
 * This server component is responsible for:
 * - Fetching existing application form Page 1 data using the tracker ID
 * - Mapping data into ApplicationFormPage1Schema-compliant structure
 * - Passing pre-filled `defaultValues` and `trackerId` to Page1Client
 *
 * If no data is found, it falls back to an empty schema.
 * Used when drivers revisit Page 1 after the initial POST.
 *
 * @route /onboarding/[id]/application-form/page-1
 * @owner SSP Tech Team - Faruq Adebayo Atanda
 */

import { ApplicationFormPage1Schema } from "@/lib/zodSchemas/applicationFormPage1.schema";
import { ELicenseType } from "@/types/shared.types";
import Page1Client from "./Page1Client";
import { NEXT_PUBLIC_BASE_URL } from "@/config/env";

// Fix: Creates empty mock file to satisfy zod + TS
function getEmptyS3Photo() {
  return { s3Key: "", url: "" };
}

// Utility: Normalize date to YYYY-MM-DD format
function formatDate(dateString: string): string {
  if (!dateString) return "";
  const date = new Date(dateString);
  return isNaN(date.getTime()) ? "" : date.toISOString().split("T")[0];
}

// Empty fallback object for first-time render
const emptyFormDefaults: ApplicationFormPage1Schema = {
  firstName: "",
  lastName: "",
  sin: "",
  sinPhoto: getEmptyS3Photo(),
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
      licenseFrontPhoto: getEmptyS3Photo(),
      licenseBackPhoto: getEmptyS3Photo(),
    },
  ],
  addresses: [],
};

// 🔍 Server-side fetch
async function fetchPage1Data(trackerId: string) {
  try {
    const res = await fetch(
      `${
        NEXT_PUBLIC_BASE_URL || "http://localhost:3000"
      }/api/v1/onboarding/${trackerId}/application-form/page-1`,
      { cache: "no-store" }
    );

    if (!res.ok) {
      console.warn("Page 1 fetch failed:", res.status);
      return null;
    }

    const data = await res.json();
    return data.data?.page1 || null;
  } catch (error) {
    console.error("Error fetching Page 1 data:", error);
    return null;
  }
}

export default async function Page1ServerWrapper({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: trackerId } = await params;
  const pageData = await fetchPage1Data(trackerId);

  const defaultValues: ApplicationFormPage1Schema = pageData
    ? {
        firstName: pageData.firstName || "",
        lastName: pageData.lastName || "",
        sin:
          typeof pageData.sin === "string" && /^\d{9}$/.test(pageData.sin)
            ? pageData.sin // Clean, real SIN (e.g., from first-time POST)
            : "", // Mask it, so driver must retype if it's encrypted

        sinPhoto: pageData.sinPhoto || getEmptyS3Photo(),
        dob: formatDate(pageData.dob),
        phoneHome: pageData.phoneHome || "",
        phoneCell: pageData.phoneCell || "",
        canProvideProofOfAge: pageData.canProvideProofOfAge || false,
        email: pageData.email || "",
        emergencyContactName: pageData.emergencyContactName || "",
        emergencyContactPhone: pageData.emergencyContactPhone || "",
        birthCity: pageData.birthCity || "",
        birthCountry: pageData.birthCountry || "",
        birthStateOrProvince: pageData.birthStateOrProvince || "",
        licenses: pageData.licenses?.length
          ? pageData.licenses.map((license: any) => ({
              licenseNumber: license.licenseNumber || "",
              licenseStateOrProvince: license.licenseStateOrProvince || "",
              licenseType: license.licenseType || ELicenseType.AZ,
              licenseExpiry: formatDate(license.licenseExpiry),
              licenseFrontPhoto: {
                s3Key: license.licenseFrontPhoto?.s3Key || "",
                url: license.licenseFrontPhoto?.url || "",
              },
              licenseBackPhoto: {
                s3Key: license.licenseBackPhoto?.s3Key || "",
                url: license.licenseBackPhoto?.url || "",
              },
            }))
          : emptyFormDefaults.licenses,

        addresses:
          pageData.addresses?.map((addr: any) => ({
            ...addr,
            from: formatDate(addr.from),
            to: formatDate(addr.to),
          })) || [],
      }
    : emptyFormDefaults;

  return <Page1Client defaultValues={defaultValues} trackerId={trackerId} />;
}
