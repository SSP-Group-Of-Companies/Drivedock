// src/mongoose/models/OnboardingSession.ts
import { model, models, Model } from "mongoose";
import type { IOnboardingSessionDoc } from "@/types/onboardingSession.types";
import onboardingSessionSchema from "../schemas/onboardingSessionSchema";

const OnboardingSession: Model<IOnboardingSessionDoc> = models.OnboardingSession || model<IOnboardingSessionDoc>("OnboardingSession", onboardingSessionSchema);

export default OnboardingSession;
