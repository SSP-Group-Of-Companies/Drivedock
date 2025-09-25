// src/lib/policiesConsentsPdfs.server.ts
/**
 * Server-side helpers for Policies/Consents PDFs.
 * - Keeps the same label + webPath structure you use on the client
 * - Adds absPath (resolved from process.cwd()) so API routes can read files
 *
 * Assumptions:
 *   All PDFs live under public/docs/... so that:
 *     webPath:  "/docs/companies/ca/hiring/ssp-hiring-application-ca.pdf"
 *     absPath:  <process.cwd()> + "/public/docs/companies/ca/hiring/ssp-hiring-application-ca.pdf"
 */

import path from "path";
import fs from "fs";

import { CanadianCompanyId, ECompanyId, isCanadianCompany } from "./companies";

export type TPdfRef = {
  label: string;
  /** Public URL path (served from Next.js /public) */
  webPath: string;
  /** Absolute filesystem path for server use (attachments, fs reads, etc.) */
  absPath: string;
  /** Whether the file exists on disk (handy for defensive checks in APIs) */
  exists: boolean;
};

/** Convert a web path (/docs/...) to an absolute path under /public */
function toAbsPath(webPath: string): string {
  // Ensure leading slash is trimmed when joining after "public"
  const clean = webPath.startsWith("/") ? webPath.slice(1) : webPath;
  return path.join(process.cwd(), "public", clean);
}

function makeRef(label: string, webPath: string): TPdfRef {
  const absPath = toAbsPath(webPath);
  const exists = fs.existsSync(absPath);
  return { label, webPath, absPath, exists };
}

/**
 * NOTE: The web paths below mirror your client constants exactly.
 * Only difference: on export we wrap them with makeRef(...) to include absPath + exists.
 */

/** Per-company "Company Policy" PDFs */
const COMPANY_POLICY_PDFS_WEB: Record<ECompanyId, { label: string; webPath: string }> = {
  [ECompanyId.SSP_CA]: {
    label: "Company Policy",
    webPath: "/docs/companies/ca/company-policies/company-policy-ssp-ca.pdf",
  },
  [ECompanyId.SSP_US]: {
    label: "Company Policy",
    webPath: "/docs/companies/us/company-policies/company-policy-ssp-us.pdf",
  },
  [ECompanyId.FELLOW_TRANS]: {
    label: "Company Policy",
    webPath: "/docs/companies/ca/company-policies/company-policy-fellows.pdf",
  },
  [ECompanyId.WEB_FREIGHT]: {
    label: "Company Policy",
    webPath: "/docs/companies/ca/company-policies/company-policy-webfreight.pdf",
  },
  [ECompanyId.NESH]: {
    label: "Company Policy",
    webPath: "/docs/companies/ca/company-policies/company-policy-new-england.pdf",
  },
};

/** PDFs shared by ALL companies (CA + US) */
const SHARED_FORMS_WEB: { label: string; webPath: string }[] = [
  { label: "Personal Consent (CROF-I)", webPath: "/docs/companies/shared/personal-consent-cfroi.pdf" },
  { label: "PSP Authorization Form", webPath: "/docs/companies/shared/psp-authorization.pdf" },
];

/** Company-specific Road Test Certificates (CANADA) */
const CANADIAN_ROAD_TEST_CERTS_WEB: Record<CanadianCompanyId, { label: string; webPath: string }> = {
  [ECompanyId.SSP_CA]: {
    label: "Road Test Certificate",
    webPath: "/docs/companies/ca/road-test-certificates/road-test-certificate-ssp-ca.pdf",
  },
  [ECompanyId.FELLOW_TRANS]: {
    label: "Road Test Certificate",
    webPath: "/docs/companies/ca/road-test-certificates/road-test-certificate-fellows.pdf",
  },
  [ECompanyId.NESH]: {
    label: "Road Test Certificate",
    webPath: "/docs/companies/ca/road-test-certificates/road-test-certificate-nesh.pdf",
  },
  [ECompanyId.WEB_FREIGHT]: {
    label: "Road Test Certificate",
    webPath: "/docs/companies/ca/road-test-certificates/road-test-certificate-webfreight.pdf",
  },
};

/** US-only common forms */
const US_COMMON_FORMS_WEB: { label: string; webPath: string }[] = [
  ...SHARED_FORMS_WEB,
  { label: "Road Test Certificate", webPath: "/docs/companies/us/road-test-certificates/road-test-certificate-ssp-us.pdf" },
];

