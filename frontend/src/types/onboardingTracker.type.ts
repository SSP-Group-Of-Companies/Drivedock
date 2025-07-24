import { Document, ObjectId } from "mongoose";

export interface IOnboardingTracker {
    sin: string;
    resumeExpiresAt: Date;
  
    status: {
      currentStep: number;           // e.g., 1 to 7
      currentPage: number;           // page number within current step
      stepsCompleted: number[];      // list of completed steps (e.g., [1, 2, 3, 4])
      completed: boolean;            // whether application is fully completed
    };
  
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

  export interface IOnboardingTrackerDoc extends IOnboardingTracker, Document {};