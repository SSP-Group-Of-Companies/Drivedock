import { successResponse, errorResponse } from "@/lib/utils/apiResponse";
import PreQualifications from "@/mongoose/models/Prequalifications";
import connectDB from "@/lib/utils/connectDB";
import {
  COMPANIES,
  ECompanyId,
  needsFlatbedTraining,
} from "@/constants/companies";
import {
  advanceProgress,
  buildTrackerContext,
  nextResumeExpiry,
} from "@/lib/utils/onboardingUtils";
import { EStepPath } from "@/types/onboardingTracker.types";
import { isValidObjectId } from "mongoose";
import { NextRequest } from "next/server";
import { requireOnboardingSession } from "@/lib/utils/auth/onboardingSession";
import { attachCookies } from "@/lib/utils/auth/attachCookie";

// disabled updating prequalifications by driver according to business logic
const disalbeUpdatingPrequalifications = true;

export const PATCH = async (
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  try {
    if (disalbeUpdatingPrequalifications)
      return errorResponse(401, "unauthorized");

    await connectDB();

    const { id } = await params;

    if (!isValidObjectId(id)) return errorResponse(400, "not a valid id");

    const body = await req.json();

    const { tracker: onboardingDoc, refreshCookie } =
      await requireOnboardingSession(id);

    const preQualId = onboardingDoc.forms?.preQualification;
    if (!preQualId) {
      return errorResponse(404, "PreQualifications form not linked");
    }

    // Step 2: Get country from companyId
    const companyId = onboardingDoc.companyId as ECompanyId;
    const company = COMPANIES.find((c) => c.id === companyId);
    if (!company) {
      return errorResponse(400, "Invalid companyId in onboarding tracker");
    }

    const isCanadian = company.countryCode === "CA";

    // Step 3: Validate required fields for Canadian applicants
    if (isCanadian) {
      const { canCrossBorderUSA, hasFASTCard, statusInCanada } = body;
      if (typeof canCrossBorderUSA !== "boolean") {
        return errorResponse(
          400,
          "Field 'canCrossBorderUSA' is required for Canadian applicants"
        );
      }
      if (!statusInCanada) {
        return errorResponse(
          400,
          "Field 'statusInCanada' is required for Canadian applicants"
        );
      }

      // Only validate FAST card fields if they were provided (conditional logic)
      if (hasFASTCard !== undefined && typeof hasFASTCard !== "boolean") {
        return errorResponse(
          400,
          "'hasFASTCard' must be a boolean when provided"
        );
      }
      if (
        body.eligibleForFASTCard !== undefined &&
        typeof body.eligibleForFASTCard !== "boolean"
      ) {
        return errorResponse(
          400,
          "'eligibleForFASTCard' must be a boolean when provided"
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

    // check if flatbed training is required
    onboardingDoc.needsFlatbedTraining = needsFlatbedTraining(
      companyId,
      onboardingDoc.applicationType,
      preQualDoc.flatbedExperience
    );
    // Step 5: Update onboarding tracker status
    onboardingDoc.status = advanceProgress(
      onboardingDoc,
      EStepPath.PRE_QUALIFICATIONS
    );
    onboardingDoc.resumeExpiresAt = nextResumeExpiry();
    await onboardingDoc.save();

    const res = successResponse(
      200,
      "PreQualifications and onboarding tracker updated",
      {
        onboardingContext: buildTrackerContext(
          onboardingDoc,
          EStepPath.PRE_QUALIFICATIONS
        ),
        preQualifications: preQualDoc,
      }
    );

    return attachCookies(res, refreshCookie);
  } catch (error) {
    return errorResponse(error);
  }
};

export const GET = async (
  _: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  try {
    await connectDB();

    const { id } = await params;
    if (!isValidObjectId(id)) return errorResponse(400, "not a valid id");

    const { tracker: onboardingDoc, refreshCookie } =
      await requireOnboardingSession(id);

    // Step 2: Fetch pre-qualifications form using linked ID
    const preQualId = onboardingDoc.forms?.preQualification;
    let preQualDoc = null;
    if (preQualId) {
      preQualDoc = await PreQualifications.findById(preQualId);
    }

    const res = successResponse(200, "PreQualifications data retrieved", {
      onboardingContext: buildTrackerContext(
        onboardingDoc,
        EStepPath.PRE_QUALIFICATIONS
      ),
      preQualifications: preQualDoc?.toObject() ?? {},
    });

    return attachCookies(res, refreshCookie);
  } catch (error) {
    return errorResponse(error);
  }
};
