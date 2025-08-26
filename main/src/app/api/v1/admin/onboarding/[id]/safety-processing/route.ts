// src/app/api/v1/onboarding/[id]/drug-test/route.ts
import { NextRequest } from "next/server";
import { isValidObjectId } from "mongoose";

import { errorResponse, successResponse } from "@/lib/utils/apiResponse";
import connectDB from "@/lib/utils/connectDB";
import OnboardingTracker from "@/mongoose/models/OnboardingTracker";
import DrugTest from "@/mongoose/models/DrugTest";
import CarriersEdgeTraining from "@/mongoose/models/CarriersEdgeTraining";
import DriveTest from "@/mongoose/models/DriveTest";
import { buildTrackerContext, hasReachedStep, nextResumeExpiry, onboardingExpired } from "@/lib/utils/onboardingUtils";
import { EStepPath } from "@/types/onboardingTracker.types";
import { resolveMongooseRef } from "@/lib/utils/mongooseRef";

export const GET = async (_: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  try {
    await connectDB();

    const { id: onboardingId } = await params;
    if (!isValidObjectId(onboardingId)) return errorResponse(400, "Not a valid onboarding tracker ID");

    const onboardingDoc = await OnboardingTracker.findById(onboardingId);
    if (!onboardingDoc) return errorResponse(404, "Onboarding document not found");
    if (onboardingDoc.terminated) return errorResponse(400, "Onboarding document terminated");

    // Resolve the three referenced forms whether populated or not (lean objects).
    const [drugTestDoc, carriersEdgeDoc, driveTestDoc] = await Promise.all([
      resolveMongooseRef(DrugTest, onboardingDoc.forms?.drugTest as any, true),
      resolveMongooseRef(CarriersEdgeTraining, onboardingDoc.forms?.carriersEdgeTraining as any, true),
      resolveMongooseRef(DriveTest, onboardingDoc.forms?.driveTest as any, true),
    ]);

    return successResponse(200, "Onboarding test data retrieved", {
      onboardingContext: buildTrackerContext(onboardingDoc),
      drugTest: drugTestDoc ?? null,
      carriersEdge: carriersEdgeDoc ?? null,
      driveTest: driveTestDoc ?? null,
      resumeExpiresAt: nextResumeExpiry(), // optional: handy for client to refresh timers
    });
  } catch (error) {
    return errorResponse(error);
  }
};
