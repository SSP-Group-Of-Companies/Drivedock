// src/types/onboardingSession.types.ts
import { Document, ObjectId } from "mongoose";

export interface IOnboardingSession {
  /** Owning tracker */
  trackerId: ObjectId;

  /** Sliding expiration */
  expiresAt: Date;

  /** For analytics/logging; not used for auth */
  lastUsedAt?: Date;

  /** Soft revoke flag (e.g., after completion/termination) */
  revoked?: boolean;
}

export interface IOnboardingSessionDoc extends IOnboardingSession, Document {}
