import { Document, ObjectId } from "mongoose";

export enum EApplicationType {
  FLAT_BED = "FLAT_BED",
  DRY_VAN = "DRY_VAN",
}

export interface IOnboardingStatus {
  currentStep: EStepPath;
  completedStep: EStepPath;
  completed: boolean;
}

export interface IOnboardingTracker {
  // Encrypted and hashed SIN
  sinHash: string;
  sinEncrypted: string;

  // Derived virtual field (not stored in DB)
  sin?: string;

  resumeExpiresAt: Date;

  applicationType?: EApplicationType; // only applicable to ssp-canada

  status: IOnboardingStatus;

  // Selected company (e.g., 'ssp-ca', 'fellowstrans')
  companyId: string;

  forms: {
    preQualification?: ObjectId;
    driverApplication?: ObjectId;
    policiesConsents?: ObjectId;
    carrierEdge?: ObjectId;
    driveTest?: ObjectId;
    drugTest?: ObjectId;
    flatbedTraining?: ObjectId;
  };

  createdAt: Date;
  updatedAt: Date;
}

// Extends Mongoose's Document
export interface IOnboardingTrackerDoc extends IOnboardingTracker, Document {
  // Virtual getter
  sin?: string;
}

// onboarding steps path
export enum EStepPath {
  PRE_QUALIFICATIONS = "prequalifications",
  APPLICATION_PAGE_1 = "application-form/page-1",
  APPLICATION_PAGE_2 = "application-form/page-2",
  APPLICATION_PAGE_3 = "application-form/page-3",
  APPLICATION_PAGE_4 = "application-form/page-4",
  APPLICATION_PAGE_5 = "application-form/page-5",
  POLICIES_CONSENTS = "policies-consents",
}

// tracker context (public-facing)
export interface ITrackerContext {
  id: string; // tracker.id
  companyId: string;
  applicationType?: EApplicationType;
  status: {
    currentStep: EStepPath;
    completedStep: EStepPath;
    completed: boolean;
  };
  prevUrl: string | null;
  nextUrl: string | null;
}
