/**
 * Carrier's Edge mutations
 * ------------------------
 * Expected backend routes (adjust if yours differ):
 *   PATCH /api/v1/admin/onboarding/:id/carriers-edge/assign
 *     body: { emailSent: true }
 *
 *   PATCH /api/v1/admin/onboarding/:id/carriers-edge/certificate
 *     body: { certificateId: string; completedAt?: string } // ISO date
 */

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

export async function assignCarriersEdge(
  trackerId: string,
  signal?: AbortSignal
) {
  return patchJson<void>(
    `/api/v1/admin/onboarding/${trackerId}/carriers-edge/assign`,
    { emailSent: true },
    signal
  );
}

export type UploadCECertificatePayload = {
  certificateId: string;
  completedAt?: string; // 'YYYY-MM-DD' or ISO string; backend can normalize
};

export async function uploadCarriersEdgeCertificate(
  trackerId: string,
  payload: UploadCECertificatePayload,
  signal?: AbortSignal
) {
  return patchJson<void>(
    `/api/v1/admin/onboarding/${trackerId}/carriers-edge/certificate`,
    payload,
    signal
  );
}
