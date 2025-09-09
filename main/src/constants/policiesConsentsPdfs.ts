import { CanadianCompanyId, ECompanyId, isCanadianCompany } from "./companies";

/**
 * Folder layout:
 * /docs/companies/{ca|us}/{company-policies|hiring|road-test-certificates}/*.pdf
 * /docs/companies/shared/*.pdf   <-- applies to BOTH CA and US companies
 */

/** Per-company "Company Policy" PDFs */
export const COMPANY_POLICY_PDFS: Record<ECompanyId, { label: string; path: string }> = {
  [ECompanyId.SSP_CA]: {
    label: "Company Policy",
    path: "/docs/companies/ca/company-policies/company-policy-ssp-ca.pdf",
  },
  [ECompanyId.SSP_US]: {
    label: "Company Policy",
    path: "/docs/companies/us/company-policies/company-policy-ssp-us.pdf",
  },
  [ECompanyId.FELLOW_TRANS]: {
    label: "Company Policy",
    path: "/docs/companies/ca/company-policies/company-policy-fellows.pdf",
  },
  [ECompanyId.WEB_FREIGHT]: {
    label: "Company Policy",
    path: "/docs/companies/ca/company-policies/company-policy-webfreight.pdf",
  },
  [ECompanyId.NESH]: {
    label: "Company Policy",
    path: "/docs/companies/ca/company-policies/company-policy-new-england.pdf",
  },
};

/** PDFs shared by ALL companies (CA + US) */
export const SHARED_FORMS: { label: string; path: string }[] = [
  { label: "Personal Consent (CROF-I)", path: "/docs/companies/shared/personal-consent-cfroi.pdf" },
  { label: "PSP Authorization Form", path: "/docs/companies/shared/psp-authorization.pdf" },
];

/** Company-specific Road Test Certificates (CANADA) */
export const CANADIAN_ROAD_TEST_CERTS: Record<CanadianCompanyId, { label: string; path: string }> = {
  [ECompanyId.SSP_CA]: {
    label: "Road Test Certificate",
    path: "/docs/companies/ca/road-test-certificates/road-test-certificate-ssp-ca.pdf",
  },
  [ECompanyId.FELLOW_TRANS]: {
    label: "Road Test Certificate",
    path: "/docs/companies/ca/road-test-certificates/road-test-certificate-fellows.pdf",
  },
  [ECompanyId.NESH]: {
    label: "Road Test Certificate",
    path: "/docs/companies/ca/road-test-certificates/road-test-certificate-nesh.pdf",
  },
  [ECompanyId.WEB_FREIGHT]: {
    label: "Road Test Certificate",
    path: "/docs/companies/ca/road-test-certificates/road-test-certificate-webfreight.pdf",
  },
};

/** US-only common forms */
export const US_COMMON_FORMS: { label: string; path: string }[] = [
  ...SHARED_FORMS,
  { label: "Road Test Certificate", path: "/docs/companies/us/road-test-certificates/road-test-certificate-ssp-us.pdf" },
];

/** Canadian Hiring Application PDFs — mapped by company */
export const CANADIAN_HIRING_PDFS: Record<CanadianCompanyId, { label: string; path: string }> = {
  [ECompanyId.SSP_CA]: {
    label: "SSP Hiring Application",
    path: "/docs/companies/ca/hiring/ssp-hiring-application-ca.pdf",
  },
  [ECompanyId.FELLOW_TRANS]: {
    label: "Fellows Hiring Application",
    path: "/docs/companies/ca/hiring/fellows-hiring-application.pdf",
  },
  [ECompanyId.NESH]: {
    label: "New England Hiring Application",
    path: "/docs/companies/ca/hiring/new-england-hiring-application.pdf",
  },
  [ECompanyId.WEB_FREIGHT]: {
    label: "Web Freight Hiring Application",
    path: "/docs/companies/ca/hiring/web-freight-hiring-application.pdf",
  },
};

/** US Hiring Application (single company for now) */
export const US_HIRING_PDF: { label: string; path: string } = {
  label: "SSP Hiring Application (US)",
  path: "/docs/companies/us/hiring/ssp-hiring-application-us.pdf",
};

/**
 * Helper: get the full list of PDFs for a given company
 * (company policy + region-common forms + company’s hiring application)
 */
export function getPoliciesPdfsForCompany(companyId: ECompanyId): { label: string; path: string }[] {
  const policy = COMPANY_POLICY_PDFS[companyId];

  if (isCanadianCompany(companyId)) {
    const hiring = CANADIAN_HIRING_PDFS[companyId as CanadianCompanyId];
    const roadCert = CANADIAN_ROAD_TEST_CERTS[companyId as CanadianCompanyId];
    // Keep ISB Consent and other shared forms; add company-specific road cert
    const canadianCommon: { label: string; path: string }[] = [...SHARED_FORMS, { label: "ISB Consent Form", path: "/docs/companies/ca/isb-consent.pdf" }, roadCert];
    return [policy, ...canadianCommon, hiring];
  }

  // US
  return [policy, ...US_COMMON_FORMS, US_HIRING_PDF];
}

/**
 * Region-level bundles (policy not included here on purpose)
 * NOTE: CA now depends on company (company-specific road test cert),
 * so it's exposed as a function instead of a static array.
 */
export const policiesConsentFormsUS: { label: string; path: string }[] = [...US_COMMON_FORMS];

export const policiesConsentFormsCA = (companyId: CanadianCompanyId): { label: string; path: string }[] => [
  ...SHARED_FORMS,
  { label: "ISB Consent Form", path: "/docs/companies/ca/isb-consent.pdf" },
  CANADIAN_ROAD_TEST_CERTS[companyId],
];

/** Per-company single lookups */
export const companyPolicyByCompany: Record<ECompanyId, { label: string; path: string }> = COMPANY_POLICY_PDFS;

export const hiringAppByCompany: Partial<Record<ECompanyId, { label: string; path: string }>> = {
  ...CANADIAN_HIRING_PDFS,
  [ECompanyId.SSP_US]: US_HIRING_PDF,
};
