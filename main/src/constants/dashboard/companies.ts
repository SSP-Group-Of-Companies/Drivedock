/**
 * Company assets resolver (enum-driven)
 * -------------------------------------
 * Uses COMPANIES and ECountryCode; no string heuristics (except final fallback
 * for unknown ids). Exported helpers are used by the ContractSummaryBar.
 */

import { COMPANIES, getCompanyById } from "@/constants/companies";
import { ECountryCode } from "@/types/shared.types";

export type CompanyMeta = Readonly<{
  id?: string;
  label: string;
  logoSrc: string;
  countryCode: ECountryCode; // CA | US
}>;

export type SimpleCompany = Readonly<{
  id: string;
  name: string;
  logo: string;
  countryCode: ECountryCode;
}>;

/**
 * Resolve a company's display assets from its id.
 * Falls back to a default logo and CA country if unknown.
 */
export function resolveCompanyMeta(companyId?: string): CompanyMeta {
  if (!companyId) {
    return {
      id: undefined,
      label: "—",
      logoSrc: "/assets/logos/CompanyDefault.png",
      countryCode: ECountryCode.CA,
    };
  }

  const c = getCompanyById(companyId);
  if (c) {
    return {
      id: c.id,
      label: c.name,
      logoSrc: c.logo,
      countryCode: c.countryCode,
    };
  }

  // Fallback for unknown ids: default logo + light guess on country
  const normalized = companyId.toLowerCase();
  const fallbackCode = normalized.includes("-us")
    ? ECountryCode.US
    : ECountryCode.CA;

  return {
    id: companyId,
    label: companyId,
    logoSrc: "/assets/logos/CompanyDefault.png",
    countryCode: fallbackCode,
  };
}

/** Map country code → rectangle flag asset path (as provided in /public). */
export function flagSrcFor(code: ECountryCode): string {
  return code === ECountryCode.US
    ? "/assets/logos/rectangleAmericanFlag.png"
    : "/assets/logos/rectangleCanadianFlag.png";
}

/**
 * List companies filtered by country.
 * Contract header uses this to build the "Company" dropdown options,
 * respecting the rule: show only companies from the driver's current country.
 */
export function listCompaniesByCountry(code: ECountryCode): SimpleCompany[] {
  // If COMPANIES shape differs, adapt the mapping here.
  return (COMPANIES as any[])
    .filter((c) => c?.countryCode === code)
    .map((c) => ({
      id: c.id as string,
      name: c.name as string,
      logo: c.logo as string,
      countryCode: c.countryCode as ECountryCode,
    }));
}

/** Only Canadian companies are editable (US is read-only). */
export function canEditCompany(companyId?: string): boolean {
  const meta = resolveCompanyMeta(companyId);
  return meta.countryCode === ECountryCode.CA;
}

/** Safe string compare for company ids. */
export function isSameCompany(a?: string, b?: string): boolean {
  return (a ?? "") === (b ?? "");
}
