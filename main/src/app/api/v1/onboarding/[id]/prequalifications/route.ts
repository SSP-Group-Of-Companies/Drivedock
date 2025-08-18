import { successResponse, errorResponse } from "@/lib/utils/apiResponse";
import PreQualifications from "@/mongoose/models/Prequalifications";
import OnboardingTracker from "@/mongoose/models/OnboardingTracker";
import connectDB from "@/lib/utils/connectDB";
import { FORM_RESUME_EXPIRES_AT_IN_MILSEC } from "@/config/env";
import { COMPANIES } from "@/constants/companies";
import { advanceStatus, buildTrackerContext, onboardingExpired } from "@/lib/utils/onboardingUtils";
import { EStepPath } from "@/types/onboardingTracker.type";
import { isValidObjectId } from "mongoose";
import { NextRequest } from "next/server";

export const PATCH = async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  try {
    await connectDB();

    const { id } = await params;

    if (!isValidObjectId(id)) return errorResponse(400, "not a valid id");

    const body = await req.json();

    // Step 1: Find onboarding tracker
    const onboardingDoc = await OnboardingTracker.findById(id);
    if (!onboardingDoc || onboardingDoc.terminated) {
      return errorResponse(404, "Onboarding document not found");
    }

    if (onboardingExpired(onboardingDoc)) return errorResponse(400, "Onboarding session expired");

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
        return errorResponse(400, "Field 'canCrossBorderUSA' is required for Canadian applicants");
      }
      if (typeof hasFASTCard !== "boolean") {
        return errorResponse(400, "Field 'hasFASTCard' is required for Canadian applicants");
      }
    }

    // Step 4: Update PreQualifications
    const preQualDoc = await PreQualifications.findByIdAndUpdate(preQualId, { $set: { ...body, completed: true } }, { new: true });

    if (!preQualDoc) {
      return errorResponse(404, "PreQualifications not found");
    }

    // Step 5: Update onboarding tracker status
    onboardingDoc.status = advanceStatus(onboardingDoc.status, EStepPath.PRE_QUALIFICATIONS);
    onboardingDoc.resumeExpiresAt = new Date(Date.now() + Number(FORM_RESUME_EXPIRES_AT_IN_MILSEC));
    await onboardingDoc.save();

    return successResponse(200, "PreQualifications and onboarding tracker updated", {
      onboardingContext: buildTrackerContext(onboardingDoc, EStepPath.PRE_QUALIFICATIONS),
      preQualifications: preQualDoc,
    });
  } catch (error) {
    return errorResponse(error);
  }
};

export const GET = async (_: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  try {
    await connectDB();

    const { id } = await params;
    if (!isValidObjectId(id)) return errorResponse(400, "not a valid id");

    // Step 1: Find onboarding tracker
    const onboardingDoc = await OnboardingTracker.findById(id);
    if (!onboardingDoc || onboardingDoc.terminated) {
      return errorResponse(404, "Onboarding document not found");
    }

    if (onboardingExpired(onboardingDoc)) return errorResponse(400, "Onboarding session expired");

    // Step 2: Fetch pre-qualifications form using linked ID
    const preQualId = onboardingDoc.forms?.preQualification;
    let preQualDoc = null;
    if (preQualId) {
      preQualDoc = await PreQualifications.findById(preQualId);
    }

    // update tracker current step
    onboardingDoc.status.currentStep = EStepPath.PRE_QUALIFICATIONS;
    await onboardingDoc.save();

    return successResponse(200, "PreQualifications data retrieved", {
      onboardingContext: buildTrackerContext(onboardingDoc),
      preQualifications: preQualDoc?.toObject() ?? {},
    });
  } catch (error) {
    return errorResponse(error);
  }
};
