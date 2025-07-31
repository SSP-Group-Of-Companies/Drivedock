import { Document, ObjectId } from "mongoose";

export enum EApplicationType {
  FLAT_BED = "FLAT_BED",
  DRY_VAN = "DRY_VAN",
}

export interface IOnboardingTracker {
  // Encrypted and hashed SIN
  sinHash: string;
  sinEncrypted: string;

  // Derived virtual field (not stored in DB)
  sin?: string;

  resumeExpiresAt: Date;

  applicationType?: EApplicationType; // only applicable to ssp-canada

  status: {
    currentStep: number;
    completedStep: number;
    completed: boolean;
  };

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
