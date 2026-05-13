import { model, models, type Model } from "mongoose";
import type { IOnboardingAuditLogDoc } from "@/types/onboardingAuditLog.types";
import onboardingAuditLogSchema from "../schemas/onboardingAuditLogSchema";

export type TOnboardingAuditLogModel = Model<IOnboardingAuditLogDoc>;

const OnboardingAuditLog: TOnboardingAuditLogModel =
  (models.OnboardingAuditLog as TOnboardingAuditLogModel) ||
  model<IOnboardingAuditLogDoc>("OnboardingAuditLog", onboardingAuditLogSchema);

export default OnboardingAuditLog;
