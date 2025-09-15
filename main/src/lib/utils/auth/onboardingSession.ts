// src/lib/utils/auth/onboardingSession.ts
import "server-only";
import { cookies } from "next/headers";
import { Types } from "mongoose";
import OnboardingSession from "@/mongoose/models/OnboardingSession";
import OnboardingTracker from "@/mongoose/models/OnboardingTracker";
import connectDB from "@/lib/utils/connectDB";
import { AppError } from "@/lib/utils/apiResponse";
import { onboardingExpired } from "../onboardingUtils";
import { EEApiErrorType } from "@/types/apiError.types";
import { ONBOARDING_SESSION_COOKIE_NAME, ONBOARDING_SESSION_TTL_SECONDS } from "@/config/env";

/** Build Set-Cookie string */
function buildSessionCookie(value: string, maxAgeSeconds: number): string {
  const attrs = [`${ONBOARDING_SESSION_COOKIE_NAME}=${encodeURIComponent(value)}`, `Path=/`, `HttpOnly`, `SameSite=Lax`, `Secure`, `Max-Age=${maxAgeSeconds}`];
  return attrs.join("; ");
}

/** Clear cookie helper */
export function clearOnboardingCookieHeader(): string {
  const attrs = [`${ONBOARDING_SESSION_COOKIE_NAME}=;`, `Path=/`, `HttpOnly`, `SameSite=Lax`, `Secure`, `Max-Age=0`];
  return attrs.join("; ");
}

function sixHoursFromNow() {
  return new Date(Date.now() + ONBOARDING_SESSION_TTL_SECONDS * 1000);
}

/**
 * Reuse an existing active session for a tracker if present; otherwise create one.
 * Returns a Set-Cookie header for the (re)issued session id.
 */
export async function createOnboardingSessionAndCookie(trackerId: string) {
  await connectDB();
  const now = new Date();

  // 1) Try to reuse an existing active (not revoked, not expired)
  let session = await OnboardingSession.findOne({
    trackerId: new Types.ObjectId(trackerId),
    revoked: { $ne: true },
    expiresAt: { $gt: now },
  }).sort({ lastUsedAt: -1 });

  // 2) If none, create a new one
  if (!session) {
    session = await OnboardingSession.create({
      trackerId: new Types.ObjectId(trackerId),
      expiresAt: sixHoursFromNow(),
      lastUsedAt: now,
      revoked: false,
    });
  } else {
    // 3) Slide expiry for the reused session
    session.expiresAt = sixHoursFromNow();
    session.lastUsedAt = now;
    await session.save();
  }

  const setCookie = buildSessionCookie(String(session._id), ONBOARDING_SESSION_TTL_SECONDS);
  return { session, setCookie };
}

/**
 * Require a valid driver onboarding session for the given tracker.
 *
 * What this validates (in this order):
 * 1) Cookie presence & shape
 *    - Reads `ONBOARDING_SESSION_COOKIE_NAME` (e.g. "OD_SESS")
 *    - Cookie value must be a valid Mongo ObjectId
 *    - Supplied `trackerId` must be a valid Mongo ObjectId
 *
 * 2) Session document is present and usable
 *    - Finds `OnboardingSession` by cookie `_id`
 *    - Ensures `trackerId` matches the route param
 *    - Ensures `revoked !== true`
 *    - Ensures `expiresAt > now` (not expired)
 *
 * 3) Tracker document is eligible to continue
 *    - Tracker exists
 *    - NOT `terminated`
 *    - NOT `onboardingExpired(tracker)` (resume window still valid)
 *    - NOT `status.completed`
 *
 * Failure behavior:
 *  - Throws `AppError(401, <friendly message>, EEApiErrorType.SESSION_REQUIRED, { reason, clearCookieHeader })`
 *    so the caller can `return errorResponse(err)` which will include:
 *      { code: "SESSION_REQUIRED", meta.reason } and will clear the stale cookie.
 *
 * Success behavior (sliding session window):
 *  - Extends the session expiry by `ONBOARDING_SESSION_TTL_SECONDS` (default 6h),
 *    updates `lastUsedAt`, persists the session document
 *  - Returns `{ tracker, refreshCookie }` where `refreshCookie` is a single
 *    "Set-Cookie" header string for the refreshed session cookie
 */
export async function requireOnboardingSession(trackerId: string) {
  await connectDB();

  const jar = await cookies();
  const raw = jar.get(ONBOARDING_SESSION_COOKIE_NAME)?.value;

  const clearCookie = clearOnboardingCookieHeader();

  if (!raw || !Types.ObjectId.isValid(trackerId) || !Types.ObjectId.isValid(raw)) {
    throw new AppError(401, "session expired, resume required", EEApiErrorType.SESSION_REQUIRED, { reason: "MISSING_OR_INVALID_COOKIE", clearCookieHeader: clearCookie });
  }

  const now = new Date();
  const session = await OnboardingSession.findOne({
    _id: new Types.ObjectId(raw),
    trackerId: new Types.ObjectId(trackerId),
    revoked: { $ne: true },
    expiresAt: { $gt: now },
  });

  if (!session) {
    throw new AppError(401, "session expired, resume required", EEApiErrorType.SESSION_REQUIRED, { reason: "SESSION_NOT_FOUND_OR_REVOKED_OR_EXPIRED", clearCookieHeader: clearCookie });
  }

  const tracker = await OnboardingTracker.findById(trackerId);
  if (!tracker) {
    throw new AppError(401, "onboarding record not found", EEApiErrorType.SESSION_REQUIRED, { reason: "TRACKER_NOT_FOUND", clearCookieHeader: clearCookie });
  }

  if (tracker.terminated) {
    throw new AppError(401, "onboarding terminated", EEApiErrorType.SESSION_REQUIRED, { reason: "TERMINATED", clearCookieHeader: clearCookie });
  }

  if (onboardingExpired(tracker)) {
    throw new AppError(401, "onboarding time expired", EEApiErrorType.SESSION_REQUIRED, { reason: "ONBOARDING_EXPIRED", clearCookieHeader: clearCookie });
  }

  if (tracker.status.completed) {
    throw new AppError(401, "onboarding already completed", EEApiErrorType.SESSION_REQUIRED, { reason: "COMPLETED", clearCookieHeader: clearCookie });
  }

  // Slide expiry
  session.expiresAt = sixHoursFromNow();
  session.lastUsedAt = new Date();
  await session.save();

  const refreshCookie = buildSessionCookie(String(session._id), ONBOARDING_SESSION_TTL_SECONDS);

  return {
    tracker,
    refreshCookie,
  };
}

/** Revoke sessions for a tracker (e.g., on completion/termination) */
export async function revokeAllSessionsForTracker(trackerId: string) {
  await connectDB();
  await OnboardingSession.updateMany({ trackerId: new Types.ObjectId(trackerId), revoked: { $ne: true } }, { $set: { revoked: true } });
}
