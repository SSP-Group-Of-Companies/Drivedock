/**
 * Audit log action presentation
 * -----------------------------
 * Maps the raw EOnboardingAuditAction enum to short, human-readable labels for
 * use in the dashboard UI (filters, badges, list rows).
 */

import { EOnboardingAuditAction } from "@/types/onboardingAuditLog.types";

export type AuditLogActionOption = Readonly<{
  value: EOnboardingAuditAction;
  label: string;
}>;

export const AUDIT_LOG_ACTION_LABELS: Readonly<
  Record<EOnboardingAuditAction, string>
> = {
  [EOnboardingAuditAction.ONBOARDING_APPLICATION_SUBMITTED]:
    "Application submitted",
  [EOnboardingAuditAction.INVITATION_APPROVED]: "Invitation approved",
  [EOnboardingAuditAction.INVITATION_REJECTED]: "Invitation rejected",
  [EOnboardingAuditAction.ONBOARDING_TERMINATED]: "Onboarding terminated",
  [EOnboardingAuditAction.ONBOARDING_RESTORED]: "Onboarding restored",
  [EOnboardingAuditAction.ONBOARDING_PERMANENTLY_DELETED]:
    "Permanently deleted",
  [EOnboardingAuditAction.COMPANY_CHANGED]: "Company changed",
  [EOnboardingAuditAction.SAFETY_PROCESSING_UPDATED]:
    "Safety processing updated",
  [EOnboardingAuditAction.PREQUALIFICATIONS_UPDATED]:
    "Prequalifications updated",
  [EOnboardingAuditAction.POLICIES_CONSENTS_UPDATED]:
    "Policies & consents signed",
  [EOnboardingAuditAction.PERSONAL_DETAILS_UPDATED]: "Personal details updated",
  [EOnboardingAuditAction.EMPLOYMENT_HISTORY_UPDATED]:
    "Employment history updated",
  [EOnboardingAuditAction.ACCIDENT_CRIMINAL_UPDATED]:
    "Accidents & criminal updated",
  [EOnboardingAuditAction.IDENTIFICATIONS_UPDATED]: "Identifications updated",
  [EOnboardingAuditAction.EXTRAS_UPDATED]: "Extras updated",
  [EOnboardingAuditAction.APPLICATION_FORM_PAGE_UPDATED]:
    "Application form updated",
  [EOnboardingAuditAction.DRUG_TEST_UPDATED]: "Drug test updated",
  [EOnboardingAuditAction.FLATBED_TRAINING_UPDATED]: "Flatbed training updated",
  [EOnboardingAuditAction.PRE_TRIP_ASSESSMENT_SAVED]:
    "Pre-trip assessment saved",
  [EOnboardingAuditAction.ON_ROAD_ASSESSMENT_SAVED]: "On-road assessment saved",
  [EOnboardingAuditAction.COMPLETION_PDFS_EMAIL_SENT]:
    "Completion PDFs emailed",
  [EOnboardingAuditAction.DATA_UPDATED]: "Data updated",
};

export function getAuditLogActionLabel(
  action: EOnboardingAuditAction | string,
): string {
  return (
    AUDIT_LOG_ACTION_LABELS[action as EOnboardingAuditAction] ?? String(action)
  );
}

/** Options sorted alphabetically by label for select boxes. */
export const AUDIT_LOG_ACTION_OPTIONS: readonly AuditLogActionOption[] = (
  Object.values(EOnboardingAuditAction) as EOnboardingAuditAction[]
)
  .map((value) => ({ value, label: AUDIT_LOG_ACTION_LABELS[value] }))
  .sort((a, b) => a.label.localeCompare(b.label));
