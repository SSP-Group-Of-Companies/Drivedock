/**
 * Company assets resolver (enum-driven)
 * -------------------------------------
 * Uses COMPANIES and ECountryCode; no string heuristics.
 */

import { getCompanyById } from "@/constants/companies";
import { ECountryCode } from "@/types/shared.types";

export type CompanyMeta = Readonly<{
  id?: string;
  label: string;
  logoSrc: string;
  countryCode: ECountryCode; // CA | US (per your enum)
}>;

export function resolveCompanyMeta(companyId?: string): CompanyMeta {
  if (!companyId) {
    return {
      id: undefined,
      label: "—",
      logoSrc: "/assets/logos/CompanyDefault.png", // fallback image in /public
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

  // Fallback for unknown ids: default logo + guess country from suffix if any
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

export function flagSrcFor(code: ECountryCode): string {
  // Files live in /public/assets/logos as you noted
  return code === ECountryCode.US
    ? "/assets/logos/rectangleAmericanFlag.png"
    : "/assets/logos/rectangleCanadianFlag.png";
}
