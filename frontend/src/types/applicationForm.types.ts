import { Document } from "mongoose";

// Page 1
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
    to: string; // Format: YYYY-MM-DD
  }>;
}

// Page 2
export interface IEmploymentEntry {
  employerName: string;
  supervisorName: string;
  address: string;
  postalCode: string;
  city: string;
  stateOrProvince: string;
  phone1: string;
  phone2?: string;
  email: string;
  positionHeld: string;
  from: string; // Format: YYYY-MM-DD
  to: string; // Format: YYYY-MM-DD
  salary: string;
  reasonForLeaving: string;
  subjectToFMCSR: boolean; // Yes/No
  safetySensitiveFunction: boolean; // Yes/No
}

export interface IApplicationFormPage2 {
  currentEmployment: IEmploymentEntry;
  previousEmployments: IEmploymentEntry[]; // Can add multiple
  employmentGapExplanation: string; // This is the single textbox
}

// Page 3
export interface IAccidentEntry {
  date: string; // Format: YYYY-MM-DD
  natureOfAccident: string; // e.g., "Rear end", "Head-On", etc.
  fatalities: number;
  injuries: number;
}

export interface ITrafficConvictionEntry {
  date: string; // Format: YYYY-MM-DD
  location: string;
  charge: string;
  penalty: string;
}

export interface IEducation {
  gradeSchool: number; // Years completed
  college: number; // Years completed
  postGraduate: number; // Years completed
}

export interface ICanadianDailyHours {
  day: number;
  hours: number;
}

export interface ICanadianHoursOfService {
  dayOneDate: string; // Format: YYYY-MM-DD
  dailyHours: ICanadianDailyHours[];
  totalHours?: number; // virtual
}

export interface IApplicationFormPage3 {
  accidentHistory: IAccidentEntry[];
  trafficConvictions: ITrafficConvictionEntry[];
  education: IEducation;
  canadianHoursOfService: ICanadianHoursOfService;
}

// Placeholder structure for the other 11 pages (to be filled later)
export interface IApplicationForm {
  currentStep: number;
  completedStep: number;
  completed: boolean;

  page1: IApplicationFormPage1;
  page2: IApplicationFormPage2;
  page3: IApplicationFormPage3;
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
