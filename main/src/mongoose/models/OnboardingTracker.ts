;import { models, model, Model } from "mongoose";
import { IOnboardingTrackerDoc } from "@/types/onboardingTracker.type";
import onboardingTrackerSchema from "../schemas/onboardingTrackerSchema";

const OnboardingTracker : Model<IOnboardingTrackerDoc> = models.OnboardingTracker || model<IOnboardingTrackerDoc>('OnboardingTracker', onboardingTrackerSchema);

export default OnboardingTracker;