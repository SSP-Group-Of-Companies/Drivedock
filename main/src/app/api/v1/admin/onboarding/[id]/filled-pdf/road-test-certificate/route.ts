// src/app/api/v1/admin/onboarding/[id]/filled-pdf/road-test-certificate/route.ts
import { NextRequest, NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import { isValidObjectId } from "mongoose";
import { PDFDocument } from "pdf-lib";

import connectDB from "@/lib/utils/connectDB";
import { guard } from "@/lib/auth/authUtils";
import { errorResponse } from "@/lib/utils/apiResponse";

import OnboardingTracker from "@/mongoose/models/OnboardingTracker";
import ApplicationForm from "@/mongoose/models/ApplicationForm";
import DriveTest from "@/mongoose/models/DriveTest";

import { buildRoadTestCertificatePayload, applyRoadTestCertificatePayloadToForm, resolveRoadTestCertificateTemplate } from "@/lib/pdf/road-test-certificate/mappers/road-test-certificate.mapper";
import { ERoadTestCertificateFillableFormFields as F } from "@/lib/pdf/road-test-certificate/mappers/road-test-certificate.types";

import { drawPdfImage } from "@/lib/pdf/utils/drawPdfImage";
import { loadImageBytesFromAsset } from "@/lib/utils/s3Upload";
import { ECompanyId } from "@/constants/companies";

export const GET = async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  try {
    await connectDB();
    await guard();

    const { id: onboardingId } = await params;
    if (!isValidObjectId(onboardingId)) return errorResponse(400, "Not a valid onboarding tracker ID");

    // Load onboarding (NOT lean → to access virtuals like .sin if needed)
    const onboarding = await OnboardingTracker.findById(onboardingId);
    if (!onboarding) return errorResponse(404, "Onboarding document not found");

    // Must be completed
    if (!onboarding.status?.completed) return errorResponse(400, "Onboarding is not yet completed");

    const companyId = onboarding.companyId as ECompanyId | undefined;
    if (!companyId || !Object.values(ECompanyId).includes(companyId)) return errorResponse(400, "invalid company ID");

    // Resolve referenced forms
    const appFormId = onboarding.forms?.driverApplication;
    const driveTestId = onboarding.forms?.driveTest;

    if (!appFormId || !isValidObjectId(appFormId)) return errorResponse(404, "Driver application not found");
    if (!driveTestId || !isValidObjectId(driveTestId)) return errorResponse(404, "Drive test document not found");

    // Application form (names + license)
    const application = await ApplicationForm.findById(appFormId).select("page1.firstName page1.lastName page1.licenses").lean();

    const first = (application as any)?.page1?.firstName?.toString().trim();
    const last = (application as any)?.page1?.lastName?.toString().trim();
    if (!first || !last) return errorResponse(400, "Applicant name missing in Application Form");

    const licenses = ((application as any)?.page1?.licenses ?? []) as Array<{ licenseNumber?: string; licenseStateOrProvince?: string }>;
    const primaryLic = licenses[0] || {};
    const cdlNumber = primaryLic.licenseNumber || "";
    const cdlStateProvince = primaryLic.licenseStateOrProvince || "";

    // Drive test (on-road, dates, distance, equipment, examiner sig)
    const driveTest = await DriveTest.findById(driveTestId).lean();
    if (!driveTest) return errorResponse(404, "Drive test document not found");
    if (!driveTest?.completed) return errorResponse(400, "Drive test is not yet completed");
    if (!driveTest?.onRoad) return errorResponse(404, "On-road assessment not found");
    if (!driveTest.onRoad.overallAssessment) return errorResponse(400, "On-road assessment not yet completed");

    const assessedAt = (driveTest.onRoad as any).assessedAt as Date | undefined;
    const milesKmsDriven = (driveTest.onRoad as any).milesKmsDriven as number | undefined;
    const powerUnitType = (driveTest as any).powerUnitType as string | undefined;
    const trailerType = (driveTest as any).trailerType as string | undefined;

    // Build payload
    const driverName = [first, last].filter(Boolean).join(" ");
    const payload = buildRoadTestCertificatePayload({
      driverName,
      // prefer onboarding.sin virtual if available
      sin: (onboarding as any)?.sin || undefined,
      cdlNumber,
      cdlStateProvince,
      powerUnitType,
      trailerType,
      assessedAt,
      milesKmsDriven,
      examinerDate: assessedAt,
    });

    // Load template (default SSP-CA version for now)
    const pdfPath = resolveRoadTestCertificateTemplate(companyId);
    if (!pdfPath) {
      return errorResponse(400, "Road Test Certificate template not found for this company");
    }
    const pdfBytes = await readFile(pdfPath);
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const form = pdfDoc.getForm();
    const page = pdfDoc.getPages()[0];

    // Apply text payload
    applyRoadTestCertificatePayloadToForm(form, payload);

    // Draw examiner signature from onRoad.supervisorSignature
    try {
      const sigPhoto = (driveTest.onRoad as any).supervisorSignature;
      if (sigPhoto) {
        const bytes = await loadImageBytesFromAsset(sigPhoto);
        await drawPdfImage({
          pdfDoc,
          form,
          page,
          fieldName: F.EXAMINER_SIGNATURE,
          imageBytes: bytes,
          width: 120,
          height: 35,
          yOffset: 0,
        });
      }
    } catch (e) {
      console.warn("Examiner signature draw failed:", e);
    }

    // Finalize
    form.flatten();

    const out = await pdfDoc.save();
    const arrayBuffer = out.buffer.slice(out.byteOffset, out.byteOffset + out.byteLength) as ArrayBuffer;

    return new NextResponse(arrayBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'inline; filename="road-test-certificate.pdf"',
      },
    });
  } catch (err) {
    console.error(err);
    return errorResponse(err);
  }
};
