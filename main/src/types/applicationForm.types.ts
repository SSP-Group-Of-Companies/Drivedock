import { Document } from "mongoose";
import { ELicenseType, IPhoto } from "./shared.types";

// Page 1
export interface ILicenseEntry {
  licenseNumber: string;
  licenseStateOrProvince: string;
  licenseType: ELicenseType;
  licenseExpiry: string;
  licenseFrontPhoto: IPhoto;
  licenseBackPhoto: IPhoto;
}

export interface IApplicationFormPage1 {
  // Personal
  firstName: string;
  lastName: string;
  sin?: string;
  sinEncrypted: string;
  sinPhoto: IPhoto;
  dob: string | Date; // Format: YYYY-MM-DD
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

  // Licenses
  licenses: Array<ILicenseEntry>;

  // Address
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
  from: string | Date; // Format: YYYY-MM-DD
  to: string | Date; // Format: YYYY-MM-DD
  salary: string | Date;
  reasonForLeaving: string;
  subjectToFMCSR: boolean; // Yes/No
  safetySensitiveFunction: boolean; // Yes/No

  /**
   * Optional explanation for a gap in employment **before** this job.
   * Used if there is >1 month gap between the previous job's `to` and this job's `from`.
   */
  gapExplanationBefore?: string;
}

export interface IApplicationFormPage2 {
  employments: IEmploymentEntry[];
}

// Page 3
export interface IAccidentEntry {
  date: string | Date; // Format: YYYY-MM-DD
  natureOfAccident: string; // e.g., "Rear end", "Head-On", etc.
  fatalities: number;
  injuries: number;
}

export interface ITrafficConvictionEntry {
  date: string | Date; // Format: YYYY-MM-DD
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
  dayOneDate: string | Date; // Format: YYYY-MM-DD
  dailyHours: ICanadianDailyHours[];
  totalHours?: number; // virtual
}

export interface IApplicationFormPage3 {
  accidentHistory: IAccidentEntry[];
  trafficConvictions: ITrafficConvictionEntry[];
  education: IEducation;
  canadianHoursOfService: ICanadianHoursOfService;
}

// Page 4
export interface ICriminalRecordEntry {
  offense: string;
  dateOfSentence: string | Date; // Format: YYYY-MM-DD
  courtLocation: string;
}

export interface IFastCard {
  fastCardNumber: string;
  fastCardExpiry: string | Date;
  fastCardFrontPhoto?: IPhoto;
  fastCardBackPhoto?: IPhoto;
}

export interface IApplicationFormPage4 {
  // Criminal Record Table
  criminalRecords: ICriminalRecordEntry[];

  // Incorporate Details
  employeeNumber?: string;
  hstNumber?: string;
  businessNumber?: string;
  incorporatePhotos?: IPhoto[];
  hstPhotos?: IPhoto[];
  bankingInfoPhotos?: IPhoto[];

  // medical
  healthCardPhotos?: IPhoto[]; // for canadian applicants
  medicalCertificationPhotos?: IPhoto[]; // for US applicants

  passportPhotos?: IPhoto[]; // optional for american
  prPermitCitizenshipPhotos?: IPhoto[]; // optional for american
  usVisaPhotos?: IPhoto[]; // not needed for american
  fastCard?: IFastCard; // optional and only shows for canadian

  // Additional Info
  deniedLicenseOrPermit: boolean;
  suspendedOrRevoked: boolean;
  suspensionNotes?: string;

  testedPositiveOrRefused: boolean;
  completedDOTRequirements: boolean;
  hasAccidentalInsurance: boolean;
}

// page 5
export interface ICompetencyQuestionOption {
  id: string; // e.g., 1, 2, 3 etc.
  value: string; // e.g., "30 km/h"
}

export interface ICompetencyQuestion {
  questionId: string;
  questionText: string;
  options: ICompetencyQuestionOption[];
  correctAnswerId: string; // e.g., "a"
}

export interface ICompetencyAnswer {
  questionId: string;
  answerId: string;
}

export interface IApplicationFormPage5 {
  answers: ICompetencyAnswer[];
  score: number;
}

// Placeholder structure for the other 11 pages (to be filled later)
export interface IApplicationForm {
  page1: IApplicationFormPage1;
  page2: IApplicationFormPage2;
  page3: IApplicationFormPage3;
  page4: IApplicationFormPage4;
  page5: IApplicationFormPage5;
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
