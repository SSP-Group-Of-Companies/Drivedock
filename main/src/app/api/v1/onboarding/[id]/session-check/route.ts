// src/app/api/v1/onboarding/[id]/session-check/route.ts
import { NextRequest } from "next/server";
import connectDB from "@/lib/utils/connectDB";
import { successResponse, errorResponse } from "@/lib/utils/apiResponse";
import { requireOnboardingSession } from "@/lib/utils/auth/onboardingSession";
import { attachCookies } from "@/lib/utils/auth/attachCookie";
import { isValidObjectId } from "mongoose";

/**
 * Quick, DB-backed session verification for middleware/page guards.
 * - 204 on success (no body needed), and refreshes the sliding session cookie.
 * - On failure, returns your unified error shape (e.g., code: "SESSION_REQUIRED")
 *   and clears the cookie via errorResponse/AppError meta.
 */
export const GET = async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  try {
    await connectDB();

    const { id } = await params;
    if (!isValidObjectId(id)) {
      return errorResponse(400, "Invalid onboarding ID");
    }

    // Will throw AppError(401, code: "SESSION_REQUIRED", meta.setCookies=[...]) on failure
    const { refreshCookie } = await requireOnboardingSession(id);

    const res = successResponse(200, "OK");
    return attachCookies(res, refreshCookie); // if your util accepts arrays, pass ...refreshCookies
  } catch (err) {
    console.log(err);
    return errorResponse(err);
  }
};
