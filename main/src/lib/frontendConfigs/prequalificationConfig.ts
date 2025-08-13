/**
 * ===============================================================
 * prequalificationConfig.ts
 * ---------------------------------------------------------------
 * Purpose:
 *   Config for the [id]/prequalifications page (PATCH flow).
 *   - Validates required fields
 *   - Converts RHF string values to typed IPreQualifications
 *   - Provides a fallback next route (uses nextUrl from backend if available)
 * Notes:
 *   - NOT used on initial /onboarding/prequalifications (no submit there).
 *   - Page 1 will use a separate page1Config (POST prequal + page1).
 * ===============================================================
 */

import {
  EDriverType,
  EHaulPreference,
  ETeamStatus,
  IPreQualifications,
} from "@/types/preQualifications.types";

export type PrequalFormValues = Record<string, string>;

export const prequalificationConfig = {
  validationFields: (values: PrequalFormValues): string[] =>
    Object.keys(values),

  validateBusinessRules: (_values: PrequalFormValues): string | null => null,

  buildPayload: (values: PrequalFormValues): IPreQualifications => {
    const payload: IPreQualifications = {
      over23Local: values.over23Local === "form.yes",
      over25CrossBorder: values.over25CrossBorder === "form.yes",
      canDriveManual: values.canDriveManual === "form.yes",
      experienceDrivingTractorTrailer:
        values.experienceDrivingTractorTrailer === "form.yes",
      faultAccidentIn3Years: values.faultAccidentIn3Years === "form.yes",
      zeroPointsOnAbstract: values.zeroPointsOnAbstract === "form.yes",
      noUnpardonedCriminalRecord:
        values.noUnpardonedCriminalRecord === "form.yes",
      legalRightToWorkCanada: values.legalRightToWorkCanada === "form.yes",
      driverType: values.driverType as EDriverType,
      haulPreference: values.haulPreference as EHaulPreference,
      teamStatus: values.teamStatus as ETeamStatus,
      preferLocalDriving: values.preferLocalDriving === "form.yes",
      preferSwitching: values.preferSwitching === "form.yes",
      flatbedExperience: values.flatbedExperience === "form.yes",
      completed: true,
    };

    if (values.canCrossBorderUSA !== undefined) {
      payload.canCrossBorderUSA = values.canCrossBorderUSA === "form.yes";
    }
    if (values.hasFASTCard !== undefined) {
      payload.hasFASTCard = values.hasFASTCard === "form.yes";
    }

    return payload;
  },

  nextRoute: "/onboarding/[id]/application-form/page-1",
  submitSegment: "prequalifications",
};
