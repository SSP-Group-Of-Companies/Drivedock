// src/lib/services/triggerCompletionEmail.ts
import "server-only";
import type { NextRequest } from "next/server";
import { EEmailStatus, IOnboardingTracker } from "@/types/onboardingTracker.types";
import { resolveInternalBaseUrl, resolveBaseUrlFromRequest } from "@/lib/utils/urlHelper.server";
import { CRON_SECRET } from "@/config/env";

export async function triggerCompletionEmailIfEligible(onboardingDoc: IOnboardingTracker, req?: NextRequest, limit = 25) {
  try {
    const meta = onboardingDoc?.emails?.completionPdfs;

    console.log("here 1");
    // quick eligibility checks
    if (!onboardingDoc?.status?.completed) return;
    console.log("here 2");
    if (!meta?.consentGiven) return;
    console.log("here 3");
    if ([EEmailStatus.SENT, EEmailStatus.SENDING].includes(meta.status as EEmailStatus)) return;
    console.log("here 4");
    if ((meta?.attempts ?? 0) >= 5) return;
    console.log("here 5");
    if (!CRON_SECRET) return;
    console.log("here 6");
    // Prefer the current request's origin; fallback to internal base
    const base = req ? resolveBaseUrlFromRequest(req) : await resolveInternalBaseUrl();
    console.log("here 7");
    // Fire-and-forget; worker is idempotent and will claim atomically
    fetch(`${base}/api/v1/cron/send-onboarding-completion-emails?limit=${encodeURIComponent(String(limit))}`, {
      method: "POST",
      headers: { authorization: `Bearer ${CRON_SECRET}` },
    }).catch(() => {});
    console.log("made the request");
  } catch (err) {
    // swallow; your daily cron will retry anyway
    console.log("error: ", err);
  }
}
