// src/types/adminDashboard.types.ts
import { IOnboardingTracker } from "@/types/onboardingTracker.types";
import { ECountryCode } from "@/types/shared.types";
import { EDrugTestStatus } from "@/types/drugTest.types";

export type DashboardOnboardingItemSummary = {
  driverName: string | null;
  driverEmail: string | null;
  truckUnitNumber: string | null;

  carrierEdgeTraining?: { emailSent: boolean };
  drugTest?: { status?: EDrugTestStatus };
};

export type DashboardInvitationItemSummary = {
  name: string | null;
  email: string | null;
  phone: string | null;
};

export type DashboardOnboardingItem = Pick<
  IOnboardingTracker,
  "status" | "companyId" | "applicationType" | "createdAt" | "updatedAt" | "terminated" | "terminationType" | "resumeExpiresAt" | "forms" | "needsFlatbedTraining"
> & {
  _id: string;
  itemSummary: DashboardOnboardingItemSummary;
};

export type DashboardInvitationItem = Pick<IOnboardingTracker, "companyId" | "applicationType" | "createdAt" | "updatedAt" | "invitationApproved" | "terminated" | "forms"> & {
  _id: string;
  itemSummary: DashboardInvitationItemSummary;
  preApprovalCountryCode?: ECountryCode;
};
