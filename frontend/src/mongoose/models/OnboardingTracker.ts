;import mongoose, { models } from "mongoose";
import { IOnboardingTrackerDoc } from "@/types/onboardingTracker.type";
import onboardingTrackerSchema from "../schemas/onboardingTrackerSchema";

const OnboardingTracker = models.OnboardingTracker || mongoose.model<IOnboardingTrackerDoc>('OnboardingTracker', onboardingTrackerSchema);

export default OnboardingTracker;