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

//Fix: Creates empty mock file to satisfy zod + TS
function getEmptyFile(): File {
  return new File([], "", { type: "application/octet-stream" });
}

const emptyFormDefaults: ApplicationFormPage1Schema = {
  firstName: "",
  lastName: "",
  sin: "",
  sinPhoto: getEmptyFile(),
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
      licenseFrontPhoto: getEmptyFile(),
      licenseBackPhoto: getEmptyFile(),
    },
  ],
  addresses: [],
};

// 🔍 Server-side fetch
async function fetchPage1Data(trackerId: string) {
  try {
    const res = await fetch(
      `${
        process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000"
      }/api/v1/onboarding/${trackerId}/application-form/page-1`,
      { cache: "no-store" }
    );

    if (!res.ok) return null;
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
  params: { id: string };
}) {
  const trackerId = params.id;
  const pageData = await fetchPage1Data(trackerId);

  const defaultValues: ApplicationFormPage1Schema = pageData
    ? {
        firstName: pageData.firstName || "",
        lastName: pageData.lastName || "",
        sin: pageData.sinEncrypted ? "•••••••••" : "",
        sinPhoto: getEmptyFile(),
        dob: pageData.dob || "",
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
              licenseExpiry: license.licenseExpiry || "",
              licenseFrontPhoto: getEmptyFile(),
              licenseBackPhoto: getEmptyFile(),
            }))
          : emptyFormDefaults.licenses,
        addresses: pageData.addresses || [],
      }
    : emptyFormDefaults;

  return <Page1Client defaultValues={defaultValues} trackerId={trackerId} />;
}
