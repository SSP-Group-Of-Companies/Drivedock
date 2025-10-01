// src/app/api/v1/onboarding/[id]/guard/route.ts
import { NextRequest } from "next/server";
import { errorResponse, successResponse } from "@/lib/utils/apiResponse";
import connectDB from "@/lib/utils/connectDB";
import OnboardingTracker from "@/mongoose/models/OnboardingTracker";
import { isValidObjectId } from "mongoose";
import { onboardingExpired, buildTrackerContext } from "@/lib/utils/onboardingUtils";
import { requireOnboardingSession } from "@/lib/utils/auth/onboardingSession";
import { attachCookies } from "@/lib/utils/auth/attachCookie";

export const GET = async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  try {
    await connectDB();

    const { id } = await params;
    if (!isValidObjectId(id)) return errorResponse(400, "Invalid onboarding ID");

    const doc = await OnboardingTracker.findById(id);
    if (!doc || doc.terminated) return errorResponse(404, "Onboarding document not found");
    if (onboardingExpired(doc)) return errorResponse(400, "Onboarding session expired");

    const completed = !!doc.status?.completed;
    const invitationApproved = !!doc.invitationApproved;

    // Session check (refresh on success; clear on failure), but always respond 200 with flags.
    let sessionOk = false;
    let refreshCookie: string[] | undefined;
    let clearCookies: string[] | undefined;

    try {
      const result = await requireOnboardingSession(id);
      sessionOk = true;
      refreshCookie = Array.isArray(result?.refreshCookie) ? result.refreshCookie : result?.refreshCookie ? [result.refreshCookie] : undefined;
    } catch (err: any) {
      const maybeSetCookies = err?.meta?.setCookies;
      if (maybeSetCookies) {
        clearCookies = Array.isArray(maybeSetCookies) ? maybeSetCookies : [maybeSetCookies];
      }
    }

    // Provide minimal tracker context so middleware can compute step routing without DB
    const ctx = buildTrackerContext(doc); // id, status, invitationApproved, needsFlatbedTraining, etc.

    const res = successResponse(200, "OK", {
      completed,
      invitationApproved,
      sessionOk,
      tracker: {
        id: ctx.id,
        needsFlatbedTraining: ctx.needsFlatbedTraining,
        status: {
          currentStep: ctx.status.currentStep,
          completed: Boolean(ctx.status.completed),
        },
      },
    });

    if (refreshCookie?.length) return attachCookies(res, refreshCookie);
    if (clearCookies?.length) return attachCookies(res, clearCookies);
    return res;
  } catch (error) {
    return errorResponse(error);
  }
};
