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
  completionDate?: Date;
  completionLocation?: {
    country?: string;
    region?: string; // State/Province
    city?: string;
    timezone?: string;
    ip?: string;
  };
}

/**
 * Enum for termination type
 */
export enum ETerminationType {
  RESIGNED = "resigned",
  TERMINATED = "terminated",
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

  // termination
  terminated: boolean;
  terminationType?: ETerminationType;
  terminationDate?: Date;

  notes?: string;

  createdAt: Date;
  updatedAt: Date;
}

export interface IOnboardingTrackerDoc extends IOnboardingTracker, Document {
  sin?: string;
}

/**
 * Public-facing tracker context
 * - Reuses fields from IOnboardingTracker to avoid duplication.
 * - `id` is provided by Mongoose docs (stringified _id), so it remains explicit here.
 * - `notes` is exposed optionally to keep the public surface minimal by default.
 */
type TrackerContextBase = Pick<IOnboardingTracker, "companyId" | "applicationType" | "needsFlatbedTraining" | "status">;

export interface IOnboardingTrackerContext extends TrackerContextBase {
  id: string;
  notes?: IOnboardingTracker["notes"];
  prevStep: EStepPath | null;
  nextStep: EStepPath | null;
  itemSummary?: {
    driverName?: string;
    driverEmail?: string;
  };
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
