import { CanadianCompanyId, ECompanyId, isCanadianCompany } from "./companies";

/**
 * New folder layout used below:
 * /docs/companies/{ca|us}/{company-policies|hiring}/*.pdf
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

/** Common CA consent forms (shared across all Canadian companies) */
export const CANADIAN_COMMON_FORMS: { label: string; path: string }[] = [
  { label: "ISB Consent Form", path: "/docs/companies/ca/hiring/isb-consent-form.pdf" },
  { label: "Personal Consent (CROF-I)", path: "/docs/companies/ca/hiring/personal-consent-form-cfroi.pdf" },
  { label: "PSP Authorization Form", path: "/docs/companies/ca/hiring/psp-authorization-form.pdf" },
  { label: "Road Test Certificate", path: "/docs/companies/ca/hiring/road-test-certificate.pdf" },
];

/** Common US consent forms (shared across the US) */
export const US_COMMON_FORMS: { label: string; path: string }[] = [
  { label: "Personal Consent (CROF-I)", path: "/docs/companies/us/hiring/personal-consent-form-cfroi-us-drivers.pdf" },
  { label: "PSP Authorization Form", path: "/docs/companies/us/hiring/psp-authorization-form-us-drivers.pdf" },
  // Note: filename is spelled 'raod' in the repo; keep as-is.
  { label: "Road Test Certificate", path: "/docs/companies/us/hiring/raod-test-certificate-us-drivers.pdf" },
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
    return [policy, ...CANADIAN_COMMON_FORMS, hiring];
  }

  // US
  return [policy, ...US_COMMON_FORMS, US_HIRING_PDF];
}
