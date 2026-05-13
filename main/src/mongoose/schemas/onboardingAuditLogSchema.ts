import { Schema } from "mongoose";
import {
  EOnboardingAuditAction,
  EOnboardingAuditActorType,
  type IOnboardingAuditLogDoc,
  type TOnboardingAuditActor,
} from "@/types/onboardingAuditLog.types";

const onboardingAuditActorSchema = new Schema<TOnboardingAuditActor>(
  {
    type: {
      type: String,
      enum: Object.values(EOnboardingAuditActorType),
      required: true,
    },
    id: { type: String },
    name: { type: String, required: true },
    email: { type: String, required: true },
  },
  { _id: false },
);

const onboardingAuditLogSchema = new Schema<IOnboardingAuditLogDoc>(
  {
    onboardingId: {
      type: Schema.Types.ObjectId,
      ref: "OnboardingTracker",
      required: true,
      index: true,
    },
    action: {
      type: String,
      enum: Object.values(EOnboardingAuditAction),
      required: true,
    },
    actor: {
      type: onboardingAuditActorSchema,
      required: true,
    },
    message: { type: String, required: true },
    metadata: { type: Schema.Types.Mixed },
    driverName: { type: String, trim: true },
    driverEmail: { type: String, trim: true },
    companyId: { type: String, trim: true },
    companyName: { type: String, trim: true },
    createdAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
  },
  {
    timestamps: { createdAt: "createdAt", updatedAt: false },
  },
);

onboardingAuditLogSchema.index({ onboardingId: 1, createdAt: -1 });
onboardingAuditLogSchema.index({ onboardingId: 1, action: 1, createdAt: -1 });
onboardingAuditLogSchema.index({ action: 1, createdAt: -1 });
onboardingAuditLogSchema.index({ createdAt: -1 });
onboardingAuditLogSchema.index({ "actor.email": 1, createdAt: -1 });
onboardingAuditLogSchema.index({ driverEmail: 1, createdAt: -1 });
onboardingAuditLogSchema.index({ driverName: 1, createdAt: -1 });

export default onboardingAuditLogSchema;
