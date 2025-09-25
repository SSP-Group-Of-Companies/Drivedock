import { models, model, Model } from "mongoose";
import { IOnboardingTrackerDoc } from "@/types/onboardingTracker.types";
import onboardingTrackerSchema from "../schemas/onboardingTrackerSchema";

const OnboardingTracker: Model<IOnboardingTrackerDoc> =
  models.OnboardingTracker ||
  model<IOnboardingTrackerDoc>("OnboardingTracker", onboardingTrackerSchema);

export default OnboardingTracker;
