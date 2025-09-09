import { ECompanyId, getCompanyById } from "@/constants/companies";
import { ECountryCode } from "@/types/shared.types";

type IPdfListItem = {
  label: string;
  apiUrl: string;
  needsSafetyAdminId: boolean;
};

export const getCompanyPdfList = (companyId: ECompanyId, onboardingId: string): IPdfListItem[] => {
  const isCa = getCompanyById(companyId)?.countryCode === ECountryCode.CA;

  const apiBase = `/api/v1/admin/onboarding/${onboardingId}/filled-pdf`;
  const base: IPdfListItem[] = [
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
      apiUrl: `/api/v1/admin/onboarding/${onboardingId}/appraisal/pre-trip-assessment/filled-pdf`,
      needsSafetyAdminId: false,
    },
    {
      label: "ON-Road Assessment",
      apiUrl: `/api/v1/admin/onboarding/${onboardingId}/appraisal/on-road-assessment/filled-pdf`,
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

  // Add ISB Consent at the top for CA companies only
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

  // US companies
  return base;
};
