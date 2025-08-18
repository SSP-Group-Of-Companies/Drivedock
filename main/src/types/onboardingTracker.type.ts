/**
 * ===============================================================
 * DriveDock - Onboarding Tracker Types
 * ---------------------------------------------------------------
 * Core shared types used to track and manage the driver's
 * onboarding progress, state, and metadata.
 *
 * Uses `ECompanyApplicationType` enum imported from
 * company selection to maintain a single source of truth.
 * ===============================================================
 */

import { Document, ObjectId } from "mongoose";
import { IApplicationFormPage1 } from "./applicationForm.types";
import { IPreQualifications } from "./preQualifications.types";
import { ECompanyApplicationType } from "@/hooks/frontendHooks/useCompanySelection"; // Adjust import path as needed
import { ECompanyId } from "@/constants/companies";

/**
 * Tracks the driver's current onboarding step status.
 */
export interface IOnboardingStatus {
  currentStep: EStepPath;
  completedStep: EStepPath;
  completed: boolean; // true if onboarding is fully completed
}

/**
 * Main document representing the entire onboarding session for a driver.
 */
export interface IOnboardingTracker {
  // Encrypted and hashed SIN for privacy and resume logic
  sinHash: string;
  sinEncrypted: string;

  // Virtual (not stored) plain SIN, for runtime usage only
  sin?: string;

  // Timestamp when resume link expires (usually 7-14 days after start)
  resumeExpiresAt: Date;

  // Application type for companies like SSP Canada (Flatbed or Dry Van)
  applicationType?: ECompanyApplicationType;

  // Current progress status
  status: IOnboardingStatus;

  // Company this onboarding belongs to (e.g., "ssp-ca", "fellowstrans")
  companyId: string;

  // References to stored form parts, for modular persistence
  forms: {
    preQualification?: ObjectId;
    driverApplication?: ObjectId;
    policiesConsents?: ObjectId;
    carrierEdge?: ObjectId;
    driveTest?: ObjectId;
    drugTest?: ObjectId;
    flatbedTraining?: ObjectId;
  };

  // Termination flag — used to hide from driver access
  terminated: boolean;

  createdAt: Date;
  updatedAt: Date;
}

/**
 * Mongoose Document interface extending the onboarding tracker model.
 */
export interface IOnboardingTrackerDoc extends IOnboardingTracker, Document {
  sin?: string; // virtual getter for plain SIN
}

/**
 * Enum of all valid onboarding step routes/paths.
 */
export enum EStepPath {
  PRE_QUALIFICATIONS = "prequalifications",
  APPLICATION_PAGE_1 = "application-form/page-1",
  APPLICATION_PAGE_2 = "application-form/page-2",
  APPLICATION_PAGE_3 = "application-form/page-3",
  APPLICATION_PAGE_4 = "application-form/page-4",
  APPLICATION_PAGE_5 = "application-form/page-5",
  POLICIES_CONSENTS = "policies-consents",
  DRIVING_TEST = "driving-test",
  CARRIER_EDGE = "carrier-edge",
}

/**
 * Public-facing tracker context sent to frontend for navigation & UI.
 */
export interface ITrackerContext {
  id: string; // Tracker DB document ID
  companyId: string;
  applicationType?: ECompanyApplicationType;
  status: {
    currentStep: EStepPath;
    completedStep: EStepPath;
    completed: boolean;
  };
  prevUrl: string | null;
  nextUrl: string | null;
}

/**
 * Payload required to create a new onboarding session.
 */
export interface ICreateOnboardingPayload {
  applicationFormPage1: IApplicationFormPage1;
  prequalifications: IPreQualifications;
  companyId: ECompanyId;
  applicationType?: ECompanyApplicationType;
}
