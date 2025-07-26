import { encryptString, hashString } from "@/lib/utils/cryptoUtils";
import { successResponse, errorResponse } from "@/lib/utils/apiResponse";
import connectDB from "@/lib/utils/connectDB";
import ApplicationForm from "@/mongoose/models/applicationForm";
import OnboardingTracker from "@/mongoose/models/OnboardingTracker";
import PreQualifications from "@/mongoose/models/Prequalifications";
import { FORM_RESUME_EXPIRES_AT_IN_MILSEC } from "@/config/env";

export const POST = async (req: Request) => {
  try {
    // Establish database connection
    await connectDB();

    // Parse incoming request body
    const body = await req.json();
    const { prequalifications, applicationFormPage1 } = body;

    // Extract and validate SIN
    const sin = applicationFormPage1?.sin;
    if (!sin || typeof sin !== "string" || sin.length !== 9) {
      return errorResponse(400, "Invalid SIN");
    }

    // Check for existing onboarding session using hashed SIN
    const sinHash = hashString(sin);
    const existingTracker = await OnboardingTracker.findOne({ sinHash });
    if (existingTracker) {
      return errorResponse(400, "Application with this SIN already exists.");
    }

    // Prepare Page 1 of the application form, encrypt SIN
    const page1 = {
      ...applicationFormPage1,
      sinEncrypted: encryptString(sin),
    };
    delete page1.sin;

    // Create and save the ApplicationForm document
    const appFormDoc = new ApplicationForm({
      page1,
      currentStep: 2,
      completedStep: 1,
      completed: false,
    });
    await appFormDoc.save();

    // Create and save the PreQualifications document
    const preQualDoc = await PreQualifications.create({
      ...prequalifications,
      completed: true,
    });

    // Create and save the OnboardingTracker document
    const onboardingDoc = await OnboardingTracker.create({
      sinHash: hashString(sin),
      sinEncrypted: encryptString(sin),
      resumeExpiresAt: new Date(
        Date.now() + Number(FORM_RESUME_EXPIRES_AT_IN_MILSEC)
      ),
      status: {
        currentStep: 1,
        completedStep: 1,
        completed: false,
      },
      forms: {
        preQualification: preQualDoc._id,
        driverApplication: appFormDoc._id,
      },
    });

    // Respond with created documents
    return successResponse(200, "Onboarding created successfully", {
      preQualifications: preQualDoc.toObject(),
      applicationForm: appFormDoc.toObject({ virtuals: true }),
      onboardingTracker: onboardingDoc.toObject({ virtuals: true }),
    });
  } catch (error) {
    // Handle unexpected errors
    return errorResponse(
      500,
      error instanceof Error ? error.message : String(error)
    );
  }
};
