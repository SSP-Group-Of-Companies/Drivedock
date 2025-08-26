// app/api/v1/admin/onboarding/[id]/restore/route.ts
import { NextRequest } from "next/server";
import connectDB from "@/lib/utils/connectDB";
import { successResponse, errorResponse } from "@/lib/utils/apiResponse";
import OnboardingTracker from "@/mongoose/models/OnboardingTracker";
import { parseJsonBody } from "@/lib/utils/reqParser";
import { getCompanyById, needsFlatbedTraining } from "@/constants/companies";
import { buildTrackerContext, nextResumeExpiry } from "@/lib/utils/onboardingUtils";
import { readMongooseRefField } from "@/lib/utils/mongooseRef";
import { IPreQualificationsDoc } from "@/types/preQualifications.types";

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    await connectDB();

    const onboardingDoc = await OnboardingTracker.findById(id).populate("forms.preQualification");
    if (!onboardingDoc) return errorResponse(404, "Onboarding document not found");
    if (onboardingDoc.terminated) return errorResponse(400, "Onboarding document terminated");

    const { companyId } = await parseJsonBody(req);
    if (!companyId) return errorResponse(400, "companyId is required");

    const validCompany = getCompanyById(companyId);
    if (!validCompany) return errorResponse(400, "invalid company id");

    const preQualification = readMongooseRefField<IPreQualificationsDoc>(onboardingDoc.forms?.preQualification);
    const flatbedExperience = preQualification?.flatbedExperience ?? false;
    onboardingDoc.companyId = companyId;
    onboardingDoc.resumeExpiresAt = nextResumeExpiry();
    onboardingDoc.needsFlatbedTraining = needsFlatbedTraining(companyId, onboardingDoc.applicationType, flatbedExperience);

    await onboardingDoc.save();

    return successResponse(200, "company updated", {
      onboardingContext: buildTrackerContext(onboardingDoc, null, true),
    });
  } catch (err: any) {
    return errorResponse(err);
  }
}
