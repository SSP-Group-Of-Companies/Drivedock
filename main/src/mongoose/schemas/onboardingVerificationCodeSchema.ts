import { Schema } from "mongoose";
import type { IOnboardingVerificationCodeDoc } from "@/types/onboardingVerificationCode.types";

/**
 * One active code per (trackerId, purpose).
 * We store *hashes* only for SIN, email and code.
 */
const onboardingVerificationCodeSchema = new Schema<IOnboardingVerificationCodeDoc>(
  {
    trackerId: {
      type: Schema.Types.ObjectId,
      required: [true, "trackerId is required"],
      index: true,
      ref: "OnboardingTracker",
    },
    sinHash: {
      type: String,
      required: [true, "sinHash is required"],
      index: true,
    },
    emailHash: {
      type: String,
      required: [true, "emailHash is required"],
      index: true,
    },
    codeHash: {
      type: String,
      required: [true, "codeHash is required"],
    },
    purpose: {
      type: String,
      required: [true, "purpose is required"],
      enum: ["resume"],
      index: true,
    },
    expiresAt: {
      type: Date,
      required: [true, "expiresAt is required"],
      index: true,
    },
    attempts: {
      type: Number,
      default: 0,
    },
    maxAttempts: {
      type: Number,
      default: 5,
    },
  },
  { timestamps: true }
);

// TTL index — Mongo drops docs at/after expiresAt
onboardingVerificationCodeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0, name: "verificationCode_ttl" });

// Uniqueness guard for “one active per tracker+purpose”
onboardingVerificationCodeSchema.index({ trackerId: 1, purpose: 1 }, { unique: true, name: "verificationCode_tracker_purpose_unique" });

export default onboardingVerificationCodeSchema;
