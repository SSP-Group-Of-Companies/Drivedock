// Prequalifications API Response Types
// This file contains types specific to the prequalifications endpoint

export interface PrequalificationsResponse {
  success: boolean;
  message: string;
  data: {
    onboardingContext: any;
    preQualifications: {
      over23Local: boolean;
      over25CrossBorder: boolean;
      canDriveManual: boolean;
      experienceDrivingTractorTrailer: boolean;
      faultAccidentIn3Years: boolean;
      zeroPointsOnAbstract: boolean;
      noUnpardonedCriminalRecord: boolean;
      legalRightToWorkCanada: boolean;
      canCrossBorderUSA?: boolean;
      hasFASTCard?: boolean;
      statusInCanada?: string;
      eligibleForFASTCard?: boolean;
      driverType: string;
      haulPreference: string;
      teamStatus: string;
      flatbedExperience: boolean;
      completed: boolean;
    };
  };
}
