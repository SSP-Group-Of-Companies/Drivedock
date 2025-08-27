// src/types/adminDashboard.types.ts
import { IOnboardingTracker } from "@/types/onboardingTracker.types";
import { EDrugTestStatus } from "@/types/drugTest.types";

export type DashboardOnboardingItemSummary = {
  driverName: string | null;
  driverEmail: string | null;

  carrierEdgeTraining?: { emailSent: boolean };
  drugTest?: { status?: EDrugTestStatus };
};

export type DashboardOnboardingItem = Pick<
  IOnboardingTracker,
  | "status"
  | "companyId"
  | "applicationType"
  | "createdAt"
  | "updatedAt"
  | "terminated"
  | "resumeExpiresAt"
  | "forms"
  | "needsFlatbedTraining"
> & {
  _id: string;
  itemSummary: DashboardOnboardingItemSummary;
};
