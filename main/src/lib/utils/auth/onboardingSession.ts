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
 * Reuse an existing session for a tracker if present; otherwise create one.
 * Returns a Set-Cookie header for the (re)issued session id.
 */
export async function createOnboardingSessionAndCookie(trackerId: string) {
  await connectDB();

  const now = new Date();
  const trackerObjId = new Types.ObjectId(trackerId);
  const newExpiry = sixHoursFromNow();

  const session = await OnboardingSession.findOneAndUpdate(
    // Pick the most recent session for this tracker (any status)
    { trackerId: trackerObjId },
    {
      // Always refresh these
      $set: {
        expiresAt: newExpiry,
        lastUsedAt: now,
        revoked: false,
      },
      // If none existed, create a new one
      $setOnInsert: {
        trackerId: trackerObjId,
      },
    },
    {
      upsert: true,
      new: true, // return the updated/inserted doc
      sort: { lastUsedAt: -1 }, // prefer the most recently used one
    }
  );

  const setCookie = buildSessionCookie(String(session._id), ONBOARDING_SESSION_TTL_SECONDS);
  return { session, setCookie };
}

/**
 * Require a valid driver onboarding session for the given tracker.
 *
 * Failure behavior:
 *  - Throws `AppError(401, ..., EEApiErrorType.SESSION_REQUIRED, { reason, clearCookieHeader })`
 *    so the caller can `return errorResponse(err)` which will include:
 *      { code: "SESSION_REQUIRED", meta.reason } and will clear the stale cookie.
 *
 * Success behavior (sliding session window):
 *  - Extends the session expiry by `ONBOARDING_SESSION_TTL_SECONDS` (default 6h),
 *    updates `lastUsedAt`, persists the session document
 *  - Returns `{ tracker, refreshCookie }`
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
  });

  if (!session) {
    // No such session for this tracker (mismatch / deleted).
    throw new AppError(401, "session expired, resume required", EEApiErrorType.SESSION_REQUIRED, { reason: "SESSION_NOT_FOUND_OR_MISMATCH", clearCookieHeader: clearCookie });
  }

  // if revoked or expired, delete the session doc then throw ---
  const deleteSessionAndThrow = async (status: number, message: string, code: EEApiErrorType, reason: string): Promise<never> => {
    try {
      await OnboardingSession.deleteOne({ _id: session._id });
    } catch {
      // swallow cleanup errors
    }
    throw new AppError(status, message, code, { reason, clearCookieHeader: clearCookie });
  };

  if (session.revoked === true) {
    await deleteSessionAndThrow(401, "session expired, resume required", EEApiErrorType.SESSION_REQUIRED, "SESSION_REVOKED");
  }

  if (session.expiresAt && session.expiresAt <= now) {
    await deleteSessionAndThrow(401, "session expired, resume required", EEApiErrorType.SESSION_REQUIRED, "SESSION_EXPIRED");
  }
  // --- END NEW ---

  const tracker = await OnboardingTracker.findById(trackerId);

  // Keep your existing tracker-eligibility invalidation (delete session + throw)
  if (!tracker) {
    return await deleteSessionAndThrow(404, "onboarding record not found", EEApiErrorType.NOT_FOUND, "TRACKER_NOT_FOUND");
  }
  if (tracker.terminated) {
    await deleteSessionAndThrow(404, "onboarding record not found", EEApiErrorType.NOT_FOUND, "TERMINATED");
  }
  if (onboardingExpired(tracker)) {
    await deleteSessionAndThrow(401, "onboarding time expired", EEApiErrorType.UNAUTHORIZED, "ONBOARDING_EXPIRED");
  }
  if (tracker.status.completed) {
    await deleteSessionAndThrow(401, "onboarding already completed", EEApiErrorType.UNAUTHORIZED, "COMPLETED");
  }

  // Slide expiry on success
  session.expiresAt = sixHoursFromNow();
  session.lastUsedAt = new Date();
  await session.save();

  const refreshCookie = buildSessionCookie(String(session._id), ONBOARDING_SESSION_TTL_SECONDS);
  return { tracker, refreshCookie };
}

/** Revoke sessions for a tracker (e.g., on completion/termination) */
export async function revokeAllSessionsForTracker(trackerId: string) {
  await connectDB();
  await OnboardingSession.updateMany({ trackerId: new Types.ObjectId(trackerId), revoked: { $ne: true } }, { $set: { revoked: true } });
}
