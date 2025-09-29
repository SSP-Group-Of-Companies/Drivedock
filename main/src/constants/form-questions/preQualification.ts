/**
 * ===============================================================
 * DriveDock — Pre-Qualification Question Definitions (Step 1)
 * ---------------------------------------------------------------
 * Purpose
 *  - Single source of truth for the Pre-Qualification step’s question
 *    metadata used by the frontend UI (and aligned with backend types).
 *  - Prevents hardcoded strings and keeps i18n + enums consistent.
 *
 * What’s in here
 *  - `YesNoOptions`: Reusable Yes/No options (scoped i18n keys).
 *  - `preQualificationQuestions`: Boolean/eligibility questions.
 *  - `categoryQuestions`: Enum-backed category/preference questions.
 *
 * Conventions
 *  - `label` and each option’s `labelKey` are i18n keys.
 *  - `value` is the actual submitted value:
 *      • For booleans: "form.yes" | "form.no"
 *      • For categories: enum values (EDriverType / EHaulPreference / ETeamStatus)
 *  - `name` MUST exactly match keys in IPreQualifications.
 *
 * i18n
 *  - All labels live under "form.step1.questions.*".
 *  - UI components should call `t(label)` and `t(option.labelKey)`.
 *
 * Safety
 *  - Do not edit values to “look nicer” in the UI; that’s what i18n is for.
 *  - If you add a new field in IPreQualifications, add its question config here
 *    and update locale files.
 * ===============================================================
 */

import {
  EDriverType,
  EHaulPreference,
  ETeamStatus,
  EStatusInCanada,
} from "@/types/preQualifications.types";

/**
 * Reusable Yes/No options for boolean questions.
 * These use i18n keys scoped to step 1 questions.
 * - `labelKey`: translation key for the UI label
 * - `value`: the stored/submitted value ("form.yes" or "form.no")
 */
export const YesNoOptions = [
  { labelKey: "form.step1.questions.yes", value: "form.yes" },
  { labelKey: "form.step1.questions.no", value: "form.no" },
];

/**
 * ---------------------------------------------------------------
 * Eligibility Questions (Step 1 - Pre-Qualifications)
 * ---------------------------------------------------------------
 * All `name` keys must exactly match `IPreQualifications` fields.
 * All boolean fields use Yes/No options unless restricted to "Yes" only.
 * NOTE:
 *  - Some questions intentionally allow only “Yes” to continue (business rule).
 *  - Canada/US visibility logic happens at the page level (not here).
 */
export const preQualificationQuestions = [
  {
    // Must be 23+ for local driving
    name: "over23Local",
    label: "form.step1.questions.over23Local",
    options: [{ labelKey: "form.step1.questions.yes", value: "form.yes" }],
  },
  {
    // Must be 25+ for cross-border
    name: "over25CrossBorder",
    label: "form.step1.questions.over25CrossBorder",
    options: [{ labelKey: "form.step1.questions.yes", value: "form.yes" }],
  },
  {
    // Manual transmission capability
    name: "canDriveManual",
    label: "form.step1.questions.canDriveManual",
    options: YesNoOptions,
  },
  {
    // Minimum tractor-trailer experience requirement
    name: "experienceDrivingTractorTrailer",
    label: "form.step1.questions.experienceDrivingTractorTrailer",
    options: [{ labelKey: "form.step1.questions.yes", value: "form.yes" }],
  },
  {
    // Any at-fault accident in the last 3 years
    name: "faultAccidentIn3Years",
    label: "form.step1.questions.faultAccidentIn3Years",
    options: YesNoOptions,
  },
  {
    // Driver abstract points must be zero
    name: "zeroPointsOnAbstract",
    label: "form.step1.questions.zeroPointsOnAbstract",
    options: YesNoOptions,
  },
  {
    // No unpardoned criminal record
    name: "noUnpardonedCriminalRecord",
    label: "form.step1.questions.noUnpardonedCriminalRecord",
    options: YesNoOptions,
  },
  {
    // Legal work eligibility in Canada
    name: "legalRightToWorkCanada",
    label: "form.step1.questions.legalRightToWorkCanada",
    options: [{ labelKey: "form.step1.questions.yes", value: "form.yes" }],
  },
  {
    // Status in Canada (Canada-only field)
    name: "statusInCanada",
    label: "form.step1.questions.statusInCanada",
    options: [
      { labelKey: "form.step1.questions.pr", value: EStatusInCanada.PR },
      { labelKey: "form.step1.questions.citizenship", value: EStatusInCanada.Citizenship },
      { labelKey: "form.step1.questions.workPermit", value: EStatusInCanada.WorkPermit },
    ],
  }, // Canada only
  {
    // Border-crossing eligibility into the USA (Canada-only field)
    name: "canCrossBorderUSA",
    label: "form.step1.questions.canCrossBorderUSA",
    options: YesNoOptions,
  }, // Canada only
  {
    // FAST card possession (Canada-only field)
    name: "hasFASTCard",
    label: "form.step1.questions.hasFASTCard",
    options: YesNoOptions,
  }, // Canada only
  {
    // Eligible for FAST card (Canada-only field, conditional)
    name: "eligibleForFASTCard",
    label: "form.step1.questions.eligibleForFASTCard",
    options: YesNoOptions,
  }, // Canada only, conditional
];

/**
 * ---------------------------------------------------------------
 * Category & Preference Questions
 * ---------------------------------------------------------------
 * Enums are used directly from `preQualifications.types.ts`
 * to prevent mismatches in spelling or values.
 *
 * Options:
 *  - Use `{ labelKey, value }`
 *  - `labelKey` → i18n key for UI display
 *  - `value` → enum (EDriverType, EHaulPreference, ETeamStatus)
 */
export const categoryQuestions = [
  {
    // Employment relationship / driver type
    name: "driverType",
    label: "form.step1.questions.driverType",
    options: [
      { labelKey: "form.step1.questions.company", value: EDriverType.Company },
      {
        labelKey: "form.step1.questions.owneroperator",
        value: EDriverType.OwnerOperator,
      },
      {
        labelKey: "form.step1.questions.ownerdriver",
        value: EDriverType.OwnerDriver,
      },
    ],
  },
  {
    // Trip length preference
    name: "haulPreference",
    label: "form.step1.questions.haulPreference",
    options: [
      {
        labelKey: "form.step1.questions.shorthaul",
        value: EHaulPreference.ShortHaul,
      },
      {
        labelKey: "form.step1.questions.longhaul",
        value: EHaulPreference.LongHaul,
      },
    ],
  },
  {
    // Solo vs team driving
    name: "teamStatus",
    label: "form.step1.questions.teamStatus",
    options: [
      { labelKey: "form.step1.questions.team", value: ETeamStatus.Team },
      { labelKey: "form.step1.questions.single", value: ETeamStatus.Single },
    ],
  },
  {
    // Prefers local deliveries
    name: "preferLocalDriving",
    label: "form.step1.questions.preferLocalDriving",
    options: YesNoOptions,
  },
  {
    // Prefers trailer switching (drop & hook)
    name: "preferSwitching",
    label: "form.step1.questions.preferSwitching",
    options: YesNoOptions,
  },
  {
    // Prior flatbed experience (drives popup + step logic)
    name: "flatbedExperience",
    label: "form.step1.questions.flatbedExperience",
    options: YesNoOptions,
  },
];
