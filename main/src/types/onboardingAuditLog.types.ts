import type { Types } from "mongoose";

/** Who performed an action in the audit log. */
export enum EOnboardingAuditActorType {
  ADMIN = "ADMIN",
  DRIVER = "DRIVER",
  SYSTEM = "SYSTEM",
}

/**
 * High-signal actions. Prefer a specific value when it exists; otherwise use
 * `DATA_UPDATED` with structured `metadata`.
 */
export enum EOnboardingAuditAction {
  ONBOARDING_APPLICATION_SUBMITTED = "ONBOARDING_APPLICATION_SUBMITTED",
  INVITATION_APPROVED = "INVITATION_APPROVED",
  INVITATION_REJECTED = "INVITATION_REJECTED",
  ONBOARDING_TERMINATED = "ONBOARDING_TERMINATED",
  ONBOARDING_RESTORED = "ONBOARDING_RESTORED",
  ONBOARDING_PERMANENTLY_DELETED = "ONBOARDING_PERMANENTLY_DELETED",
  COMPANY_CHANGED = "COMPANY_CHANGED",
  SAFETY_PROCESSING_UPDATED = "SAFETY_PROCESSING_UPDATED",
  PREQUALIFICATIONS_UPDATED = "PREQUALIFICATIONS_UPDATED",
  POLICIES_CONSENTS_UPDATED = "POLICIES_CONSENTS_UPDATED",
  PERSONAL_DETAILS_UPDATED = "PERSONAL_DETAILS_UPDATED",
  EMPLOYMENT_HISTORY_UPDATED = "EMPLOYMENT_HISTORY_UPDATED",
  ACCIDENT_CRIMINAL_UPDATED = "ACCIDENT_CRIMINAL_UPDATED",
  IDENTIFICATIONS_UPDATED = "IDENTIFICATIONS_UPDATED",
  EXTRAS_UPDATED = "EXTRAS_UPDATED",
  APPLICATION_FORM_PAGE_UPDATED = "APPLICATION_FORM_PAGE_UPDATED",
  DRUG_TEST_UPDATED = "DRUG_TEST_UPDATED",
  FLATBED_TRAINING_UPDATED = "FLATBED_TRAINING_UPDATED",
  PRE_TRIP_ASSESSMENT_SAVED = "PRE_TRIP_ASSESSMENT_SAVED",
  ON_ROAD_ASSESSMENT_SAVED = "ON_ROAD_ASSESSMENT_SAVED",
  /** Completion PDFs email successfully sent to the driver (system-triggered). */
  COMPLETION_PDFS_EMAIL_SENT = "COMPLETION_PDFS_EMAIL_SENT",
  DATA_UPDATED = "DATA_UPDATED",
}

/**
 * Denormalized onboarding context stored on each log row so history stays useful
 * after the onboarding tracker or related docs are removed.
 */
export type TOnboardingAuditSnapshot = {
  driverName?: string;
  driverEmail?: string;
  companyId?: string;
  companyName?: string;
};

export type TOnboardingAuditActor = {
  type: EOnboardingAuditActorType;
  id?: string;
  name: string;
  email: string;
};

export interface IOnboardingAuditLogDoc {
  _id: Types.ObjectId;
  onboardingId: Types.ObjectId;
  action: EOnboardingAuditAction;
  actor: TOnboardingAuditActor;
  message: string;
  metadata?: Record<string, unknown>;
  /** Snapshot at write time; preserved when onboarding is deleted. */
  driverName?: string;
  driverEmail?: string;
  companyId?: string;
  companyName?: string;
  createdAt: Date;
}

/** API / client shape */
export type TOnboardingAuditLogDTO = {
  id: string;
  onboardingId: string;
  action: EOnboardingAuditAction;
  actor: TOnboardingAuditActor;
  message: string;
  metadata?: Record<string, unknown>;
  driverName?: string;
  driverEmail?: string;
  companyId?: string;
  companyName?: string;
  createdAt: string;
  /**
   * Whether the onboarding tracker referenced by `onboardingId` still exists.
   * Used by the global audit log UI to avoid linking to detail pages for
   * onboardings that have since been permanently deleted.
   */
  onboardingExists?: boolean;
};
