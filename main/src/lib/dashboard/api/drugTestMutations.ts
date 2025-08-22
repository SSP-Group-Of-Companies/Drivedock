/**
 * Drug Test mutations
 * -------------------
 * Expected backend route:
 *  PATCH /api/v1/admin/onboarding/:trackerId/drug-test/verify
 *  body: { result: 'pass' | 'fail', notes?: string }
 * Adjust the URL if your backend exposes a different path.
 */

export type VerifyDrugTestPayload = {
  result: "pass" | "fail";
  notes?: string;
};

export type ApiEnvelope<T> = {
  success: boolean;
  message?: string;
  data?: T;
};

async function patchJson<T>(
  url: string,
  body: unknown,
  signal?: AbortSignal
): Promise<ApiEnvelope<T>> {
  const res = await fetch(url, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(body),
    signal,
  });

  if (res.status === 204) return { success: true } as ApiEnvelope<T>;

  const json = (await res.json().catch(() => ({}))) as ApiEnvelope<T>;
  if (!res.ok || json?.success === false) {
    const msg = json?.message || `Request failed: ${res.status}`;
    throw new Error(msg);
  }
  return json;
}

export async function verifyDrugTest(
  trackerId: string,
  payload: VerifyDrugTestPayload,
  signal?: AbortSignal
) {
  // Update if your backend path differs:
  const url = `/api/v1/admin/onboarding/${trackerId}/drug-test/verify`;
  return patchJson<void>(url, payload, signal);
}
