// src/app/api/v1/admin/onboarding/[id]/prequalifications/route.ts
import { successResponse, errorResponse } from "@/lib/utils/apiResponse";
import PreQualifications from "@/mongoose/models/Prequalifications";
import OnboardingTracker from "@/mongoose/models/OnboardingTracker";
import connectDB from "@/lib/utils/connectDB";
import {
  buildTrackerContext,
  isInvitationApproved,
} from "@/lib/utils/onboardingUtils";
import { isValidObjectId } from "mongoose";
import { NextRequest } from "next/server";
import { guard } from "@/lib/utils/auth/authUtils";
import { parseJsonBody } from "@/lib/utils/reqParser";
import {
  EDriverType,
  EHaulPreference,
  ETeamStatus,
  IPreQualifications,
} from "@/types/preQualifications.types";
import { needsFlatbedTraining } from "@/constants/companies";

export const GET = async (
  _: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  try {
    await connectDB();
    await guard();

    const { id } = await params;
    if (!isValidObjectId(id)) return errorResponse(400, "not a valid id");

    // Step 1: Find onboarding tracker
    const onboardingDoc = await OnboardingTracker.findById(id);
    if (!onboardingDoc)
      return errorResponse(404, "Onboarding document not found");
    if (!isInvitationApproved(onboardingDoc))
      return errorResponse(
        400,
        "driver not yet approved for onboarding process"
      );

    // Step 2: Fetch pre-qualifications form using linked ID
    const preQualId = onboardingDoc.forms?.preQualification;
    let preQualDoc = null;
    if (preQualId) {
      preQualDoc = await PreQualifications.findById(preQualId);
    }

    if (!preQualDoc)
      return errorResponse(404, "prequalifications document not found");

    return successResponse(200, "PreQualifications data retrieved", {
      onboardingContext: buildTrackerContext(onboardingDoc, null, true),
      preQualifications: preQualDoc.toObject(),
    });
  } catch (error) {
    return errorResponse(error);
  }
};

/**
 * Narrowed type for allowed PATCH fields
 */
type PatchPayload = Pick<
  IPreQualifications,
  | "canDriveManual"
  | "faultAccidentIn3Years"
  | "zeroPointsOnAbstract"
  | "noUnpardonedCriminalRecord"
  | "driverType"
  | "haulPreference"
  | "teamStatus"
  | "flatbedExperience"
>;

// list of allowed fields
const ALLOWED_KEYS = [
  "canDriveManual",
  "faultAccidentIn3Years",
  "zeroPointsOnAbstract",
  "noUnpardonedCriminalRecord",
  "driverType",
  "haulPreference",
  "teamStatus",
  "flatbedExperience",
] as const satisfies readonly (keyof PatchPayload)[];

type AllowedKey = (typeof ALLOWED_KEYS)[number];
const allowedSet = new Set<AllowedKey>(ALLOWED_KEYS);

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await ctx.params;

    await connectDB();
    await guard();

    if (!isValidObjectId(id)) return errorResponse(400, "not a valid id");

    // Find onboarding tracker (must exist, approved, and not terminated)
    const onboardingDoc = await OnboardingTracker.findById(id);
    if (!onboardingDoc)
      return errorResponse(404, "Onboarding document not found");
    if (!isInvitationApproved(onboardingDoc)) {
      return errorResponse(
        400,
        "driver not yet approved for onboarding process"
      );
    }
    if (onboardingDoc.terminated) {
      return errorResponse(400, "Onboarding document terminated");
    }
    if (!onboardingDoc.companyId) {
      return errorResponse(400, "companyId missing in onboarding document");
    }

    // Find linked pre-qualifications document
    const preQualId = onboardingDoc.forms?.preQualification;
    if (!preQualId)
      return errorResponse(404, "prequalifications document not found");

    const preQualDoc = await PreQualifications.findById(preQualId);
    if (!preQualDoc)
      return errorResponse(404, "prequalifications document not found");

    const body = await parseJsonBody(req);
    if (!body || typeof body !== "object")
      return errorResponse(400, "invalid payload");

    // Runtime reject any keys not in allow-list
    const invalidKeys = (Object.keys(body) as string[]).filter(
      (k) => !allowedSet.has(k as AllowedKey)
    );
    if (invalidKeys.length) {
      return errorResponse(
        400,
        `invalid fields in payload: ${invalidKeys.join(", ")}`
      );
    }

    // Properly typed payload for the allowed fields
    const payload = body as Partial<PatchPayload>;

    // Validate enum fields, if present (payload.* typed to specific enum or boolean now)
    if (
      payload.driverType !== undefined &&
      !Object.values(EDriverType).includes(payload.driverType)
    ) {
      return errorResponse(400, "invalid value for driverType");
    }
    if (
      payload.haulPreference !== undefined &&
      !Object.values(EHaulPreference).includes(payload.haulPreference)
    ) {
      return errorResponse(400, "invalid value for haulPreference");
    }
    if (
      payload.teamStatus !== undefined &&
      !Object.values(ETeamStatus).includes(payload.teamStatus)
    ) {
      return errorResponse(400, "invalid value for teamStatus");
    }

    // Apply updates by iterating only the typed allow-list
    for (const key of ALLOWED_KEYS) {
      if (key in payload) {
        (preQualDoc as any)[key] = payload[key] as any;
      }
    }

    await preQualDoc.save();

    // Recalculate flatbed training need (only consequence)
    const flatbedExperience = !!preQualDoc.flatbedExperience;
    onboardingDoc.needsFlatbedTraining = needsFlatbedTraining(
      onboardingDoc.companyId,
      onboardingDoc.applicationType,
      flatbedExperience
    );

    await onboardingDoc.save();

    return successResponse(200, "PreQualifications updated", {
      onboardingContext: buildTrackerContext(onboardingDoc, null, true),
      preQualifications: preQualDoc.toObject(),
    });
  } catch (err: any) {
    return errorResponse(err);
  }
}
