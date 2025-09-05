import type { ILicenseEntry, IFastCard } from "@/types/applicationForm.types";
import type { IPhoto } from "@/types/shared.types";
import type { IOnboardingTrackerContext } from "@/types/onboardingTracker.types";

export interface IdentificationsResponse {
  success: boolean;
  message: string;
  data: {
    onboardingContext: IOnboardingTrackerContext;
    licenses: ILicenseEntry[];
    employeeNumber?: string;
    hstNumber?: string;
    businessNumber?: string;
    incorporatePhotos?: IPhoto[];
    hstPhotos?: IPhoto[];
    bankingInfoPhotos?: IPhoto[];
    healthCardPhotos?: IPhoto[];
    medicalCertificationPhotos?: IPhoto[];
    passportPhotos?: IPhoto[];
    prPermitCitizenshipPhotos?: IPhoto[];
    usVisaPhotos?: IPhoto[];
    fastCard?: IFastCard;
  };
}

export type IdentificationsData = IdentificationsResponse["data"];

// Helper types for the frontend
export interface ImageGalleryItem {
  id: string;
  title: string;
  photos: IPhoto[];
  type: 'license' | 'fastCard' | 'incorporate' | 'hst' | 'banking' | 'healthCard' | 'medical' | 'passport' | 'prPermit' | 'usVisa';
  hasFrontBack: boolean;
}
