import type { ILicenseEntry, IFastCard, ITruckDetails, EPassportType, EWorkAuthorizationType } from "@/types/applicationForm.types";
import type { IFileAsset } from "@/types/shared.types";
import type { IOnboardingTrackerContext } from "@/types/onboardingTracker.types";

export interface IdentificationsResponse {
  success: boolean;
  message: string;
  data: {
    onboardingContext: IOnboardingTrackerContext;
    licenses: ILicenseEntry[];
    hstNumber?: string;
    businessName?: string;
    incorporatePhotos?: IFileAsset[];
    hstPhotos?: IFileAsset[];
    bankingInfoPhotos?: IFileAsset[];
    healthCardPhotos?: IFileAsset[];
    medicalCertificationPhotos?: IFileAsset[];
    
    // Passport type selection (Canadian companies only)
    passportType?: EPassportType;
    workAuthorizationType?: EWorkAuthorizationType;
    
    passportPhotos?: IFileAsset[];
    prPermitCitizenshipPhotos?: IFileAsset[];
    usVisaPhotos?: IFileAsset[];
    fastCard?: IFastCard;
    truckDetails?: ITruckDetails;
  };
}

export type IdentificationsData = IdentificationsResponse["data"];

// Helper types for the frontend
export interface ImageGalleryItem {
  id: string;
  title: string;
  photos: IFileAsset[];
  type: "license" | "fastCard" | "incorporate" | "hst" | "banking" | "healthCard" | "medical" | "passport" | "prPermit" | "usVisa";
  hasFrontBack: boolean;
}
