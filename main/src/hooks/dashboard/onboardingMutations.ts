// lib/dashboard/api/onboardingMutations.ts

export async function terminateTracker(id: string, signal?: AbortSignal) {
  const res = await fetch(`/api/admin/onboarding/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ terminated: true }),
    signal,
  });
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  return res.json();
}

export async function restoreTracker(id: string, signal?: AbortSignal) {
  const res = await fetch(`/api/admin/onboarding/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ terminated: false }),
    signal,
  });
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  return res.json();
}
