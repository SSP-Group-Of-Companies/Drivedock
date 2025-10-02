import { model, models, type Model } from "mongoose";
import type { IOnboardingVerificationCodeDoc } from "@/types/onboardingVerificationCode.types";
import onboardingVerificationCodeSchema from "../schemas/onboardingVerificationCodeSchema";

const OnboardingVerificationCode: Model<IOnboardingVerificationCodeDoc> =
  models.OnboardingVerificationCode || model<IOnboardingVerificationCodeDoc>("OnboardingVerificationCode", onboardingVerificationCodeSchema);

export default OnboardingVerificationCode;
