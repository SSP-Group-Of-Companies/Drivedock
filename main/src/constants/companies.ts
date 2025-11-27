// src/constants/companies.ts
import { ECountryCode } from "@/types/shared.types";

/** Application types live with companies to avoid scattered sources of truth */
export enum ECompanyApplicationType {
  FLATBED = "FLAT_BED",
  DRY_VAN = "DRY_VAN",
}

export enum ECompanyId {
  SSP_CA = "ssp-ca",
  SSP_US = "ssp-us",
  FELLOW_TRANS = "fellowtrans",
  WEB_FREIGHT = "webfreight",
  NESH = "nesh",
}

export type CanadianCompanyId = ECompanyId.SSP_CA | ECompanyId.FELLOW_TRANS | ECompanyId.NESH | ECompanyId.WEB_FREIGHT;

export interface Company {
  id: string;
  name: string;
  logo: string;
  country: string;
  countryCode: ECountryCode;
  countryBadgeColor: string;
  location: string;
  operations: string;
  buttonColor: string;
  buttonTextColor: string;
  buttonGradient: string; // new
  hasFlatbed: boolean;
  hasDryVan: boolean;
}

export const COMPANIES: Company[] = [
  {
    id: ECompanyId.SSP_CA,
    name: "SSP Truckline Inc",
    logo: "/assets/logos/SSP-Truck-LineFullLogo.png",
    country: "Canada",
    countryCode: ECountryCode.CA,
    countryBadgeColor: "bg-green-100 text-green-700",
    location: "8175 LAWSON ROAD MILTON, ON L9T 5E5",
    operations: "Canada Operations",
    buttonColor: "", // not used
    buttonTextColor: "text-white",
    buttonGradient: "bg-gradient-to-r from-blue-700 via-blue-500 to-blue-400",
    hasFlatbed: true,
    hasDryVan: true,
  },
  {
    id: ECompanyId.SSP_US,
    name: "SSP Trucklines Inc",
    logo: "/assets/logos/SSP-Truck-LineFullLogo.png",
    country: "USA",
    countryCode: ECountryCode.US,
    countryBadgeColor: "bg-blue-100 text-blue-700",
    location: "9505 FM 1472 LAREDO, TX 78045",
    operations: "United States Operations",
    buttonColor: "",
    buttonTextColor: "text-white",
    buttonGradient: "bg-gradient-to-r from-blue-800 via-blue-600 to-blue-400",
    hasFlatbed: true,
    hasDryVan: true,
  },
  {
    id: ECompanyId.FELLOW_TRANS,
    name: "FellowsTrans Inc",
    logo: "/assets/logos/FellowLogo.png",
    country: "Canada",
    countryCode: ECountryCode.CA,
    countryBadgeColor: "bg-green-100 text-green-700",
    location: "2-8175 LAWSON ROAD MILTON, ON L9T 5E5",
    operations: "Canada Operations",
    buttonColor: "",
    buttonTextColor: "text-white",
    buttonGradient: "bg-gradient-to-r from-red-600 via-red-500 to-pink-400",
    hasFlatbed: true,
    hasDryVan: false,
  },
  {
    id: ECompanyId.WEB_FREIGHT,
    name: "Web Freight Inc",
    logo: "/assets/logos/WebLogog.png",
    country: "Canada",
    countryCode: ECountryCode.CA,
    countryBadgeColor: "bg-green-100 text-green-700",
    location: "16 MEDITERRANEAN CRES BRAMPTON, ON L6Y 0T4",
    operations: "Canada Operations",
    buttonColor: "",
    buttonTextColor: "text-white",
    buttonGradient: "bg-gradient-to-r from-blue-500 via-cyan-400 to-blue-300",
    hasFlatbed: true,
    hasDryVan: false,
  },
  {
    id: ECompanyId.NESH,
    name: "New England Steel Haulers Inc",
    logo: "/assets/logos/NewEnglandLogo.png",
    country: "Canada",
    countryCode: ECountryCode.CA,
    countryBadgeColor: "bg-green-100 text-green-700",
    location: "876 CHALLINOR TERR MILTON, ON L9T 7V6",
    operations: "United States Operations",
    buttonColor: "",
    buttonTextColor: "text-white",
    buttonGradient: "bg-gradient-to-r from-purple-700 via-purple-500 to-pink-400",
    hasFlatbed: true,
    hasDryVan: false,
  },
];

export function getCompanyById(companyId: string): Company | undefined {
  return COMPANIES.find((company) => company.id === companyId);
}

export function isCanadianCompany(companyId: string): boolean {
  const company = getCompanyById(companyId);
  return company ? company.countryCode === ECountryCode.CA : false;
}

/**
 * Whether flatbed training is even *possible* for the given company/application type.
 * Ignores applicant experience.
 *
 * Rules:
 * - Company must operate flatbeds (`hasFlatbed`).
 * - If the company has dry van (`hasDryVan`) and the application type is DRY_VAN,
 *   flatbed training is not possible.
 * - Otherwise → possible.
 */
export function canHaveFlatbedTraining(companyId: string, applicationType?: ECompanyApplicationType): boolean {
  const company = getCompanyById(companyId);
  if (!company) return false;

  // must support flatbed at all
  if (!company.hasFlatbed) return false;

  // global rule: DRY_VAN application at a dry-van company → no flatbed training
  if (applicationType === ECompanyApplicationType.DRY_VAN && company.hasDryVan) {
    return false;
  }

  return true;
}

/**
 * Determine whether flatbed training is required.
 *
 * Rules:
 * 1. If applicant already has flatbed experience → no training needed.
 * 2. If flatbed training isn't even possible for this company/application → no training needed.
 * 3. Otherwise (possible + no experience) → training required.
 */
export function needsFlatbedTraining(
  companyId: string,
  applicationType?: ECompanyApplicationType, // optional now
  hasFlatbedExperience: boolean = false
): boolean {
  // Rule 1
  if (hasFlatbedExperience) return false;

  // Rule 2 (delegates shared logic to the helper above)
  if (!canHaveFlatbedTraining(companyId, applicationType)) return false;

  // Rule 3
  return true;
}
