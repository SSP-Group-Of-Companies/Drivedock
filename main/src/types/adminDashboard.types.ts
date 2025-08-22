import { IOnboardingTracker } from "@/types/onboardingTracker.types";

export type DashboardOnboardingItemSummary = {
  driverName: string | null;
  driverEmail: string | null;

  // Minimal summaries for contextual tabs
  carrierEdgeTraining?: { emailSent: boolean };
  drugTest?: { documentsUploaded: boolean };
};

/**
 * The item returned by the admin onboarding list API.
 * Reuses fields from IOnboardingTracker and adds the lean itemSummary.
 */
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
> & {
  _id: string;
  itemSummary: DashboardOnboardingItemSummary;
};
