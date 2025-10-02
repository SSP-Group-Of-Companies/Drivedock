import type { Document, ObjectId } from "mongoose";

export type EVerificationPurpose = "resume";

export interface IOnboardingVerificationCode {
  /** Owning tracker (resume target) */
  trackerId: ObjectId;

  /** Hashes for matching (never store raw SIN/email/code) */
  sinHash: string;
  emailHash: string;

  /** Hashed 6-digit code */
  codeHash: string;

  /** Purpose discriminator (future-proofing) */
  purpose: EVerificationPurpose;

  /** Expiry (TTL) */
  expiresAt: Date;

  /** Retry guard */
  attempts?: number;
  maxAttempts?: number;

  createdAt: Date;
  updatedAt: Date;
}

export interface IOnboardingVerificationCodeDoc extends IOnboardingVerificationCode, Document {}
