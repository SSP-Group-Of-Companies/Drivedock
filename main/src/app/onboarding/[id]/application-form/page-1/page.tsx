"use server";

import "server-only";
import Page1Client from "./Page1Client";
import { ApplicationFormPage1Schema } from "@/lib/zodSchemas/applicationFormPage1.schema";
import { ELicenseType } from "@/types/shared.types";
import { formatInputDate } from "@/lib/utils/dateUtils";
import { resolveInternalBaseUrl } from "@/lib/utils/urlHelper.server";
import { fetchServerPageData } from "@/lib/utils/fetchServerPageData";

/** ---------- Types ---------- */
type Page1Result = {
  page1?: any; // shape from API
  onboardingContext?: any; // if your API includes it
};

/** Creates empty S3 photo object for form initialization */
function emptyS3Photo() {
  return { s3Key: "", url: "", mimeType: "", sizeBytes: 0, originalName: "" };
}

/** Default blank address template for new applications */
const BLANK_ADDRESS = {
  address: "",
  city: "",
  stateOrProvince: "",
  postalCode: "",
  from: "",
  to: "",
};

/** Fallback defaults for new applications or when no data is returned */
const EMPTY_DEFAULTS: ApplicationFormPage1Schema = {
  firstName: "",
  lastName: "",
  sin: "",
  sinIssueDate: "",
  gender: "" as "male" | "female",
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

  // Build same-origin absolute URL (dev + Vercel preview safe)
  const base = await resolveInternalBaseUrl();
  const url = `${base}/api/v1/onboarding/${trackerId}/application-form/page-1`;

  // Unified fetch pattern (handles cookies/redirects/JSON)
  const { data, error } = await fetchServerPageData<Page1Result>(url);

  if (error) {
    return <div className="p-6 text-center text-red-600 font-semibold">{error}</div>;
  }

  const pageData = data?.page1;

  // Keep your existing "empty defaults for new apps" behavior
  const defaultValues: ApplicationFormPage1Schema = pageData
    ? {
        firstName: pageData.firstName || "",
        lastName: pageData.lastName || "",
        sin: typeof pageData.sin === "string" && /^\d{9}$/.test(pageData.sin) ? pageData.sin : "",
        sinIssueDate: pageData.sinIssueDate ? formatInputDate(pageData.sinIssueDate) : "",
        gender: pageData.gender || ("" as "male" | "female"),
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
                // Only first license has photos in your current UX
                licenseFrontPhoto:
                  index === 0
                    ? {
                        s3Key: l.licenseFrontPhoto?.s3Key || "",
                        url: l.licenseFrontPhoto?.url || "",
                        mimeType: l.licenseFrontPhoto?.mimeType || "",
                        sizeBytes: l.licenseFrontPhoto?.sizeBytes || 0,
                        originalName: l.licenseFrontPhoto?.originalName || "",
                      }
                    : undefined,
                licenseBackPhoto:
                  index === 0
                    ? {
                        s3Key: l.licenseBackPhoto?.s3Key || "",
                        url: l.licenseBackPhoto?.url || "",
                        mimeType: l.licenseFrontPhoto?.mimeType || "",
                        sizeBytes: l.licenseFrontPhoto?.sizeBytes || 0,
                        originalName: l.licenseFrontPhoto?.originalName || "",
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

  return <Page1Client defaultValues={defaultValues} trackerId={trackerId} trackerContextFromGet={data?.onboardingContext} />;
}
