import { NextRequest } from "next/server";
import { isValidObjectId } from "mongoose";

import connectDB from "@/lib/utils/connectDB";
import OnboardingTracker from "@/mongoose/models/OnboardingTracker";
import ApplicationForm from "@/mongoose/models/ApplicationForm";
import { successResponse, errorResponse } from "@/lib/utils/apiResponse";
import {
  buildTrackerContext,
  nextResumeExpiry,
} from "@/lib/utils/onboardingUtils";
import { readMongooseRefField } from "@/lib/utils/mongooseRef";

/**
 * GET /api/v1/admin/onboarding/[id]/safety-processing
 * Returns:
 *  - onboardingContext (now enriched with itemSummary: { driverName, driverEmail })
 *  - driveTest / carriersEdge / drugTest (as before)
 *  - identifications: { driverLicenseExpiration }   <-- NEW (for notifications)
 */
export const GET = async (
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  try {
    await connectDB();

    const { id: onboardingId } = await params;
    if (!isValidObjectId(onboardingId)) {
      return errorResponse(400, "Not a valid onboarding tracker ID");
    }

    const onboardingDoc = await OnboardingTracker.findById(onboardingId);
    if (!onboardingDoc)
      return errorResponse(404, "Onboarding document not found");
    if (onboardingDoc.terminated)
      return errorResponse(400, "Onboarding document terminated");

    // Existing form snapshots
    const drugTest = readMongooseRefField(onboardingDoc.forms?.drugTest) ?? {};
    const carriersEdge =
      readMongooseRefField(onboardingDoc.forms?.carriersEdgeTraining) ?? {};
    const driveTest =
      readMongooseRefField(onboardingDoc.forms?.driveTest) ?? {};

    // --- Resolve driver name/email + license expiry (index 0) from ApplicationForm ---
    let driverName: string | undefined;
    let driverEmail: string | undefined;
    let driverLicenseExpiration: Date | undefined;

    const driverAppRef: any = onboardingDoc.forms?.driverApplication;

    const tryExtractFromDoc = (doc: any) => {
      const fn = doc?.page1?.firstName ?? "";
      const ln = doc?.page1?.lastName ?? "";
      const nm = `${fn} ${ln}`.trim();
      driverName = nm || undefined;
      driverEmail = doc?.page1?.email ?? undefined;

      // licenses can be either at page1.licenses[] or (rarely) root.licenses[]
      const licensesArr =
        (Array.isArray(doc?.page1?.licenses)
          ? doc.page1.licenses
          : undefined) ??
        (Array.isArray(doc?.licenses) ? doc.licenses : undefined);

      const first = Array.isArray(licensesArr) ? licensesArr[0] : undefined;
      const lic = first?.licenseExpiry;
      if (lic) {
        const d = new Date(lic);
        if (!Number.isNaN(d.getTime())) driverLicenseExpiration = d;
      }
    };

    if (driverAppRef?._id && typeof driverAppRef === 'object' && !driverAppRef.page1) {
      // This is an ObjectId reference, not a populated document
      const driverAppId = driverAppRef.toString();
      
      if (driverAppId && isValidObjectId(driverAppId)) {
        const appDoc = await ApplicationForm.findById(driverAppId, {
          "page1.firstName": 1,
          "page1.lastName": 1,
          "page1.email": 1,
          "page1.licenses": 1,
          licenses: 1,
        }).lean();
        
        if (appDoc) tryExtractFromDoc(appDoc);
      }
    } else if (driverAppRef?.page1) {
      // This is already a populated document
      tryExtractFromDoc(driverAppRef);
    } else {
      // No driverAppRef at all, try fallback
      
      // Fallback: try to find any ApplicationForm associated with this onboarding tracker
      const fallbackAppDoc = await ApplicationForm.findOne(
        { onboardingTrackerId: onboardingId },
        {
          "page1.firstName": 1,
          "page1.lastName": 1,
          "page1.email": 1,
          "page1.licenses": 1,
          licenses: 1,
        }
      ).lean();
      
      if (fallbackAppDoc) tryExtractFromDoc(fallbackAppDoc);
    }

    // Base context
    const onboardingContext = buildTrackerContext(onboardingDoc, null, true);

    // Enrich with itemSummary
    const enrichedContext = {
      ...onboardingContext,
      itemSummary: {
        ...(onboardingContext as any).itemSummary,
        ...(driverName || driverEmail
          ? { driverName, driverEmail }
          : undefined),
      },
    };

    // identifications block (license expiry for notifications)
    const identifications =
      driverLicenseExpiration != null ? { driverLicenseExpiration } : undefined;

    const responseData = {
      onboardingContext: enrichedContext,
      drugTest,
      carriersEdge,
      driveTest,
      identifications, // <-- NEW (optional if not found)
      resumeExpiresAt: nextResumeExpiry(),
    };

    return successResponse(200, "Onboarding test data retrieved", responseData);
  } catch (error) {
    return errorResponse(error);
  }
};
