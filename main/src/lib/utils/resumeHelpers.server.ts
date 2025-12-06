import OnboardingTracker from "@/mongoose/models/OnboardingTracker";
import ApplicationForm from "@/mongoose/models/ApplicationForm";
import type {
  IApplicationFormDoc,
  IApplicationFormPage1,
} from "@/types/applicationForm.types";

/** Given a sinHash, find tracker + the email/name from page1 (if present) */
export async function getTrackerAndDriverEmailBySinHash(sinHash: string) {
  const tracker = await OnboardingTracker.findOne({ sinHash });
  if (!tracker) return null;

  const appFormId = tracker.forms?.driverApplication;
  let email = "";
  let firstName = "";
  let lastName = "";

  if (appFormId) {
    const appForm = await ApplicationForm.findById(
      appFormId
    ).lean<IApplicationFormDoc | null>();
    const page1 = appForm?.page1 as unknown as
      | IApplicationFormPage1
      | undefined;
    if (page1) {
      email = (page1.email || "").trim();
      firstName = (page1.firstName || "").trim();
      lastName = (page1.lastName || "").trim();
    }
  }
  return { tracker, email, firstName, lastName };
}
