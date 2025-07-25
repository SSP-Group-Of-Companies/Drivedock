import { successResponse, errorResponse } from '@/lib/utils/apiResponse';
import PreQualifications from '@/mongoose/models/Prequalifications';
import OnboardingTracker from '@/mongoose/models/OnboardingTracker';
import connectDB from '@/lib/utils/connectDB';
import { FORM_RESUME_EXPIRES_AT_IN_MILSEC } from '@/config/env';
import { hashString } from '@/lib/utils/cryptoUtils';

export const PATCH = async (req: Request, { params }: { params: Promise<{ sin: string }> }) => {
  try {
    await connectDB();

    const { sin } = await params;

    if (!sin || sin.length !== 9) {
      return errorResponse(400, 'Invalid SIN');
    }

    const sinHash = hashString(sin);
    const body = await req.json();
    const prequalUpdates = body;

    // Step 1: Find onboarding tracker by sinHash
    const onboardingDoc = await OnboardingTracker.findOne({ sinHash });
    if (!onboardingDoc) {
      return errorResponse(404, 'Onboarding tracker not found');
    }

    const preQualId = onboardingDoc.forms?.preQualification;
    if (!preQualId) {
      return errorResponse(404, 'PreQualifications form not linked');
    }

    // Step 2: Update PreQualifications by _id
    const preQualDoc = await PreQualifications.findByIdAndUpdate(
      preQualId,
      { $set: { ...prequalUpdates, completed: true } },
      { new: true }
    );

    if (!preQualDoc) {
      return errorResponse(404, 'PreQualifications not found');
    }

    // Step 3: Update onboarding status and resume expiration
    onboardingDoc.status.currentStep = 1;
    onboardingDoc.resumeExpiresAt = new Date(Date.now() + Number(FORM_RESUME_EXPIRES_AT_IN_MILSEC));
    await onboardingDoc.save();

    return successResponse(200, 'PreQualifications and onboarding tracker updated', {
      preQualifications: preQualDoc,
      onboardingTracker: onboardingDoc,
    });

  } catch (error) {
    return errorResponse(500, error instanceof Error ? error.message : String(error));
  }
};
