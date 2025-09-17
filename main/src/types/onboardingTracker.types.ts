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
}

/**
 * Enum for termination type
 */
export enum ETerminationType {
  RESIGNED = "resigned",
  TERMINATED = "terminated",
}

/**
 * Enum for email status*
 */
export enum EEmailStatus {
  NOT_SENT = "NOT_SENT",
  PENDING = "PENDING",
  SENDING = "SENDING",
  SENT = "SENT",
  ERROR = "ERROR",
}

/**
 * Main document representing the entire onboarding session for a driver.
 */
export interface IOnboardingTracker {
  id: string;
  sinHash: string;
  sinEncrypted: string;
  sin?: string;

  resumeExpiresAt: Date;
  applicationType?: ECompanyApplicationType;

  status: IOnboardingStatus;

  emails?: {
    completionPdfs?: {
      consentGiven?: boolean; // from policies form
      status: EEmailStatus;
      attempts: number;
      lastError?: string;
      sentAt?: Date;
    };
  };

  completionLocation?: {
    country?: string; // Full country name (e.g., "Canada", "United States")
    region?: string; // State/Province (e.g., "Ontario", "California")
    city?: string; // City name (e.g., "Milton", "Los Angeles")
    timezone?: string;
    latitude?: number; // GPS latitude
    longitude?: number; // GPS longitude
  };

  locationPermissionGranted?: boolean; // Tracks if user has granted location permission

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
  id: string;
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
  completionLocation?: IOnboardingTracker["completionLocation"];
  locationPermissionGranted?: IOnboardingTracker["locationPermissionGranted"];
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
