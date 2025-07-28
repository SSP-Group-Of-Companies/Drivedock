import { FORM_RESUME_EXPIRES_AT_IN_MILSEC } from "@/config/env";
import { errorResponse, successResponse } from "@/lib/utils/apiResponse";
import connectDB from "@/lib/utils/connectDB";
import ApplicationForm from "@/mongoose/models/applicationForm";
import OnboardingTracker from "@/mongoose/models/OnboardingTracker";
import { hashString } from "@/lib/utils/cryptoUtils";
import { IApplicationFormPage2, IEmploymentEntry } from "@/types/applicationForm.types";
import { differenceInDays } from "date-fns";

export function validateEmploymentHistory(employments: IEmploymentEntry[]): string | null {
  if (!Array.isArray(employments) || employments.length === 0) {
    return "At least one employment entry is required.";
  }

  if (employments.length > 5) {
    return "A maximum of 5 employment entries is allowed.";
  }

  // Sort by `from` date descending (most recent first)
  const sorted = [...employments].sort(
    (a, b) => new Date(b.from).getTime() - new Date(a.from).getTime()
  );

  let totalDays = 0;

  for (let i = 0; i < sorted.length; i++) {
    const current = sorted[i];
    const from = new Date(current.from);
    const to = new Date(current.to);

    if (isNaN(from.getTime()) || isNaN(to.getTime())) {
      return `Invalid date format in employment entry for ${current.employerName}`;
    }

    if (to < from) {
      return `End date cannot be before start date in job at ${current.employerName}`;
    }

    totalDays += differenceInDays(to, from);

    const next = sorted[i + 1];
    if (next) {
      const nextFrom = new Date(next.from);
      const nextTo = new Date(next.to);

      // ❌ Overlap check: current.from must be >= next.to
      if (from < nextTo) {
        return `Job at ${current.employerName} overlaps with job at ${next.employerName}`;
      }

      // Gap check
      const gapDays = differenceInDays(from, nextTo);
      if (
        gapDays >= 30 &&
        (!current.gapExplanationBefore || current.gapExplanationBefore.trim() === "")
      ) {
        return `Missing gap explanation before employment at ${current.employerName}`;
      }
    }
  }

  const totalMonths = Math.floor(totalDays / 30);

  if (totalMonths === 24) {
    return null; // ✅ Exactly 2 years
  }

  if (totalMonths < 24) {
    return "Driving experience must be at least 2 years.";
  }

  if (totalMonths > 24 && totalMonths < 120) {
    return "If experience is over 2 years, a full 10 years of history must be entered.";
  }

  return null; // ✅ 10+ years
}


export const PATCH = async (
  req: Request,
  { params }: { params: Promise<{ sin: string }> }
) => {
  try {
    await connectDB();

    const { sin } = await params;
    if (!sin || sin.length !== 9)
      return errorResponse(400, "Invalid SIN in URL");

    const sinHash = hashString(sin);
    const body = await req.json() as IApplicationFormPage2;

    // Validate employment history logic
    const validationError = validateEmploymentHistory(body.employments);
    if (validationError) return errorResponse(400, validationError);

    // Retrieve onboarding tracker
    const onboardingDoc = await OnboardingTracker.findOne({ sinHash });
    if (!onboardingDoc)
      return errorResponse(404, "OnboardingTracker not found");

    const appFormId = onboardingDoc.forms?.driverApplication;
    if (!appFormId) return errorResponse(404, "ApplicationForm not linked");

    const appFormDoc = await ApplicationForm.findById(appFormId);
    if (!appFormDoc) return errorResponse(404, "ApplicationForm not found");

    // Update Page 2
    appFormDoc.page2 = body;
    appFormDoc.currentStep = 2;
    if (appFormDoc.completedStep < 2) {
      appFormDoc.completedStep = 2;
    }
    await appFormDoc.save();

    // Update onboarding tracker
    onboardingDoc.status.currentStep = 2;
    onboardingDoc.resumeExpiresAt = new Date(
      Date.now() + Number(FORM_RESUME_EXPIRES_AT_IN_MILSEC)
    );
    await onboardingDoc.save();

    return successResponse(200, "ApplicationForm Page 2 updated", {
      onboardingTracker: onboardingDoc.toObject({ virtuals: true }),
      applicationForm: appFormDoc.toObject({ virtuals: true }),
    });
  } catch (error) {
    return errorResponse(
      500,
      error instanceof Error ? error.message : String(error)
    );
  }
};
