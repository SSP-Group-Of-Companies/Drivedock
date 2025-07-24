import { Document } from "mongoose";

// Page 1 structure from scanned form
export interface IApplicationFormPage1 {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  province: string;
  postalCode: string;
  sin: string;
  dob: string; // Format: YYYY-MM-DD
  gender: string;
  maritalStatus: string;
  numberOfDependents: number;
  emergencyContactName: string;
  emergencyContactPhone: string;
  emergencyContactRelationship: string;
}

// Placeholder structure for the other 11 pages (to be filled later)
export interface IApplicationForm {
  sin: number;
  currentPage: number;
  completedPages: number[];

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
