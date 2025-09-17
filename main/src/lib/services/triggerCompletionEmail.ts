// src/lib/services/triggerCompletionEmail.ts
import "server-only";
import type { NextRequest } from "next/server";
import { EEmailStatus, IOnboardingTracker } from "@/types/onboardingTracker.types";
import { resolveInternalBaseUrl, resolveBaseUrlFromRequest } from "@/lib/utils/urlHelper.server";
import { CRON_SECRET } from "@/config/env";

export async function triggerCompletionEmailIfEligible(onboardingDoc: IOnboardingTracker, req?: NextRequest, limit = 25) {
  try {
    const meta = onboardingDoc?.emails?.completionPdfs;

    // quick eligibility checks
    if (!onboardingDoc?.status?.completed) return;
    if (!meta?.consentGiven) return;
    if ([EEmailStatus.SENT, EEmailStatus.SENDING].includes(meta.status as EEmailStatus)) return;
    if ((meta?.attempts ?? 0) >= 5) return;
    if (!CRON_SECRET) return;

    // Prefer the current request's origin; fallback to internal base
    const base = req ? resolveBaseUrlFromRequest(req) : await resolveInternalBaseUrl();

    // Fire-and-forget; worker is idempotent and will claim atomically
    fetch(`${base}/api/v1/cron/send-onboarding-completion-emails?limit=${encodeURIComponent(String(limit))}`, {
      method: "POST",
      headers: { authorization: `Bearer ${CRON_SECRET}` },
    }).catch(() => {});
  } catch {
    // swallow; your daily cron will retry anyway
  }
}
