import { Document } from "mongoose";

// Page 1 structure from scanned form
export interface IApplicationFormPage1 {
  // Personal
  firstName: string;
  lastName: string;
  sin?: string;
  sinEncrypted: string;
  dob: string; // Format: YYYY-MM-DD
  phoneHome: string;
  phoneCell: string;
  canProvideProofOfAge: boolean;
  email: string;
  emergencyContactName: string;
  emergencyContactPhone: string;

  // Place of Birth
  birthCity: string;
  birthCountry: string;
  birthStateOrProvince: string;

  // License
  currentLicense: {
    licenseNumber: string;
    licenseStateOrProvince: string;
    licenseType: string;
    licenseExpiry: string; // Format: YYYY-MM-DD
  };
  previousLicenses: Array<{
    licenseNumber: string;
    licenseStateOrProvince: string;
    licenseType: string;
    licenseExpiry: string; // Format: YYYY-MM-DD
  }>;

  // Address (Current & Previous)
  addresses: Array<{
    address: string;
    city: string;
    stateOrProvince: string;
    postalCode: string;
    from: string; // Format: YYYY-MM-DD
    to: string;   // Format: YYYY-MM-DD
  }>;
}

// Placeholder structure for the other 11 pages (to be filled later)
export interface IApplicationForm {
  currentStep: number;
  completedStep: number;
  completed: boolean;

  page1: IApplicationFormPage1;
  page2: Record<string, string>;
  page3: Record<string, string>;
  page4: Record<string, string>;
  page5: Record<string, string>;
  page6: Record<string, string>;
  page7: Record<string, string>;
  page8: Record<string, string>;
  page9: Record<string, string>;
  page10: Record<string, string>;
  page11: Record<string, string>;
  page12: Record<string, string>;

  createdAt: Date;
  updatedAt: Date;
}

export interface IApplicationFormDoc extends IApplicationForm, Document {}
