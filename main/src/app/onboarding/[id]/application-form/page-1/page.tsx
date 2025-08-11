/**
 * DriveDock Onboarding - Page 1 Server Wrapper
 *
 * Responsibilities:
 * - Fetch existing Page 1 data via tracker ID
 * - Map response into ApplicationFormPage1Schema shape
 * - Seed one blank address when none exist (StrictMode-safe)
 * - Pass `defaultValues` + `trackerId` into the client component
 *
 * @route /onboarding/[id]/application-form/page-1
 * @owner SSP Tech Team - Faruq Adebayo Atanda
 */

import { ApplicationFormPage1Schema } from "@/lib/zodSchemas/applicationFormPage1.schema";
import { ELicenseType } from "@/types/shared.types";
import Page1Client from "./Page1Client";
import { NEXT_PUBLIC_BASE_URL } from "@/config/env";

// Minimal placeholders that satisfy the zod/photo shape
function getEmptyS3Photo() {
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

// Normalize date -> YYYY-MM-DD
function formatDate(dateString: string): string {
  if (!dateString) return "";
  const date = new Date(dateString);
  return isNaN(date.getTime()) ? "" : date.toISOString().split("T")[0];
}

// Fallback defaults (used if no data is returned)
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
  // 👇 StrictMode-safe: always start with exactly one address
  addresses: [BLANK_ADDRESS],
};

// 🔍 Server-side fetch
async function fetchPage1Data(trackerId: string) {
  try {
    const res = await fetch(
      `${
        NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000"
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
        // If server ever returns clear SIN (first-time POST), show it; otherwise require re-entry.
        sin:
          typeof pageData.sin === "string" && /^\d{9}$/.test(pageData.sin)
            ? pageData.sin
            : "",
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
        // If no addresses exist, seed one blank "Current Address"
        addresses: pageData.addresses?.length
          ? pageData.addresses.map((addr: any) => ({
              address: addr.address || "",
              city: addr.city || "",
              stateOrProvince: addr.stateOrProvince || "",
              postalCode: addr.postalCode || "",
              from: formatDate(addr.from),
              to: formatDate(addr.to),
            }))
          : [BLANK_ADDRESS],
      }
    : emptyFormDefaults;

  return <Page1Client defaultValues={defaultValues} trackerId={trackerId} />;
}
