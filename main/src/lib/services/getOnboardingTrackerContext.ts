// src/lib/services/getOnboardingTrackerContext.ts
"use server";
import "server-only";

import connectDB from "@/lib/utils/connectDB";
import OnboardingTracker from "@/mongoose/models/OnboardingTracker";
import { onboardingExpired, buildTrackerContext } from "@/lib/utils/onboardingUtils";
import { isValidObjectId } from "mongoose";
import { IOnboardingTrackerContext } from "@/types/onboardingTracker.types";

/**
 * getOnboardingTrackerContext
 * --------------------------------------------
 * Server-only helper for Server Components/Routes.
 *
 * Given an onboarding tracker ID, returns a minimal, canonical
 * tracker context (ITrackerContext) or `null` when:
 *  - id is missing or invalid
 *  - tracker not found
 *  - tracker is terminated
 *  - onboarding session is expired
 *  - any unexpected error occurs
 *
 * This function NEVER throws; it always resolves to a value.
 */
export async function getOnboardingTrackerContext(id?: string | null): Promise<IOnboardingTrackerContext | null> {
  try {
    // No id provided → no context
    if (!id) return null;

    // Reject obviously invalid ids early
    if (!isValidObjectId(id)) return null;

    await connectDB();

    // Load tracker (doc, not lean — buildTrackerContext expects the full doc shape)
    const onboardingDoc = await OnboardingTracker.findById(id);
    if (!onboardingDoc) return null;

    // Guard rails: do not expose terminated/expired trackers
    if (onboardingDoc.terminated) return null;
    if (onboardingExpired(onboardingDoc)) return null;

    // Build the canonical context for downstream consumers
    return buildTrackerContext(onboardingDoc.toJSON());
  } catch {
    // Fail closed; keep server components simple
    return null;
  }
}

export default getOnboardingTrackerContext;
