import type { ILicenseEntry, IFastCard, ITruckDetails } from "@/types/applicationForm.types";
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
