/**
 * Filters config (enum-driven)
 * ----------------------------
 * Company options are derived from COMPANIES.
 * Application types remain as-is unless you expose an enum for them too.
 */

import { COMPANIES, ECompanyApplicationType } from "@/constants/companies";

export type FilterOption = Readonly<{ value: string; label: string }>;

// Company options from source of truth
export const COMPANY_OPTIONS: readonly FilterOption[] = COMPANIES.map((c) => ({
  value: c.id,
  label: c.name,
}));

const APP_TYPE_LABEL: Record<ECompanyApplicationType, string> = {
  [ECompanyApplicationType.DRY_VAN]: "Dry Van",
  [ECompanyApplicationType.FLATBED]: "Flatbed",
};

export const APPLICATION_TYPE_OPTIONS: readonly FilterOption[] = (
  Object.values(ECompanyApplicationType) as ECompanyApplicationType[]
).map((val) => ({
  value: val, // exactly what backend expects: "DRY_VAN" | "FLAT_BED"
  label: APP_TYPE_LABEL[val],
}));
