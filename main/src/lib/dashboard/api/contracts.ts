import type { EDrugTestStatus } from "@/types/drugTest.types";
import type { EStepPath } from "@/types/onboardingTracker.types";

export type ContractContext = {
  _id: string;
  companyId: string;
  applicationType?: string;
  needsFlatbedTraining?: boolean;
  resumeExpiresAt?: string;
  status: {
    currentStep?: EStepPath;
    completed?: boolean;
    completionDate?: string;
  };
  completionLocation?: {
    country?: string; // Full country name (e.g., "Canada", "United States")
    region?: string; // State/Province (e.g., "Ontario", "California")
    city?: string; // City name (e.g., "Milton", "Los Angeles")
    timezone?: string;
    latitude?: number; // GPS latitude
    longitude?: number; // GPS longitude
  };
  terminated?: boolean;
  terminationType?: string;
  itemSummary?: { driverName?: string; driverEmail?: string; truckUnitNumber?: string };
  forms?: {
    driveTest?: { completed?: boolean };
    carriersEdgeTraining?: { emailSent?: boolean };
    drugTest?: { status?: EDrugTestStatus; documentsUploaded?: boolean };
    identifications?: {
      driverLicenseExpiration?: string;
      truckDetails?: {
        vin?: string;
        make?: string;
        model?: string;
        year?: string;
        province?: string;
        truckUnitNumber?: string;
        plateNumber?: string;
      };
    };
  };
};

type ContractForms = NonNullable<ContractContext["forms"]>;

// ---- READ (updated) ----
export async function fetchContractContext(trackerId: string, signal?: AbortSignal): Promise<ContractContext> {
  async function get(path: string) {
    const res = await fetch(`/api/v1/admin/onboarding/${trackerId}${path}`, {
      method: "GET",
      headers: { Accept: "application/json" },
      signal,
    });
    if (!res.ok) {
      const msg = `Failed to load contract context (${res.status})`;
      const err = new Error(msg) as Error & { status?: number };
      (err as any).status = res.status;
      throw err;
    }
    return res.json();
  }

  // Prefer your existing route; fall back if you add /context later
  let json: any;
  try {
    json = await get("/safety-processing");
  } catch (e: any) {
    // try the alternative if the first 404s
    if (e?.status === 404) json = await get("/context");
    else throw e;
  }

  // Normalize shape
  const data = json?.data ?? json ?? {};
  const ctx = (data.onboardingContext ?? data) as Partial<ContractContext>;

  // Merge separate blocks into ctx.forms so the notifications work
  const forms: ContractForms = { ...(ctx.forms ?? {}) };
  if (data.driveTest) forms.driveTest = data.driveTest;
  if (data.carriersEdge) forms.carriersEdgeTraining = data.carriersEdge;
  if (data.drugTest) forms.drugTest = data.drugTest;
  if (data.identifications) forms.identifications = data.identifications;
  // identifications aren't returned by this route; add server support later if needed

  const normalized: ContractContext = {
    _id: String(ctx._id),
    companyId: String(ctx.companyId),
    applicationType: ctx.applicationType,
    needsFlatbedTraining: ctx.needsFlatbedTraining,
    resumeExpiresAt: (ctx as any).resumeExpiresAt,
    status: ctx.status ?? {},
    terminated: (ctx as any).terminated,
    terminationType: (ctx as any).terminationType,
    itemSummary: ctx.itemSummary ?? {},
    forms,
  };

  return normalized;
}

/* ===================== MUTATION ===================== */
/**
 * PATCH /api/v1/admin/onboarding/:id/change-company
 */
export async function changeCompany(trackerId: string, companyId: string, signal?: AbortSignal): Promise<ContractContext | null> {
  const res = await fetch(`/api/v1/admin/onboarding/${trackerId}/change-company`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ companyId }),
    signal,
  });

  if (!res.ok) {
    const msg = `Failed to change company (${res.status})`;
    const err = new Error(msg) as Error & { status?: number };
    (err as any).status = res.status;
    throw err;
  }

  const json = await res.json();
  return json?.data ?? null;
}
