import { ECompanyId } from "./companies";
import { COMPANY_POLICY_PDFS, CANADIAN_COMMON_FORMS, US_COMMON_FORMS, CANADIAN_HIRING_PDFS, US_HIRING_PDF, getPoliciesPdfsForCompany } from "./policiesConsentsPdfs";

/**
 * Keep these exports for any places already importing them,
 * but standardize shape to { label, path } for consistency.
 */

// Region-level bundles (policy not included here on purpose)
export const policiesConsentFormsUS: { label: string; path: string }[] = [...US_COMMON_FORMS, US_HIRING_PDF];
export const policiesConsentFormsCA: { label: string; path: string }[] = [...CANADIAN_COMMON_FORMS];

// Per-company single lookups
export const companyPolicyByCompany: Record<ECompanyId, { label: string; path: string }> = COMPANY_POLICY_PDFS;
export const hiringAppByCompany: Partial<Record<ECompanyId, { label: string; path: string }>> = {
  ...CANADIAN_HIRING_PDFS,
  [ECompanyId.SSP_US]: US_HIRING_PDF,
};

/**
 * Preferred helper to build the complete, ordered list for the UI.
 * (Company Policy → Region Common → Company Hiring)
 */
export { getPoliciesPdfsForCompany };
