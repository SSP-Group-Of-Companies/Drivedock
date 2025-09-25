/**
 * Onboarding mutations (terminate/restore)
 * ---------------------------------------
 * Backend route:
 *   PATCH /api/v1/admin/onboarding/:id   body { terminated: boolean }
 * Returns the standard API envelope with success flag.
 */

export type ApiEnvelope<T> = {
  success: boolean;
  message?: string;
  data?: T;
};

const BASE = "/api/v1/admin/onboarding";

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

  if (res.status === 204) {
    return { success: true } as ApiEnvelope<T>;
  }

  const json = (await res.json().catch(() => ({}))) as ApiEnvelope<T>;
  if (!res.ok || json?.success === false) {
    const msg = json?.message || `Request failed: ${res.status}`;
    throw new Error(msg);
  }
  return json;
}

export async function terminateTracker(
  id: string, 
  terminationType: "resigned" | "terminated", 
  signal?: AbortSignal
) {
  return patchJson<void>(
    `${BASE}/${id}/terminate`,
    { terminationType },
    signal
  );
}

export async function restoreTracker(id: string, signal?: AbortSignal) {
  return patchJson<void>(
    `${BASE}/${id}/restore`,
    { terminated: false },
    signal
  );
}
