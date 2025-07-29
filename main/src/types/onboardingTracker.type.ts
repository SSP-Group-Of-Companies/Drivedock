import { Document, ObjectId } from "mongoose";

export interface IOnboardingTracker {
  // Encrypted and hashed SIN
  sinHash: string;
  sinEncrypted: string;

  // Derived virtual field (not stored in DB)
  sin?: string;

  resumeExpiresAt: Date;

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
    consents?: ObjectId;
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
