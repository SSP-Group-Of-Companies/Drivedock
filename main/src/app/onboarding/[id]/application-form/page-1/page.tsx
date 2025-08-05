import { ApplicationFormPage1Schema } from "@/lib/zodSchemas/applicationFormPage1.schema";
import { ELicenseType } from "@/types/shared.types";

import Page1Client from "./Page1Client";

// Server-side data fetching function
async function fetchPage1Data(trackerId: string) {
  try {
    const response = await fetch(
      `${
        process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000"
      }/api/v1/onboarding/${trackerId}/application-form/page-1`,
      {
        cache: "no-store",
      }
    );

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return data.data?.page1 || null;
  } catch (error) {
    console.error("Error fetching page 1 data:", error);
    return null;
  }
}

export default async function ApplicationFormPage1({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: trackerId } = await params;

  // ✅ Server-side data fetching
  const pageData = await fetchPage1Data(trackerId);

  // ✅ Transform data for form (handle decryption, etc.)
  const defaultValues: ApplicationFormPage1Schema = pageData
    ? {
        firstName: pageData.firstName || "",
        lastName: pageData.lastName || "",
        sin: pageData.sinEncrypted ? "•••••••••" : "", // Masked for security
        sinPhoto: undefined as any, // Files can't be pre-filled
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
              licenseFrontPhoto: undefined as any, // Files can't be pre-filled
              licenseBackPhoto: undefined as any, // Files can't be pre-filled
            }))
          : [
              {
                licenseNumber: "",
                licenseStateOrProvince: "",
                licenseType: ELicenseType.AZ,
                licenseExpiry: "",
                licenseFrontPhoto: undefined as any,
                licenseBackPhoto: undefined as any,
              },
            ],
        addresses: pageData.addresses || [],
      }
    : {
        firstName: "",
        lastName: "",
        sin: "",
        sinPhoto: undefined as any,
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
            licenseFrontPhoto: undefined as any,
            licenseBackPhoto: undefined as any,
          },
        ],
        addresses: [],
      };

  return <Page1Client defaultValues={defaultValues} trackerId={trackerId} />;
}
