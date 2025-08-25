/**
 * ===============================================================
 * DriveDock - Onboarding Tracker Types (Revised)
 * ===============================================================
 */

import { Document, ObjectId } from "mongoose";
import { IApplicationFormPage1 } from "./applicationForm.types";
import { IPreQualifications } from "./preQualifications.types";
import { ECompanyApplicationType } from "@/constants/companies";
import { ECompanyId } from "@/constants/companies";

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
  DRIVE_TEST = "drive-test",
  CARRIERS_EDGE_TRAINING = "carriers-edge-training",
  DRUG_TEST = "drug-test",
  FLATBED_TRAINING = "flatbed-training",
}

/**
 * Tracks the driver's onboarding status.
 * - currentStep: the FURTHEST step reached (monotonic, used for gating/progress)
 * - lastVisitedStep: the LAST page visited (UX resume only; can move backward)
 * - completed: derived from currentStep being the last step
 */
export interface IOnboardingStatus {
  currentStep: EStepPath;
  completed: boolean;
}

/**
 * Main document representing the entire onboarding session for a driver.
 */
export interface IOnboardingTracker {
  sinHash: string;
  sinEncrypted: string;
  sin?: string;

  resumeExpiresAt: Date;
  applicationType?: ECompanyApplicationType;

  status: IOnboardingStatus;

  companyId: string;

  forms: {
    preQualification?: ObjectId;
    driverApplication?: ObjectId;
    policiesConsents?: ObjectId;
    carriersEdgeTraining?: ObjectId;
    driveTest?: ObjectId;
    drugTest?: ObjectId;
    flatbedTraining?: ObjectId;
  };

  needsFlatbedTraining: boolean;

  terminated: boolean;

  createdAt: Date;
  updatedAt: Date;
}

export interface IOnboardingTrackerDoc extends IOnboardingTracker, Document {
  sin?: string;
}

/**
 * Public-facing (unchanged) tracker context
 */
export interface IOnboardingTrackerContext {
  id: string;
  companyId: string;
  applicationType?: ECompanyApplicationType;
  needsFlatbedTraining: boolean;
  status: IOnboardingStatus;
  prevStep: EStepPath | null;
  nextStep: EStepPath | null;
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
