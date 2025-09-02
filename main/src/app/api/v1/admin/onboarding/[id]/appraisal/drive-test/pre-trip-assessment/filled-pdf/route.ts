// app/api/v1/admin/onboarding/[id]/appraisal/drive-test/pre-trip-assessment/filled-pdf/route.ts
import { NextRequest, NextResponse } from "next/server";
import path from "path";
import { readFile } from "fs/promises";
import { isValidObjectId } from "mongoose";
import { PDFDocument } from "pdf-lib";

import connectDB from "@/lib/utils/connectDB";
import { errorResponse } from "@/lib/utils/apiResponse";
import OnboardingTracker from "@/mongoose/models/OnboardingTracker";
import DriveTest from "@/mongoose/models/DriveTest";
import ApplicationForm from "@/mongoose/models/ApplicationForm";
import { EStepPath } from "@/types/onboardingTracker.types";
import { hasCompletedStep } from "@/lib/utils/onboardingUtils";

import { buildPreTripFillablePayload, applyPreTripPayloadToForm } from "@/lib/pdf/drive-test/mappers/pre-trip.mapper";
import { drawPdfImage } from "@/lib/pdf/utils/drawPdfImage";
import { loadImageBytesFromPhoto } from "@/lib/utils/s3Upload";

import { EPreTripFillableFormFields as F } from "@/lib/pdf/drive-test/mappers/pre-trip.types";
import type { IDriveTest } from "@/types/driveTest.types";

/**
 * GET /admin/onboarding/:id/appraisal/drive-test/pre-trip-assessment/filled-pdf
 * - Admin endpoint that returns a FILLED Pre-Trip PDF for the given onboarding tracker.
 * - For TESTING:
 *   - Applies real data (driver name/license, preTrip fields)
 *   - Then checks ALL checkboxes to visually confirm alignment
 *   - Draws examiner + driver signatures if available (first page)
 *   - Flattens the form and streams PDF
 */
export const GET = async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  try {
    await connectDB();

    const { id: onboardingId } = await params;
    if (!isValidObjectId(onboardingId)) return errorResponse(400, "Not a valid onboarding tracker ID");

    const onboardingDoc = await OnboardingTracker.findById(onboardingId);
    if (!onboardingDoc || onboardingDoc.terminated) return errorResponse(404, "Onboarding document not found");

    if (!hasCompletedStep(onboardingDoc, EStepPath.DRIVE_TEST)) {
      return errorResponse(403, "driver hasn't reached this step yet");
    }

    // Load Drive Test
    const driveTestId = onboardingDoc.forms?.driveTest;
    let driveTestDoc: IDriveTest | null = null;
    if (driveTestId && isValidObjectId(driveTestId)) {
      driveTestDoc = await DriveTest.findById(driveTestId).lean();
    }
    if (!driveTestDoc?.preTrip) return errorResponse(404, "pre-trip assessment not found");
    const preTripCompleted = !!driveTestDoc.preTrip?.overallAssessment;
    if (!preTripCompleted) return errorResponse(400, "pre trip assessment not completed yet");

    // Load Driver details from ApplicationForm (page1)
    const appFormId = onboardingDoc.forms?.driverApplication;
    let driverName: string | undefined;
    let driverLicense: string | undefined;

    if (appFormId && isValidObjectId(appFormId)) {
      const appForm = await ApplicationForm.findById(appFormId).select("page1.firstName page1.lastName page1.licenses").lean();

      if (appForm?.page1) {
        const first = (appForm.page1 as any).firstName?.toString().trim() || "";
        const last = (appForm.page1 as any).lastName?.toString().trim() || "";
        driverName = [first, last].filter(Boolean).join(" ") || undefined;

        const licenses = (appForm.page1 as any).licenses as Array<{ licenseNumber?: string }> | undefined;
        driverLicense = licenses && licenses.length > 0 ? licenses[0]?.licenseNumber : undefined;
      }
    }

    if (!driverName || !driverLicense) return errorResponse(400, "driver information missing");

    // Load the fillable template
    const pdfPath = path.join(process.cwd(), "src/lib/pdf/drive-test/templates/pre-trip-assessment-fillable.pdf");

    const pdfBytes = await readFile(pdfPath);
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const form = pdfDoc.getForm();
    const page = pdfDoc.getPages()[0]; // single-page template

    // Build+apply payload from mapper (real data)
    const payload = buildPreTripFillablePayload({
      preTrip: driveTestDoc.preTrip,
      driverName,
      driverLicense,
      examinerName: driveTestDoc.preTrip.supervisorName,
      powerUnitType: driveTestDoc.powerUnitType,
      trailerType: driveTestDoc.trailerType,
      // examinerDate / driverDate optional; default to assessedAt in mapper
    });

    applyPreTripPayloadToForm(form, payload);

    // --- TEST MODE: check ALL checkboxes to visually verify positions ---
    try {
      const fields = form.getFields();
      for (const field of fields) {
        const name = field.getName();
        try {
          const cb = form.getCheckBox(name);
          cb.check();
          if (typeof (cb as any).updateAppearances === "function") (cb as any).updateAppearances();
        } catch {
          // not a checkbox — skip
        }
      }
    } catch {
      // don't fail if test-pass check-all step has issues
    }

    // Draw signatures if available (both lines for testing)
    try {
      if (driveTestDoc.preTrip.supervisorSignature) {
        const sigBytes = await loadImageBytesFromPhoto(driveTestDoc.preTrip.supervisorSignature);

        // Examiner signature
        try {
          await drawPdfImage({
            pdfDoc,
            form,
            page,
            fieldName: F.EXAMINER_SIGNATURE,
            imageBytes: sigBytes,
            width: 120,
            height: 40,
            yOffset: 0,
          });
        } catch {
          // field not present — ignore
        }

        // Driver signature (for testing we draw same image if field exists)
        try {
          await drawPdfImage({
            pdfDoc,
            form,
            page,
            fieldName: F.DRIVER_SIGNATURE,
            imageBytes: sigBytes,
            width: 120,
            height: 40,
            yOffset: 0,
          });
        } catch {
          // field not present — ignore
        }
      }
    } catch {
      // signature load/draw failing shouldn't kill the test PDF
    }

    // Flatten & return
    form.flatten();

    const out = await pdfDoc.save(); // Uint8Array
    // Convert to a standalone ArrayBuffer for BodyInit
    const arrayBuffer = out.buffer.slice(out.byteOffset, out.byteOffset + out.byteLength) as ArrayBuffer;

    return new NextResponse(arrayBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'inline; filename="pretrip-filled.pdf"',
      },
    });
  } catch (error) {
    console.error(error);
    return errorResponse(error);
  }
};
