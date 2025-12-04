// api/v1/admin/onboarding/[id]/filled-pdf/prequalifications/route.ts
import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs/promises";
import { isValidObjectId } from "mongoose";
import { PDFDocument } from "pdf-lib";

import connectDB from "@/lib/utils/connectDB";
import { guard } from "@/lib/utils/auth/authUtils";
import { errorResponse } from "@/lib/utils/apiResponse";

import OnboardingTracker from "@/mongoose/models/OnboardingTracker";
import ApplicationForm from "@/mongoose/models/ApplicationForm";
import PreQualifications from "@/mongoose/models/Prequalifications";

import { ESafetyAdminId } from "@/constants/safetyAdmins";
import { getSafetyAdminServerById } from "@/lib/assets/safetyAdmins/safetyAdmins.server";

import { EPrequalFillableFields as F } from "@/lib/pdf/prequal/mappers/prequal-fillable.types";
import { buildPrequalPayload, applyPrequalPayloadToForm, resolvePrequalTemplate } from "@/lib/pdf/prequal/mappers/prequal-fillable.mapper";

import { drawPdfImage } from "@/lib/pdf/utils/drawPdfImage";
import { hasCompletedStep, isInvitationApproved } from "@/lib/utils/onboardingUtils";
import { EStepPath } from "@/types/onboardingTracker.types";

/* --------------------------------- GET -------------------------------- */

export const GET = async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  try {
    await connectDB();
    await guard();

    const { id: onboardingId } = await params;
    if (!isValidObjectId(onboardingId)) {
      return errorResponse(400, "Not a valid onboarding tracker ID");
    }

    // safety admin (for approval signatures)
    const safetyAdminId = req.nextUrl.searchParams.get("safetyAdminId") as ESafetyAdminId | null;
    if (!safetyAdminId) return errorResponse(400, "safetyAdminId is required");
    if (!Object.values(ESafetyAdminId).includes(safetyAdminId)) {
      return errorResponse(400, "Invalid safetyAdminId");
    }
    const safetyAdmin = getSafetyAdminServerById(safetyAdminId);
    if (!safetyAdmin) return errorResponse(400, "Safety admin not found");

    // tracker
    const tracker = await OnboardingTracker.findById(onboardingId).lean();
    if (!tracker) return errorResponse(404, "Onboarding document not found");
    if (!isInvitationApproved(tracker)) return errorResponse(400, "driver not yet approved for onboarding process");
    if (!hasCompletedStep(tracker, EStepPath.APPLICATION_PAGE_1)) return errorResponse(400, `Step ${EStepPath.APPLICATION_PAGE_1} not yet completed`);
    if (!tracker.companyId) return errorResponse(400, "Company ID missing in tracker");

    // page1 (name + phone)
    const appId = tracker.forms?.driverApplication;
    if (!appId || !isValidObjectId(appId)) {
      return errorResponse(404, "Driver application missing");
    }
    const application = await ApplicationForm.findById(appId).select("page1.firstName page1.lastName page1.phoneCell page1.phoneHome").lean();
    const page1 = application?.page1;
    if (!page1) return errorResponse(404, "Application form Page 1 not found");

    // prequalifications
    const preqId = tracker.forms?.preQualification;
    if (!preqId || !isValidObjectId(preqId)) {
      return errorResponse(404, "Pre-Qualifications missing");
    }
    const preqDoc = await PreQualifications.findById(preqId).lean();
    if (!preqDoc) return errorResponse(404, "Pre-Qualifications not found");

    // build payload
    const payload = buildPrequalPayload({
      tracker: {
        createdAt: tracker.createdAt,
        status: tracker.status,
        terminated: tracker.terminated,
      } as any,
      page1: {
        firstName: page1.firstName,
        lastName: page1.lastName,
        phoneCell: page1.phoneCell,
        phoneHome: page1.phoneHome,
      },
      preq: preqDoc as any,
      safetyAdminName: safetyAdmin.name,
    });

    // load template (1-page PDF)
    const pdfPath = resolvePrequalTemplate(tracker.companyId);
    const pdfBytes = await fs.readFile(pdfPath);
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const form = pdfDoc.getForm();
    const [page] = pdfDoc.getPages();

    // apply text/checkbox fields
    applyPrequalPayloadToForm(form, payload);

    // signatures (both on page 1):
    const sigBytes = await fs.readFile(safetyAdmin.signatureAbsPath);
    const sigUint8 = new Uint8Array(sigBytes);

    // "By" signature (ALWAYS)
    try {
      await drawPdfImage({
        pdfDoc,
        form,
        page,
        fieldName: F.BY_SIGNATURE,
        imageBytes: sigUint8,
        width: 78,
        height: 20,
        yOffset: 0,
      });
    } catch (e) {
      console.warn("By signature draw failed:", e);
    }

    // "Approved By" signature (ONLY if approved)
    const approved = !!payload[F.APPROVED_TO_JOIN_YES];
    if (approved) {
      try {
        await drawPdfImage({
          pdfDoc,
          form,
          page,
          fieldName: F.APPROVED_BY_SIGNATURE,
          imageBytes: sigUint8,
          width: 78,
          height: 20,
          yOffset: 0,
        });
      } catch (e) {
        console.warn("Approved By signature draw failed:", e);
      }
    }

    // finalize
    form.flatten();
    const out = await pdfDoc.save();
    const arrayBuffer = out.buffer.slice(out.byteOffset, out.byteOffset + out.byteLength) as ArrayBuffer;

    return new NextResponse(arrayBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'inline; filename="prequalifications-filled.pdf"',
      },
    });
  } catch (err) {
    console.error("prequalifications/filled-pdf error:", err);
    return errorResponse(err);
  }
};
