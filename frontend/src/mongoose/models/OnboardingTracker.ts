;import { models, model } from "mongoose";
import { IOnboardingTrackerDoc } from "@/types/onboardingTracker.type";
import onboardingTrackerSchema from "../schemas/onboardingTrackerSchema";

const OnboardingTracker = models.OnboardingTracker || model<IOnboardingTrackerDoc>('OnboardingTracker', onboardingTrackerSchema);

export default OnboardingTracker;