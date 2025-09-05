import connectDB from "./connectDB";
import OnboardingTracker from "@/mongoose/models/OnboardingTracker";
import { isValidObjectId } from "mongoose";
import { onboardingExpired } from "./onboardingUtils";

/**
 * Checks if an onboarding tracker is completed and returns the appropriate redirect path
 * @param trackerId - The onboarding tracker ID
 * @returns The redirect path if completed, null if not completed
 */
export async function checkCompletionAndReturnRedirect(trackerId: string): Promise<string | null> {
  try {
    await connectDB();

    if (!isValidObjectId(trackerId)) {
      return null; // Invalid ID, let the page handle the error
    }

    const onboardingDoc = await OnboardingTracker.findById(trackerId);
    
    if (!onboardingDoc || onboardingDoc.terminated) {
      return null; // Not found or terminated, let the page handle the error
    }

    if (onboardingExpired(onboardingDoc)) {
      return null; // Expired, let the page handle the error
    }

    // If onboarding is completed, return the redirect path
    if (onboardingDoc.status.completed) {
      return `/onboarding/${trackerId}/completed`;
    }

    return null; // Not completed, continue with normal flow
  } catch (error) {
    console.error("Error checking completion status:", error);
    return null; // Error occurred, let the page handle it
  }
}