/** Canadian Hiring Application PDFs — mapped by company */
const CANADIAN_HIRING_PDFS_WEB: Record<CanadianCompanyId, { label: string; webPath: string }> = {
  [ECompanyId.SSP_CA]: {
    label: "SSP Hiring Application",
    webPath: "/docs/companies/ca/hiring/ssp-hiring-application-ca.pdf",
  },
  [ECompanyId.FELLOW_TRANS]: {
    label: "Fellows Hiring Application",
    webPath: "/docs/companies/ca/hiring/fellows-hiring-application.pdf",
  },
  [ECompanyId.NESH]: {
    label: "New England Hiring Application",
    webPath: "/docs/companies/ca/hiring/new-england-hiring-application.pdf",
  },
  [ECompanyId.WEB_FREIGHT]: {
    label: "Web Freight Hiring Application",
    webPath: "/docs/companies/ca/hiring/web-freight-hiring-application.pdf",
  },
};

/** US Hiring Application (single company for now) */
const US_HIRING_PDF_WEB: { label: string; webPath: string } = {
  label: "SSP Hiring Application (US)",
  webPath: "/docs/companies/us/hiring/ssp-hiring-application-us.pdf",
};

/** Public helpers that return server-ready refs (with absPath) */

export function getCompanyPolicyPdf(companyId: ECompanyId): TPdfRef {
  const { label, webPath } = COMPANY_POLICY_PDFS_WEB[companyId];
  return makeRef(label, webPath);
}

export function getCanadianHiringPdf(companyId: CanadianCompanyId): TPdfRef {
  const { label, webPath } = CANADIAN_HIRING_PDFS_WEB[companyId];
  return makeRef(label, webPath);
}

export function getCanadianRoadTestCert(companyId: CanadianCompanyId): TPdfRef {
  const { label, webPath } = CANADIAN_ROAD_TEST_CERTS_WEB[companyId];
  return makeRef(label, webPath);
}

export function getUsHiringPdf(): TPdfRef {
  return makeRef(US_HIRING_PDF_WEB.label, US_HIRING_PDF_WEB.webPath);
}

export function getSharedForms(): TPdfRef[] {
  return SHARED_FORMS_WEB.map((f) => makeRef(f.label, f.webPath));
}

export function getUsCommonForms(): TPdfRef[] {
  return US_COMMON_FORMS_WEB.map((f) => makeRef(f.label, f.webPath));
}

/**
 * Full list for a company (policy + region-common forms + company hiring app)
 * Matches your client helper but returns TPdfRef (with abs paths).
 */
export function getPoliciesPdfsForCompanyServer(companyId: ECompanyId): TPdfRef[] {
  const policy = getCompanyPolicyPdf(companyId);

  if (isCanadianCompany(companyId)) {
    const hiring = getCanadianHiringPdf(companyId as CanadianCompanyId);
    const roadCert = getCanadianRoadTestCert(companyId as CanadianCompanyId);

    const canadianCommon: TPdfRef[] = [...getSharedForms(), makeRef("ISB Consent Form", "/docs/companies/ca/isb-consent.pdf"), roadCert];

    return [policy, ...canadianCommon, hiring];
  }

  // US
  return [policy, ...getUsCommonForms(), getUsHiringPdf()];
}

/** Region-level bundles (policy not included) */
export function policiesConsentFormsUSServer(): TPdfRef[] {
  return getUsCommonForms();
}

export function policiesConsentFormsCAServer(companyId: CanadianCompanyId): TPdfRef[] {
  return [...getSharedForms(), makeRef("ISB Consent Form", "/docs/companies/ca/isb-consent.pdf"), getCanadianRoadTestCert(companyId)];
}

/** Per-company single lookups (server variants) */
export const companyPolicyByCompanyServer: Record<ECompanyId, TPdfRef> = Object.fromEntries(Object.entries(COMPANY_POLICY_PDFS_WEB).map(([k, v]) => [k, makeRef(v.label, v.webPath)])) as Record<
  ECompanyId,
  TPdfRef
>;

export const hiringAppByCompanyServer: Partial<Record<ECompanyId, TPdfRef>> = {
  ...(Object.fromEntries(Object.entries(CANADIAN_HIRING_PDFS_WEB).map(([k, v]) => [k, makeRef(v.label, v.webPath)])) as Record<CanadianCompanyId, TPdfRef>),
  [ECompanyId.SSP_US]: getUsHiringPdf(),
};
