import type { IPhoto } from "@/types/shared.types";
import type { EDrugTestStatus } from "@/types/drugTest.types";
import type { EStepPath } from "@/types/onboardingTracker.types";

export interface DrugTestBlock {
  documents?: IPhoto[];
  status?: EDrugTestStatus;
}

export interface CarriersEdgeBlock {
  emailSent?: boolean;
  emailSentBy?: string;
  emailSentAt?: string; // ISO
  certificates?: IPhoto[];
  completed?: boolean;
}

export interface IdentificationsBlock {
  driverLicenseExpiration?: string; // ISO
}

export interface SafetyGetResponse {
  onboardingContext: {
    _id: string;
    companyId: string;
    applicationType?: string;
    needsFlatbedTraining?: boolean;
    status: { currentStep?: EStepPath; completed?: boolean };
    prevStep?: EStepPath | null;
    nextStep?: EStepPath | null;
    notes?: string;
    itemSummary?: { driverName?: string; driverEmail?: string };
  };
  drugTest?: DrugTestBlock; // <-- optional, not `| {}`
  carriersEdge?: CarriersEdgeBlock; // <-- optional, not `| {}`
  driveTest?: unknown; // <-- unknown is safer than `any | {}`
  identifications?: IdentificationsBlock; // <-- optional
}

export type SafetyPatchBody = {
  notes?: string;
  drugTest?: { documents?: IPhoto[]; status?: EDrugTestStatus };
  carriersEdgeTraining?: {
    certificates?: IPhoto[]; // <-- was IPhoto; correct to IPhoto[]
    emailSent?: boolean;
    emailSentBy?: string;
    emailSentAt?: string | Date;
    completed?: boolean;
  };
};

export async function fetchSafety(
  trackerId: string,
  signal?: AbortSignal
): Promise<SafetyGetResponse> {
  const res = await fetch(
    `/api/v1/admin/onboarding/${trackerId}/safety-processing`,
    {
      method: "GET",
      headers: { Accept: "application/json" },
      signal,
    }
  );
  const json = await res.json();
  if (!res.ok || json?.success === false) {
    throw new Error(
      json?.message || `Failed to load safety data (${res.status})`
    );
  }
  return (json.data ?? json) as SafetyGetResponse;
}

export async function patchSafety(
  trackerId: string,
  body: SafetyPatchBody
): Promise<SafetyGetResponse> {
  const res = await fetch(
    `/api/v1/admin/onboarding/${trackerId}/safety-processing`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(body),
    }
  );
  const json = await res.json();
  if (!res.ok || json?.success === false) {
    throw new Error(
      json?.message || `Failed to update safety data (${res.status})`
    );
  }
  return (json.data ?? json) as SafetyGetResponse;
}
