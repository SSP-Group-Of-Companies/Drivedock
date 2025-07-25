import { encryptString, hashString } from '@/lib/utils/cryptoUtils';
import { successResponse, errorResponse } from '@/lib/utils/apiResponse';
import connectDB from '@/lib/utils/connectDB';
import ApplicationForm from '@/mongoose/models/applicationForm';
import OnboardingTracker from '@/mongoose/models/OnboardingTracker';
import PreQualifications from '@/mongoose/models/Prequalifications';
import { FORM_RESUME_EXPIRES_AT_IN_MILSEC } from '@/config/env';

export const POST = async (req: Request) => {
  try {
    await connectDB();

    const body = await req.json();
    const { prequalifications, applicationFormPage1 } = body;

    const sin = applicationFormPage1?.sin;

    if (!sin || typeof sin !== 'string' || sin.length !== 9) {
      return errorResponse(400, 'Invalid SIN');
    }

    const sinHash = hashString(sin);
    const existingTracker = await OnboardingTracker.findOne({ sinHash });
    if (existingTracker) {
      return errorResponse(400, 'Application with this SIN already exists.');
    }

    // ✅ Encrypt SIN and prepare applicationFormPage1
    const encryptedSin = encryptString(sin);
    const page1 = {
      ...applicationFormPage1,
      sinEncrypted: encryptedSin,
    };
    delete page1.sin;

    // ✅ Create forms
    // const preQualDoc = await PreQualifications.create({
    //   ...prequalifications,
    //   completed: true,
    // });

    const appFormDoc = await ApplicationForm.create({
      page1,
      currentStep: 1,
      completedStep: 1,
      completed: false,
    });

    // const onboardingDoc = await OnboardingTracker.create({
    //   sin, // The schema handles hashing/encryption here
    //   resumeExpiresAt: new Date(Date.now() + Number(FORM_RESUME_EXPIRES_AT_IN_MILSEC)),
    //   status: {
    //     currentStep: 2,
    //     completedStep: 1,
    //     completed: false,
    //   },
    //   forms: {
    //     // preQualification: preQualDoc._id,
    //     driverApplication: appFormDoc._id,
    //   },
    // });

    return successResponse(200, 'Onboarding created successfully', {
      // preQualifications: preQualDoc.toObject(),
      applicationForm: appFormDoc.toObject({ virtuals: true }),
      // onboardingTracker: onboardingDoc.toObject({ virtuals: true }),
    });
  } catch (error) {
    return errorResponse(500, error instanceof Error ? error.message : String(error));
  }
};
