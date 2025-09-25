// src/mongoose/schemas/onboardingSessionSchema.ts
import { Schema } from "mongoose";
import type { IOnboardingSessionDoc } from "@/types/onboardingSession.types";

/**
 * Onboarding Session
 * - Opaque, short-lived (6h), sliding expiry per successful guarded request.
 * - Cookie stores ONLY this document's _id (as the session token).
 * - TTL via expiresAt.
 */
const onboardingSessionSchema = new Schema<IOnboardingSessionDoc>(
  {
    trackerId: {
      type: Schema.Types.ObjectId,
      required: [true, "trackerId is required"],
      index: true,
      ref: "OnboardingTracker",
    },
    expiresAt: {
      type: Date,
      required: [true, "expiresAt is required"],
    },
    lastUsedAt: {
      type: Date,
      default: null,
    },
    revoked: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// TTL index (Mongo will drop docs automatically after expiresAt)
// Important: TTL index must be on a single field and not partial.
onboardingSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0, name: "onboardingSession_ttl" });

export default onboardingSessionSchema;
