import { successResponse, errorResponse } from "@/lib/utils/apiResponse";
import PreQualifications from "@/mongoose/models/Prequalifications";
import OnboardingTracker from "@/mongoose/models/OnboardingTracker";
import connectDB from "@/lib/utils/connectDB";
import { FORM_RESUME_EXPIRES_AT_IN_MILSEC } from "@/config/env";
import { hashString } from "@/lib/utils/cryptoUtils";
import { COMPANIES } from "@/constants/companies";

export const PATCH = async (
  req: Request,
  { params }: { params: Promise<{ sin: string }> }
) => {
  try {
    await connectDB();

    const { sin } = await params;
    if (!sin || sin.length !== 9) {
      return errorResponse(400, "Invalid SIN");
    }

    const sinHash = hashString(sin);
    const body = await req.json();

    // Step 1: Find onboarding tracker
    const onboardingDoc = await OnboardingTracker.findOne({ sinHash });
    if (!onboardingDoc) {
      return errorResponse(404, "Onboarding tracker not found");
    }

    const preQualId = onboardingDoc.forms?.preQualification;
    if (!preQualId) {
      return errorResponse(404, "PreQualifications form not linked");
    }

    // Step 2: Get country from companyId
    const companyId = onboardingDoc.companyId;
    const company = COMPANIES.find((c) => c.id === companyId);
    if (!company) {
      return errorResponse(400, "Invalid companyId in onboarding tracker");
    }

    const isCanadian = company.countryCode === "CA";

    // Step 3: Validate required fields for Canadian applicants
    if (isCanadian) {
      const { canCrossBorderUSA, hasFASTCard } = body;
      if (typeof canCrossBorderUSA !== "boolean") {
        return errorResponse(
          400,
          "Field 'canCrossBorderUSA' is required for Canadian applicants"
        );
      }
      if (typeof hasFASTCard !== "boolean") {
        return errorResponse(
          400,
          "Field 'hasFASTCard' is required for Canadian applicants"
        );
      }
    }

    // Step 4: Update PreQualifications
    const preQualDoc = await PreQualifications.findByIdAndUpdate(
      preQualId,
      { $set: { ...body, completed: true } },
      { new: true }
    );

    if (!preQualDoc) {
      return errorResponse(404, "PreQualifications not found");
    }

    // Step 5: Update onboarding tracker status
    onboardingDoc.status.currentStep = 1;
    onboardingDoc.status.completedStep = Math.max(
      onboardingDoc.status.completedStep,
      1
    );
    onboardingDoc.resumeExpiresAt = new Date(
      Date.now() + Number(FORM_RESUME_EXPIRES_AT_IN_MILSEC)
    );
    await onboardingDoc.save();

    return successResponse(
      200,
      "PreQualifications and onboarding tracker updated",
      {
        preQualifications: preQualDoc,
        onboardingTracker: onboardingDoc,
      }
    );
  } catch (error) {
    return errorResponse(
      500,
      error instanceof Error ? error.message : String(error)
    );
  }
};
