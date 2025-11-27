import { ECompanyId, getCompanyById } from "@/constants/companies";
import { ECountryCode } from "@/types/shared.types";

type IPdfListItem = {
  label: string;
  apiUrl: string;
  needsSafetyAdminId: boolean;
};

export const getCompanyPdfList = (companyId: ECompanyId, onboardingId: string): IPdfListItem[] => {
  const company = getCompanyById(companyId);
  const countryCode = company?.countryCode;

  const isCa = countryCode === ECountryCode.CA;
  const isUs = countryCode === ECountryCode.US;

  const apiBase = `/api/v1/admin/onboarding/${onboardingId}/filled-pdf`;

  const base: IPdfListItem[] = [
    {
      label: "Pre-Qualifications",
      apiUrl: `${apiBase}/prequalifications`,
      needsSafetyAdminId: true,
    },
    {
      label: "Company Policy",
      apiUrl: `${apiBase}/company-policy`,
      needsSafetyAdminId: true,
    },
    {
      label: "Hiring Application",
      apiUrl: `${apiBase}/hiring-application`,
      needsSafetyAdminId: true,
    },
    {
      label: "Road Test Certificate",
      apiUrl: `${apiBase}/road-test-certificate`,
      needsSafetyAdminId: false,
    },
    {
      label: "Pre-Trip Assessment",
      apiUrl: `/api/v1/admin/onboarding/${onboardingId}/appraisal/drive-test/pre-trip-assessment/filled-pdf`,
      needsSafetyAdminId: false,
    },
    {
      label: "ON-Road Assessment",
      apiUrl: `/api/v1/admin/onboarding/${onboardingId}/appraisal/drive-test/on-road-assessment/filled-pdf`,
      needsSafetyAdminId: false,
    },
    {
      label: "Personal Consent CFROI",
      apiUrl: `${apiBase}/personal-consent-cfroi`,
      needsSafetyAdminId: false,
    },
    {
      label: "PSP Authorization",
      apiUrl: `${apiBase}/psp-authorization`,
      needsSafetyAdminId: false,
    },
  ];

  // CA companies → ISB Consent at the top
  if (isCa) {
    return [
      {
        label: "ISB Consent",
        apiUrl: `${apiBase}/isb-consent`,
        needsSafetyAdminId: true,
      },
      ...base,
    ];
  }

  // US companies → add I9 + W4 at the end
  if (isUs) {
    return [
      ...base,
      {
        label: "USCIS Form I-9",
        apiUrl: `${apiBase}/i9`,
        needsSafetyAdminId: true,
      },
      {
        label: "Form W-4",
        apiUrl: `${apiBase}/w4`,
        needsSafetyAdminId: false,
      },
    ];
  }

  // Other countries
  return base;
};
